const StudyGroupMember = require('../models/StudyGroupMember');

const roleHierarchy = {
  OWNER: 3,
  ADMIN: 2,
  MODERATOR: 1,
  MEMBER: 0,
};

/**
 * Middleware to check if a user has the required role in a study group.
 * @param {('OWNER'|'ADMIN'|'MODERATOR'|'MEMBER')} requiredRole - The minimum role required.
 */
const checkGroupPermission = (requiredRole) => async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const userId = req.user.id;

    if (!groupId || !userId) {
      return res.status(400).json({ message: 'Group ID and User ID are required.' });
    }

    const membership = await StudyGroupMember.findOne({ groupId, userId, status: 'APPROVED' });

    if (!membership || roleHierarchy[membership.role] < roleHierarchy[requiredRole]) {
      return res.status(403).json({ message: 'You do not have permission to perform this action.' });
    }

    req.membership = membership; // Attach membership to request for later use
    next();
  } catch (error) {
    res.status(500).json({ message: 'Error checking permissions.' });
  }
};

module.exports = { checkGroupPermission };