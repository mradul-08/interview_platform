const StudyGroup = require('../models/StudyGroup');
const StudyGroupMember = require('../models/StudyGroupMember');

/**
 * Allows a user to request to join a group.
 * Public groups are joined immediately. Private groups create a pending request.
 * @param {string} groupId - The ID of the group to join.
 * @param {string} userId - The ID of the user requesting to join.
 * @returns {Promise<object>} The membership record.
 */
const requestToJoinGroup = async (groupId, userId) => {
  const group = await StudyGroup.findById(groupId);
  if (!group) {
    throw new Error('Group not found');
  }

  const existingMembership = await StudyGroupMember.findOne({ groupId, userId });
  if (existingMembership) {
    if (existingMembership.status === 'APPROVED') throw new Error('You are already a member of this group.');
    if (existingMembership.status === 'PENDING') throw new Error('You already have a pending request to join this group.');
  }

  const status = group.isPublic ? 'APPROVED' : 'PENDING';

  const newMember = new StudyGroupMember({
    groupId,
    userId,
    status,
    role: 'MEMBER',
  });

  await newMember.save();
  return newMember;
};

/**
 * Allows a member to leave a group.
 * @param {string} groupId - The ID of the group to leave.
 * @param {string} userId - The ID of the user leaving.
 */
const leaveGroup = async (groupId, userId) => {
  const membership = await StudyGroupMember.findOne({ groupId, userId });

  if (!membership) {
    throw new Error('You are not a member of this group.');
  }

  if (membership.role === 'OWNER') {
    throw new Error('Owners cannot leave the group. You must delete the group or transfer ownership.');
  }

  await StudyGroupMember.deleteOne({ _id: membership._id });
};

/**
 * Fetches all pending membership requests for a group.
 * @param {string} groupId - The ID of the group.
 * @returns {Promise<Array>} A list of pending membership records.
 */
const getMembershipRequests = async (groupId) => {
  return await StudyGroupMember.find({ groupId, status: 'PENDING' }).populate('userId', 'name email');
};

/**
 * Updates the status of a membership request (approve or reject).
 * @param {string} groupId - The ID of the group.
 * @param {string} targetUserId - The ID of the user whose request is being managed.
 * @param {'APPROVED' | 'REJECTED'} newStatus - The new status.
 * @returns {Promise<object>} The updated membership record.
 */
const updateMembershipStatus = async (groupId, targetUserId, newStatus) => {
  const membership = await StudyGroupMember.findOne({ groupId, userId: targetUserId, status: 'PENDING' });
  if (!membership) {
    throw new Error('Membership request not found.');
  }

  if (newStatus === 'REJECTED') {
    await StudyGroupMember.deleteOne({ _id: membership._id });
    return { message: 'Request rejected.' };
  }

  membership.status = 'APPROVED';
  await membership.save();
  return membership;
};

module.exports = {
  requestToJoinGroup,
  leaveGroup,
  getMembershipRequests,
  updateMembershipStatus,
};