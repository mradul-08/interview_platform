const express = require('express');
const router = express.Router();
const groupController = require('../controllers/studyGroupController');
const { protect } = require('../../../middleware/authMiddleware'); // Assuming a shared auth middleware
const { checkGroupPermission } = require('../middleware/permissionMiddleware');
const { validate, createGroupSchema, updateGroupSchema } = require('../validators/studyGroupValidators');

// Get all public study groups (Discovery)
router.get('/', groupController.getAllGroups);

// Create a new study group
router.post('/', protect, validate(createGroupSchema), groupController.createGroup);

// Get a single study group by ID
router.get('/:groupId', groupController.getGroupById);

// Get aggregated dashboard data for a group
router.get('/:groupId/dashboard', protect, groupController.getGroupDashboard);

// Update a study group (only ADMIN or OWNER)
router.patch('/:groupId', protect, checkGroupPermission('ADMIN'), validate(updateGroupSchema), groupController.updateGroup);

// Delete a study group (only OWNER)
router.delete('/:groupId', protect, checkGroupPermission('OWNER'), groupController.deleteGroup);

module.exports = router;