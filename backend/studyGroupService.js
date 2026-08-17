const StudyGroup = require('../models/StudyGroup');
const StudyGroupMember = require('../models/StudyGroupMember');
const mongoose = require('mongoose');

/**
 * Creates a new study group and sets the creator as the owner.
 * @param {object} groupData - The data for the new group.
 * @param {string} ownerId - The user ID of the group's owner.
 * @returns {Promise<object>} The newly created study group.
 */
const createGroup = async (groupData, ownerId) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const group = new StudyGroup({ ...groupData, owner: ownerId });
    await group.save({ session });

    const member = new StudyGroupMember({
      groupId: group._id,
      userId: ownerId,
      role: 'OWNER',
      status: 'APPROVED',
    });
    await member.save({ session });

    await session.commitTransaction();
    return group;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

/**
 * Finds a study group by its ID.
 * @param {string} groupId - The ID of the group to find.
 * @returns {Promise<object|null>} The found group or null.
 */
const getGroupById = async (groupId) => {
  return await StudyGroup.findById(groupId).lean();
};

/**
 * Retrieves all public study groups based on filters.
 * @param {object} filters - Query filters (e.g., for search).
 * @returns {Promise<Array>} A list of public study groups.
 */
const getAllPublicGroups = async (filters = {}) => {
  // Add isPublic filter to whatever filters are passed in
  const query = { ...filters, isPublic: true };
  return await StudyGroup.find(query).sort({ createdAt: -1 }).lean();
};

/**
 * Updates a study group's details.
 * @param {string} groupId - The ID of the group to update.
 * @param {object} updateData - The data to update.
 * @returns {Promise<object|null>} The updated group.
 */
const updateGroup = async (groupId, updateData) => {
  return await StudyGroup.findByIdAndUpdate(groupId, updateData, { returnDocument: "after" }).lean();
};

/**
 * Deletes a study group and all its associated data.
 * @param {string} groupId - The ID of the group to delete.
 */
const deleteGroup = async (groupId) => {
  // This can be expanded into a transaction to delete all associated entities
  await StudyGroupMember.deleteMany({ groupId });
  // TODO: Delete discussions, tasks, resources etc. in future phases
  await StudyGroup.findByIdAndDelete(groupId);
};

/**
 * Gathers aggregated data for the group dashboard.
 * @param {string} groupId - The ID of the group.
 * @returns {Promise<object>} An object containing dashboard data.
 */
const getGroupDashboardData = async (groupId) => {
  // These can be run in parallel for better performance
  const [group, announcements, upcomingSession, tasks] = await Promise.all([
    StudyGroup.findById(groupId).lean(),
    require('../models/StudyGroupAnnouncement').find({ groupId }).sort({ createdAt: -1 }).limit(2).populate('authorId', 'name').lean(),
    require('../models/StudyGroupSession').findOne({ groupId, scheduledTime: { $gte: new Date() } }).sort({ scheduledTime: 1 }).lean(),
    require('../models/StudyGroupTask').aggregate([
      { $match: { groupId: new mongoose.Types.ObjectId(groupId) } },
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ])
  ]);

  if (!group) {
    throw new Error('Group not found');
  }

  return { group, announcements, upcomingSession, tasks };
};

module.exports = {
  createGroup,
  getGroupById,
  getAllPublicGroups,
  updateGroup,
  deleteGroup,
  getGroupDashboardData,
};
