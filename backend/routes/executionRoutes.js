const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/authMiddleware");
const { runCode, submitCode, getExecutionLogs, getExecutionDebug } = require("../controllers/executionController");

const router = express.Router();

router.post("/run", protect, runCode);
router.post("/submit", protect, submitCode);
router.get("/logs", protect, requireRole("admin"), getExecutionLogs);
router.get("/debug/execution/:id", protect, requireRole("admin"), getExecutionDebug);

module.exports = router;
