const membershipService = require('../services/membershipService');

const requestJoin = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;
    const membership = await membershipService.requestToJoinGroup(groupId, userId);
    const message = membership.status === 'APPROVED' ? 'Successfully joined the group.' : 'Your request to join has been sent.';
    res.status(201).json({ message, membership });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const leave = async (req, res) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;
    await membershipService.leaveGroup(groupId, userId);
    res.status(200).json({ message: 'You have left the group.' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const getJoinRequests = async (req, res) => {
  try {
    const { groupId } = req.params;
    const requests = await membershipService.getMembershipRequests(groupId);
    res.status(200).json(requests);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching join requests.' });
  }
};

const manageJoinRequest = async (req, res) => {
  try {
    const { groupId, memberId } = req.params;
    const { status } = req.body; // Expects 'APPROVED' or 'REJECTED'

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status provided.' });
    }

    const result = await membershipService.updateMembershipStatus(groupId, memberId, status);
    res.status(200).json(result);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  requestJoin,
  leave,
  getJoinRequests,
  manageJoinRequest,
};