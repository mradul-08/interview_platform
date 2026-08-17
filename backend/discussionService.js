const StudyGroupDiscussion = require('../models/StudyGroupDiscussion');

/**
 * Retrieves all discussions for a specific group.
 * @param {string} groupId - The ID of the group.
 * @returns {Promise<Array>} A list of discussions.
 */
const getDiscussionsByGroup = async (groupId) => {
  return await StudyGroupDiscussion.find({ groupId })
    .populate('authorId', 'name')
    .sort({ createdAt: -1 })
    .lean();
};

/**
 * Creates a new discussion in a group.
 * @param {string} groupId - The ID of the group.
 * @param {string} authorId - The ID of the author.
 * @param {string} title - The title of the discussion.
 * @param {string} content - The content of the discussion.
 * @returns {Promise<object>} The newly created discussion.
 */
const createDiscussion = async (groupId, authorId, title, content) => {
  const discussion = new StudyGroupDiscussion({ groupId, authorId, title, content });
  await discussion.save();
  return discussion.populate('authorId', 'name');
};

/**
 * Adds a reply to a discussion.
 * @param {string} discussionId - The ID of the discussion.
 * @param {string} authorId - The ID of the reply author.
 * @param {string} content - The content of the reply.
 * @returns {Promise<object>} The updated discussion.
 */
const addReply = async (discussionId, authorId, content) => {
  const reply = { authorId, content, createdAt: new Date() };
  return await StudyGroupDiscussion.findByIdAndUpdate(
    discussionId,
    { $push: { replies: reply } },
    { returnDocument: "after" }
  );
};

module.exports = {
  getDiscussionsByGroup,
  createDiscussion,
  addReply,
};
