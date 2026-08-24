// backend/controllers/submissionController.js

const Submission = require("../models/submission");
const Problem = require("../models/Problem");
const { executeCode } = require("../services/executionService");
const { processAcceptedSubmission } = require("../services/gamificationService");
const { emitToUser } = require("../socket");
const { emitLeaderboardUpdate } = require("./leaderboardController");
const mongoose = require("mongoose");
const CompetitiveTest = require("../models/CompetitiveTest");
const CompetitiveTestAttempt = require("../models/CompetitiveTestAttempt");
const { assertCompetitiveSubmissionWindow } = require("../services/competitiveSubmissionService");

// POST /api/submissions
const createSubmission = async (req, res) => {
    try {
        const { problemId, code, language, competitiveTestId, competitiveTestAttemptId } = req.body;

        let competitiveContext = null;
        if (competitiveTestId || competitiveTestAttemptId) {
            if (!mongoose.isValidObjectId(competitiveTestId) || !mongoose.isValidObjectId(competitiveTestAttemptId)) {
                return res.status(400).json({ message: "Valid competitive test and attempt IDs are required" });
            }
            const [test, attempt] = await Promise.all([
                CompetitiveTest.findOne({ _id: competitiveTestId, participantIds: req.user._id }),
                CompetitiveTestAttempt.findOne({ _id: competitiveTestAttemptId, testId: competitiveTestId, participantId: req.user._id }),
            ]);
            try {
                assertCompetitiveSubmissionWindow({ test, attempt, problemId });
            } catch (error) {
                return res.status(error.status || 409).json({ message: error.message });
            }
            competitiveContext = { test, attempt };
        }

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
        if (competitiveContext) {
            try {
                assertCompetitiveSubmissionWindow({ test: competitiveContext.test, attempt: competitiveContext.attempt, problemId, now: new Date() });
            } catch (error) {
                return res.status(error.status || 409).json({ message: error.message });
            }
        }
        const submission = await Submission.create({
            user: req.user._id,
            problem: problemId,
            code,
            language,
            verdict: result.verdict,
            runtime: result.runtime || "",
            memory: result.memory || "",
            competitiveTestId: competitiveContext?.test?._id || null,
            competitiveTestAttemptId: competitiveContext?.attempt?._id || null,
        });

        if (competitiveContext) {
            await CompetitiveTestAttempt.updateOne(
                { _id: competitiveContext.attempt._id, status: "STARTED" },
                { $addToSet: { dsaSubmissionIds: submission._id } },
            );
            let participantStatus = "STARTED";
            if (submission.verdict === "Accepted" && competitiveContext.test.type === "DSA") {
                const acceptedProblems = await Submission.find({
                    competitiveTestAttemptId: competitiveContext.attempt._id,
                    verdict: "Accepted",
                    problem: { $in: competitiveContext.test.problemIds },
                }).select("problem").lean();
                const solvedProblemIds = new Set(acceptedProblems.map((item) => String(item.problem)));
                if (solvedProblemIds.size === competitiveContext.test.problemIds.length) {
                    const completedAt = new Date();
                    const startedAt = new Date(competitiveContext.attempt.startedAt);
                    const completed = await CompetitiveTestAttempt.findOneAndUpdate(
                        { _id: competitiveContext.attempt._id, status: "STARTED" },
                        { $set: { status: "COMPLETED", completedAt, completionTimeSeconds: Math.max(0, Math.round((completedAt.getTime() - startedAt.getTime()) / 1000)) } },
                        { returnDocument: "after" },
                    ).lean();
                    if (completed) participantStatus = completed.status;
                }
            }
            req.app.locals.io?.to(`study-group:${String(competitiveContext.test.groupId)}`).emit("group:test-participant", {
                testId: competitiveContext.test._id,
                groupId: competitiveContext.test.groupId,
                participantId: req.user._id,
                status: participantStatus,
                problemId,
                verdict: submission.verdict,
            });
        }

        const gamification = result.verdict === "Accepted"
            ? await processAcceptedSubmission({ userId: req.user._id, submissionId: submission._id, problem })
            : null;
        if (result.verdict === "Accepted") await emitLeaderboardUpdate(req.app.locals.io, req.user._id);
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
