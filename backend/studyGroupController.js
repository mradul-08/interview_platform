const studyGroupService = require('../services/studyGroupService');

const createGroup = async (req, res) => {
  try {
    const group = await studyGroupService.createGroup(req.body, req.user.id);
    res.status(201).json(group);
  } catch (error) {
    res.status(500).json({ message: 'Error creating group', error: error.message });
  }
};

const getAllGroups = async (req, res) => {
  try {
    // In a real app, you might have search/filter from req.query
    const groups = await studyGroupService.getAllPublicGroups();
    res.status(200).json(groups);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching groups', error: error.message });
  }
};

const getGroupById = async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = await studyGroupService.getGroupById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    // TODO: Add logic to check if user can view private groups
    res.status(200).json(group);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching group', error: error.message });
  }
};

const updateGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const updatedGroup = await studyGroupService.updateGroup(groupId, req.body);
    if (!updatedGroup) {
      return res.status(404).json({ message: 'Group not found' });
    }
    res.status(200).json(updatedGroup);
  } catch (error) {
    res.status(500).json({ message: 'Error updating group', error: error.message });
  }
};

const deleteGroup = async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = await studyGroupService.getGroupById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // The permission middleware already checks for OWNER role
    await studyGroupService.deleteGroup(groupId);

    res.status(204).send(); // No Content
  } catch (error) {
    res.status(500).json({ message: 'Error deleting group', error: error.message });
  }
};

const getGroupDashboard = async (req, res) => {
  try {
    const { groupId } = req.params;
    const dashboardData = await studyGroupService.getGroupDashboardData(groupId);
    res.status(200).json(dashboardData);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching group dashboard data', error: error.message });
  }
};

module.exports = {
  createGroup,
  getAllGroups,
  getGroupById,
  updateGroup,
  deleteGroup,
  getGroupDashboard,
};