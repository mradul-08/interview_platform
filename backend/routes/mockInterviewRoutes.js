const express = require("express");
const { protect, requireRole } = require("../middleware/authMiddleware");
const controller = require("../controllers/mockInterviewController");

const router = express.Router();
router.use(protect, requireRole("student"));

router.post("/", controller.createInterview);
router.get("/", controller.listInterviews);
router.get("/join/:joinCode", controller.resolveJoinCode);
router.get("/:interviewId", controller.getInterview);
router.post("/:interviewId/token", controller.createRoomToken);
router.post("/:interviewId/end", controller.endInterview);
router.post("/:interviewId/cancel", controller.cancelInterview);

module.exports = router;
