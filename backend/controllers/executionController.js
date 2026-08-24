const Submission = require("../models/submission");
const Problem = require("../models/Problem");
const { executeCode } = require("../services/executionService");
const { getExecutionLogById } = require("../services/executionLogger");
const { processAcceptedSubmission } = require("../services/gamificationService");
const mongoose = require("mongoose");
const CompetitiveTest = require("../models/CompetitiveTest");
const CompetitiveTestAttempt = require("../models/CompetitiveTestAttempt");
const { assertCompetitiveSubmissionWindow } = require("../services/competitiveSubmissionService");
const { completeCompetitiveAttemptIfReady } = require("../services/competitiveAttemptCompletionService");
const { emitCompetitiveProgress } = require("../services/competitiveProgressService");
const { emitLeaderboardUpdate } = require("./leaderboardController");

function buildExecutionResponse(result) {
  return {
    success: Boolean(result?.success ?? true),
    executionId: result?.executionId || "",
    verdict: result?.verdict || "System Error",
    runtime: result?.runtime || "",
    memory: result?.memory || "",
    stdout: result?.stdout || "",
    stderr: result?.stderr || "",
    compileOutput: result?.compileOutput || "",
    input: result?.input || "",
    expectedOutput: result?.expectedOutput || "",
    actualOutput: result?.actualOutput || "",
    failedTestcase: result?.failedTestcase || null,
    generatedSource: result?.generatedSource || "",
    judge0Request: result?.judge0Request || {},
    judge0Response: result?.judge0Response || {},
    testcaseResults: result?.testcaseResults || [],
  };
}

async function getExecutionLogs(req, res) {
  try {
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "25", 10), 1), 100);
    const q = String(req.query.q || "").trim();
    const verdict = String(req.query.verdict || "").trim();
    const type = String(req.query.type || "").trim();
    const language = String(req.query.language || "").trim();
    const problem = String(req.query.problem || "").trim();
    const user = String(req.query.user || "").trim();

    const filter = {};
    if (verdict) filter.verdict = verdict;
    if (type) filter.type = type;
    if (language) filter.language = language;
    if (problem) filter.problem = problem;
    if (user) filter.user = user;
    if (q) {
      filter.$or = [
        { executionId: { $regex: q, $options: "i" } },
        { verdict: { $regex: q, $options: "i" } },
        { language: { $regex: q, $options: "i" } },
        { input: { $regex: q, $options: "i" } },
        { expectedOutput: { $regex: q, $options: "i" } },
        { actualOutput: { $regex: q, $options: "i" } },
        { sourceCode: { $regex: q, $options: "i" } },
        { generatedSource: { $regex: q, $options: "i" } },
      ];
    }

    const [items, total] = await Promise.all([
      ExecutionLog.find(filter)
        .populate("user", "name username email role")
        .populate("problem", "title slug difficulty")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      ExecutionLog.countDocuments(filter),
    ]);

    res.json({
      items,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    console.error("Get execution logs error:", error.message);
    res.status(500).json({ message: "Server Error" });
  }
}

async function runCode(req, res) {
  try {
    const { problemId, code, language } = req.body || {};
    if (!problemId || !code || !language) {
      return res.status(400).json({ message: "problemId, code and language are required" });
    }

    const result = await executeCode({
      problemId,
      code,
      language,
      type: "run",
      userId: req.user?._id,
      includeHiddenDetails: req.user?.role === "admin",
    });
    return res.json(buildExecutionResponse(result));
  } catch (error) {
    console.error("Run code error:", error.message, error.response?.data || "");
    const message = error.response?.data?.message || error.response?.data || error.message || "Run failed";
    return res.status(500).json({ message });
  }
}

async function submitCode(req, res) {
  try {
    const { problemId, code, language, competitiveTestId, competitiveTestAttemptId } = req.body || {};
    if (!problemId || !code || !language) {
      return res.status(400).json({ message: "problemId, code and language are required" });
    }

    let competitiveContext = null;
    if (competitiveTestId || competitiveTestAttemptId) {
      if (!mongoose.isValidObjectId(competitiveTestId) || !mongoose.isValidObjectId(competitiveTestAttemptId)) return res.status(400).json({ message: "Valid competitive test and attempt IDs are required" });
      const [test, attempt] = await Promise.all([
        CompetitiveTest.findOne({ _id: competitiveTestId, participantIds: req.user._id }),
        CompetitiveTestAttempt.findOne({ _id: competitiveTestAttemptId, testId: competitiveTestId, participantId: req.user._id }),
      ]);
      assertCompetitiveSubmissionWindow({ test, attempt, problemId });
      competitiveContext = { test, attempt };
    }
    // The submit flow awards points after an Accepted result, so load the
    // problem explicitly here. Run-only execution does not need this field.
    const problem = await Problem.findById(problemId).select("difficulty title").lean();
    if (!problem) return res.status(404).json({ message: "Problem not found" });

    const result = await executeCode({
      problemId,
      code,
      language,
      type: "submit",
      userId: req.user?._id,
      includeHiddenDetails: req.user?.role === "admin",
    });
    if (competitiveContext) assertCompetitiveSubmissionWindow({ test: competitiveContext.test, attempt: competitiveContext.attempt, problemId, now: new Date() });
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
      let participantStatus = "STARTED";
      await CompetitiveTestAttempt.updateOne({ _id: competitiveContext.attempt._id, status: "STARTED" }, { $addToSet: { dsaSubmissionIds: submission._id } });
      if (submission.verdict === "Accepted") {
        const completed = await completeCompetitiveAttemptIfReady({ test: competitiveContext.test, attemptId: competitiveContext.attempt._id });
        if (completed?.status === "COMPLETED") participantStatus = completed.status;
      }
      req.app.locals.io?.to(`study-group:${String(competitiveContext.test.groupId)}`).emit("group:test-participant", { testId: competitiveContext.test._id, groupId: competitiveContext.test.groupId, participantId: req.user._id, status: participantStatus, problemId, verdict: submission.verdict });
      await emitCompetitiveProgress({ test: competitiveContext.test, io: req.app.locals.io });
    }

    const gamification = result.verdict === "Accepted"
      ? await processAcceptedSubmission({ userId: req.user._id, submissionId: submission._id, problem })
      : null;
    if (result.verdict === "Accepted") await emitLeaderboardUpdate(req.app.locals.io, req.user._id);

    return res.status(201).json({
      submission,
      ...buildExecutionResponse(result),
      streak: gamification?.stats || null,
      newlyUnlocked: gamification?.newlyUnlocked || [],
      pointsAwarded: gamification?.pointsAwarded || 0,
    });
  } catch (error) {
    console.error("Submit code error:", error.message, error.response?.data || "");
    const message = error.response?.data?.message || error.response?.data || error.message || "Submit failed";
    return res.status(error.status || 500).json({ message });
  }
}

async function getExecutionDebug(req, res) {
  try {
    const { id } = req.params;
    const log = await getExecutionLogById(id);
    if (!log) return res.status(404).json({ message: "Execution not found" });
    return res.json({
      executionId: log.executionId,
      generatedSource: log.generatedSource || "",
      judgeRequest: log.judge0Request || {},
      judgeResponse: log.judge0Response || {},
      wrapper: log.generatedSource || "",
      input: log.input || "",
      output: log.actualOutput || "",
      verdict: log.verdict || "",
      stderr: log.stderr || "",
      compileOutput: log.compileOutput || "",
      expectedOutput: log.expectedOutput || "",
      actualOutput: log.actualOutput || "",
    });
  } catch (error) {
    console.error("Get execution debug error:", error.message);
    return res.status(500).json({ message: "Server Error" });
  }
}

module.exports = { runCode, submitCode, getExecutionLogs, getExecutionDebug };
