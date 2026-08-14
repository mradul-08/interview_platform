const express = require("express");
const { protect, requireRole } = require("../middleware/authMiddleware");
const { getStreak, getStreakCalendar, getAchievements } = require("../controllers/streakController");

const router = express.Router();
router.use(protect, requireRole("student"));
router.get("/", getStreak);
router.get("/calendar", getStreakCalendar);
router.get("/achievements", getAchievements);

module.exports = router;
