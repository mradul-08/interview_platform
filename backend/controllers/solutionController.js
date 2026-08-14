const mongoose = require("mongoose");
const Problem = require("../models/Problem");
const Discussion = require("../models/Discussion");

function normalizeSolution(doc) {
  return {
    _id: doc._id,
    problem: doc.problem,
    body: doc.body,
    likes: doc.likes || 0,
    isSolution: !!doc.isSolution,
    isPinned: !!doc.isPinned,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    author: doc.author || null,
  };
}

async function getProblemSolutions(req, res) {
  try {
    const { problemId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(problemId)) {
      return res.status(400).json({ message: "Invalid problem id" });
    }

    const problem = await Problem.findById(problemId).select("editorial title slug");
    if (!problem) return res.status(404).json({ message: "Problem not found" });

    const communitySolutions = await Discussion.find({
      problem: problemId,
      isSolution: true,
    })
      .populate("user", "name username avatarUrl role")
      .sort({ isPinned: -1, likes: -1, createdAt: -1 })
      .limit(50)
      .lean();

    return res.json({
      problem: {
        _id: problem._id,
        title: problem.title,
        slug: problem.slug,
        editorial: problem.editorial || "",
      },
      editorial: problem.editorial || "",
      communitySolutions: communitySolutions.map(normalizeSolution),
      total: communitySolutions.length,
    });
  } catch (error) {
    console.error("Get problem solutions error:", error.message);
    return res.status(500).json({ message: "Server Error" });
  }
}

async function markDiscussionAsSolution(req, res) {
  try {
    const { problemId, discussionId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(problemId) || !mongoose.Types.ObjectId.isValid(discussionId)) {
      return res.status(400).json({ message: "Invalid id" });
    }

    const problem = await Problem.findById(problemId).select("_id");
    if (!problem) return res.status(404).json({ message: "Problem not found" });

    const discussion = await Discussion.findOneAndUpdate(
      { _id: discussionId, problem: problemId },
      { $set: { isSolution: true } },
      { new: true }
    ).populate("user", "name username avatarUrl role");

    if (!discussion) return res.status(404).json({ message: "Discussion not found" });

    return res.json(normalizeSolution(discussion));
  } catch (error) {
    console.error("Mark solution error:", error.message);
    return res.status(500).json({ message: "Server Error" });
  }
}

module.exports = {
  getProblemSolutions,
  markDiscussionAsSolution,
};
