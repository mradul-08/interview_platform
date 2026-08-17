const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { getMyProfile, getMyProfileActivity, getPublicProfileActivity, updateMyProfile, getPublicProfile, deliverPublicResume } = require("../controllers/profileController");
const { uploadAvatar, uploadResume, deleteAvatar, deleteResume } = require("../controllers/profileController");
const { uploadAvatar: avatarUpload, uploadResume: resumeUpload } = require("../middleware/profileUploadMiddleware");

const router = express.Router();

router.get("/me", protect, getMyProfile);
router.get("/me/activity", protect, getMyProfileActivity);
router.patch("/me", protect, updateMyProfile);
router.post("/me/avatar", protect, avatarUpload.single("avatar"), uploadAvatar);
router.delete("/me/avatar", protect, deleteAvatar);
router.post("/me/resume", protect, resumeUpload.single("resume"), uploadResume);
router.delete("/me/resume", protect, deleteResume);
router.get("/resume/:username", deliverPublicResume);
router.get("/:username/activity", getPublicProfileActivity);
router.get("/:username", getPublicProfile);

module.exports = router;
