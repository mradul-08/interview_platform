const express = require("express");
const { protect, requireRole } = require("../middleware/authMiddleware");
const controller = require("../controllers/notificationController");

const router = express.Router();
router.use(protect, requireRole("student"));
router.get("/", controller.listNotifications);
router.post("/read-all", controller.markAllRead);
router.post("/:id/read", controller.markRead);

module.exports = router;
