const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { listDiscussions, createDiscussion } = require("../controllers/discussionController");

const router = express.Router({ mergeParams: true });

router.get("/", protect, listDiscussions);
router.post("/", protect, createDiscussion);

module.exports = router;
