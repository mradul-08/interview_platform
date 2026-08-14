const crypto = require("crypto");
const Problem = require("../models/Problem");
const { executeInDocker } = require("./codeExecutionService");
const { normalizeInputText } = require("./inputParser");
const { getVerdictFromJudgeResponse } = require("./verdictEngine");
const { saveExecutionLog } = require("./executionLogger");

function getPublicTestCases(problem) {
  return (problem.testCases || []).filter((tc) => !(tc.hidden || tc.isHidden));
}

function getAllTestCases(problem) {
  return problem.testCases || [];
}

function mapTestCase(testCase) {
  return {
    input: String(testCase.input ?? ""),
    expectedOutput: String(testCase.expectedOutput ?? testCase.output ?? ""),
    hidden: Boolean(testCase.hidden || testCase.isHidden),
    weight: Number(testCase.weight || 1),
  };
}

async function executeCode({ problemId, code, language, type, userId, includeHiddenDetails = false }) {
  const problem = await Problem.findById(problemId).lean();
  if (!problem) {
    return { success: false, verdict: "Internal Error", message: "Problem not found" };
  }

  const testCases = type === "run" ? getPublicTestCases(problem) : getAllTestCases(problem);
  if (!testCases.length) {
    return { success: false, verdict: "Internal Error", message: "No testcases available" };
  }

  const executionId = crypto.randomUUID();
  const resultSummaries = [];
  let lastTrace = null;
  for (const testCase of testCases) {
    const testcase = mapTestCase(testCase);
    const normalizedInput = normalizeInputText(testcase.input);
    let judgeResult;
    try {
      judgeResult = await executeInDocker({
        sourceCode: code,
        language,
        stdin: normalizedInput,
        timeLimit: Number(problem.timeLimit || 2000),
        memoryLimit: Number(problem.memoryLimit || 256),
      });
    } catch (error) {
      const failResponse = {
        status: { id: 0, description: "Internal Error" },
        stdout: "",
        stderr: error.message || "Judge0 request failed",
        compile_output: "",
        time: "",
        memory: "",
      };
      const failedResult = {
        input: normalizedInput,
        expectedOutput: testcase.expectedOutput,
        output: "",
        verdict: "Internal Error",
        status: failResponse.status,
        runtime: "",
        memory: "",
        compileOutput: "",
        stderr: failResponse.stderr,
        isHidden: testcase.hidden,
        weight: testcase.weight,
      };
      resultSummaries.push(failedResult);
      lastTrace = {
        generatedSource: "",
        request: {},
        response: failResponse,
        testcase,
        verdict: "Internal Error",
      };
      break;
    }

    const verdictInfo = getVerdictFromJudgeResponse({
      response: judgeResult.response,
      expectedOutput: testcase.expectedOutput,
      stdout: judgeResult.response?.stdout ?? "",
      stderr: judgeResult.response?.stderr ?? "",
      compileOutput: judgeResult.response?.compile_output ?? "",
    });
    const failedTestcase = verdictInfo.verdict === "Accepted" ? null : testcase;
    const summary = {
      input: normalizedInput,
      expectedOutput: testcase.expectedOutput,
      output: String(judgeResult.response?.stdout ?? ""),
      verdict: verdictInfo.verdict,
      status: judgeResult.response?.status || null,
      runtime: String(verdictInfo.runtime || ""),
      memory: String(verdictInfo.memory || ""),
      compileOutput: String(judgeResult.response?.compile_output ?? ""),
      stderr: String(judgeResult.response?.stderr ?? ""),
      isHidden: testcase.hidden,
      weight: testcase.weight,
    };
    resultSummaries.push(summary);
    lastTrace = {
      generatedSource: judgeResult.generatedSource || "",
      request: judgeResult.request,
      response: judgeResult.response,
      testcase: { ...testcase, input: normalizedInput },
      verdict: summary.verdict,
    };
    if (summary.verdict !== "Accepted") break;
  }

  const last = resultSummaries[resultSummaries.length - 1] || {};
  const finalVerdict = resultSummaries.every((item) => item.verdict === "Accepted")
    ? "Accepted"
    : last.verdict || "Internal Error";
  const hideLastDetails = last.isHidden && !includeHiddenDetails;
  const visibleTestcaseResults = resultSummaries.map((item) => {
    if (!item.isHidden || includeHiddenDetails) return item;
    return {
      verdict: item.verdict,
      status: item.status,
      runtime: item.runtime,
      memory: item.memory,
      isHidden: true,
      weight: item.weight,
    };
  });
  const visibleFailedTestcase = last.verdict === "Accepted"
    ? null
    : hideLastDetails
      ? { verdict: last.verdict || finalVerdict, isHidden: true }
      : {
        input: last.input || "",
        expectedOutput: last.expectedOutput || "",
        actualOutput: last.output || "",
        verdict: last.verdict || finalVerdict,
      };
  const response = {
    success: true,
    executionId,
    verdict: finalVerdict,
    runtime: last.runtime || "",
    memory: last.memory || "",
    stdout: hideLastDetails ? "" : last.output || "",
    stderr: hideLastDetails ? "" : last.stderr || "",
    compileOutput: hideLastDetails ? "" : last.compileOutput || "",
    status: last.status || null,
    input: hideLastDetails ? "" : last.input || "",
    expectedOutput: hideLastDetails ? "" : last.expectedOutput || "",
    actualOutput: hideLastDetails ? "" : last.output || "",
    failedTestcase: visibleFailedTestcase,
    testcaseResults: visibleTestcaseResults,
    trace: includeHiddenDetails && lastTrace ? [lastTrace] : [],
    generatedSource: lastTrace?.generatedSource || "",
    judge0Request: includeHiddenDetails ? lastTrace?.request || {} : {},
    judge0Response: includeHiddenDetails ? lastTrace?.response || {} : {},
  };

  try {
    await saveExecutionLog({
      executionId,
      type,
      user: userId || null,
      problem: problemId,
      language,
      sourceCode: code,
      generatedSource: response.generatedSource,
      judge0Request: response.judge0Request,
      judge0Response: response.judge0Response,
      verdict: response.verdict,
      runtime: response.runtime,
      memory: response.memory,
      stdout: response.stdout,
      stderr: response.stderr,
      compileOutput: response.compileOutput,
      input: response.input,
      expectedOutput: response.expectedOutput,
      actualOutput: response.actualOutput,
      failedTestcase: response.failedTestcase,
      executionTimeMs: Number.parseInt(response.runtime, 10) || 0,
      error: "",
    });
  } catch (error) {
    // Execution result is authoritative. A temporary logging/database issue
    // must not turn an already completed run into a false HTTP 500.
    console.error("Execution log save failed:", error.message);
  }

  return response;
}

module.exports = {
  executeCode,
  getPublicTestCases,
};
