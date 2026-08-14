const express = require("express");
const { protect, requireRole } = require("../middleware/authMiddleware");
const { getProblemSolutions, markDiscussionAsSolution } = require("../controllers/solutionController");

const router = express.Router({ mergeParams: true });

router.get("/", protect, getProblemSolutions);
router.post("/:discussionId/mark", protect, requireRole("admin"), markDiscussionAsSolution);

module.exports = router;
