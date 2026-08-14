const Submission = require("../models/Submission");
const Problem = require("../models/Problem");
const { executeCode } = require("../services/executionService");
const { getExecutionLogById } = require("../services/executionLogger");
const { processAcceptedSubmission } = require("../services/gamificationService");

function buildExecutionResponse(result) {
  return {
    success: Boolean(result?.success ?? true),
    executionId: result?.executionId || "",
    verdict: result?.verdict || "Internal Error",
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
    const { problemId, code, language } = req.body || {};
    if (!problemId || !code || !language) {
      return res.status(400).json({ message: "problemId, code and language are required" });
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
    return res.status(500).json({ message });
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
