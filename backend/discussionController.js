const discussionService = require('../services/discussionService');
const studyGroupService = require('../services/studyGroupService');

const getAllDiscussions = async (req, res) => {
  try {
    const { groupId } = req.params;
    const discussions = await discussionService.getDiscussionsByGroup(groupId);
    res.status(200).json(discussions);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching discussions', error: error.message });
  }
};

const createDiscussion = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { title, content } = req.body;
    const authorId = req.user.id;
    const discussion = await discussionService.createDiscussion(groupId, authorId, title, content);
    res.status(201).json(discussion);
  } catch (error) {
    res.status(500).json({ message: 'Error creating discussion', error: error.message });
  }
};

const addReply = async (req, res) => {
  try {
    const { discussionId } = req.params;
    const { content } = req.body;
    const authorId = req.user.id;
    const updatedDiscussion = await discussionService.addReply(discussionId, authorId, content);
    res.status(201).json(updatedDiscussion);
  } catch (error) {
    res.status(500).json({ message: 'Error adding reply', error: error.message });
  }
};

const getDiscussionById = async (req, res) => {
  // This can be expanded to fetch a single discussion with all replies paginated
  const discussion = await studyGroupService.getDiscussionById(req.params.discussionId);
  res.status(200).json(discussion);
};

module.exports = { getAllDiscussions, createDiscussion, addReply, getDiscussionById };