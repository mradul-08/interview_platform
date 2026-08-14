const express = require("express");
const { protect, requireRole } = require("../middleware/authMiddleware");
const { getDashboard, getCodingActivity, getCodingAnalytics } = require("../controllers/dashboardController");

const router = express.Router();

router.get("/", protect, requireRole("student"), getDashboard);
router.get("/coding-activity", protect, requireRole("student"), getCodingActivity);
router.get("/coding-analytics", protect, requireRole("student"), getCodingAnalytics);

module.exports = router;
