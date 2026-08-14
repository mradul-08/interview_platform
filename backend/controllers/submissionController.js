// backend/controllers/submissionController.js

const Submission = require("../models/Submission");
const Problem = require("../models/Problem");
const { executeCode } = require("../services/executionService");
const { processAcceptedSubmission } = require("../services/gamificationService");
const { emitToUser } = require("../socket");

// POST /api/submissions
const createSubmission = async (req, res) => {
    try {
        const { problemId, code, language } = req.body;

        const problem = await Problem.findById(problemId);

        if (!problem) {
            return res.status(404).json({
                message: "Problem not found",
            });
        }

        const result = await executeCode({
            problemId,
            code,
            language,
            type: "submit",
            userId: req.user._id,
        });
        const submission = await Submission.create({
            user: req.user._id,
            problem: problemId,
            code,
            language,
            verdict: result.verdict,
            runtime: result.runtime || "",
            memory: result.memory || "",
        });

        const gamification = result.verdict === "Accepted"
            ? await processAcceptedSubmission({ userId: req.user._id, submissionId: submission._id, problem })
            : null;
        if (result.verdict === "Accepted") req.app.locals.io?.emit("leaderboard:updated", { userId: String(req.user._id), reason: "accepted-submission" });
        emitToUser(req.app.locals.io, req.user._id, "coding:analytics-updated", { reason: "submission-saved", verdict: submission.verdict });
        if (gamification) emitToUser(req.app.locals.io, req.user._id, "gamification:updated", { reason: "submission-saved" });
        return res.status(201).json({ submission, streak: gamification?.stats || null, newlyUnlocked: gamification?.newlyUnlocked || [], pointsAwarded: gamification?.pointsAwarded || 0 });
    } catch (err) {
        console.error("Create Submission Error:", err);
        return res.status(500).json({
            message: "Server Error",
        });
    }
};

// GET /api/submissions/me
const getMySubmissions = async (req, res) => {
    try {
        const submissions = await Submission.find({
            user: req.user._id,
        })
            .populate("problem", "title slug difficulty")
            .sort({ createdAt: -1 })
            .limit(50);

        return res.status(200).json(submissions);
    } catch (err) {
        console.error("Get My Submissions Error:", err);
        return res.status(500).json({
            message: "Server Error",
        });
    }
};

// GET /api/submissions/problem/:problemId
const getSubmissionsForProblem = async (req, res) => {
    try {
        const { problemId } = req.params;

        const submissions = await Submission.find({
            user: req.user._id,
            problem: problemId,
        })
            .populate("problem", "title slug difficulty")
            .sort({ createdAt: -1 });

        return res.status(200).json(submissions);
    } catch (err) {
        console.error("Get Problem Submissions Error:", err);
        return res.status(500).json({
            message: "Server Error",
        });
    }
};

module.exports = {
    createSubmission,
    getMySubmissions,
    getSubmissionsForProblem,
};
