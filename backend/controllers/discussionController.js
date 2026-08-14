const mongoose = require("mongoose");
const Problem = require("../models/Problem");
const Discussion = require("../models/Discussion");
const User = require("../models/User");

function normalizeDiscussion(doc) {
  return {
    _id: doc._id,
    problem: doc.problem,
    user: doc.user,
    body: doc.body,
    parent: doc.parent || null,
    likes: doc.likes || 0,
    isSolution: !!doc.isSolution,
    isPinned: !!doc.isPinned,
    isModerated: !!doc.isModerated,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    author: doc.author || null,
    replies: Array.isArray(doc.replies) ? doc.replies : [],
  };
}

async function listDiscussions(req, res) {
  try {
    const { problemId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(problemId)) {
      return res.status(400).json({ message: "Invalid problem id" });
    }

    const problem = await Problem.findById(problemId).select("_id");
    if (!problem) return res.status(404).json({ message: "Problem not found" });

    const discussions = await Discussion.find({ problem: problemId })
      .populate("user", "name username avatarUrl role")
      .sort({ isPinned: -1, likes: -1, createdAt: 1 })
      .limit(200)
      .lean();

    const nodeMap = new Map();
    const rootNodes = [];

    for (const discussion of discussions) {
      nodeMap.set(String(discussion._id), {
        ...normalizeDiscussion(discussion),
        replies: [],
      });
    }

    for (const discussion of discussions) {
      const node = nodeMap.get(String(discussion._id));
      const parentId = discussion.parent ? String(discussion.parent) : null;
      if (parentId && nodeMap.has(parentId)) {
        nodeMap.get(parentId).replies.push(node);
      } else if (!parentId) {
        rootNodes.push(node);
      }
    }

    return res.json({ items: rootNodes, total: rootNodes.length });
  } catch (error) {
    console.error("List discussions error:", error.message);
    return res.status(500).json({ message: "Server Error" });
  }
}

async function createDiscussion(req, res) {
  try {
    const { problemId } = req.params;
    const { body, parentId } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(problemId)) {
      return res.status(400).json({ message: "Invalid problem id" });
    }
    if (!body || !String(body).trim()) {
      return res.status(400).json({ message: "Discussion body is required" });
    }

    const problem = await Problem.findById(problemId).select("_id");
    if (!problem) return res.status(404).json({ message: "Problem not found" });

    if (parentId && !mongoose.Types.ObjectId.isValid(parentId)) {
      return res.status(400).json({ message: "Invalid parent discussion id" });
    }

    if (parentId) {
      const parent = await Discussion.findOne({ _id: parentId, problem: problemId }).select("_id");
      if (!parent) return res.status(404).json({ message: "Parent discussion not found" });
    }

    const discussion = await Discussion.create({
      problem: problemId,
      user: req.user._id,
      body: String(body).trim(),
      parent: parentId || null,
    });

    const populated = await Discussion.findById(discussion._id)
      .populate("user", "name username avatarUrl role")
      .lean();

    return res.status(201).json(normalizeDiscussion(populated));
  } catch (error) {
    console.error("Create discussion error:", error.message);
    return res.status(500).json({ message: "Server Error" });
  }
}

module.exports = {
  listDiscussions,
  createDiscussion,
};
