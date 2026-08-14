const assert = require("assert");
const { classifyExecutionResult } = require("../services/codeExecutionService");
const { getVerdictFromJudgeResponse } = require("../services/verdictEngine");

const executionCases = [
  [{ exitCode: 125, stderr: "Cannot connect to the Docker daemon" }, 0],
  [{ exitCode: 124, stderr: "" }, 5],
  [{ exitCode: 1, stderr: "", outputLimitExceeded: true }, 7],
  [{ exitCode: 137, stderr: "" }, 4],
  [{ exitCode: 11, stderr: "std::bad_alloc: cannot allocate memory" }, 4],
  [{ exitCode: 200, stderr: "compile error" }, 6],
  [{ exitCode: 139, stderr: "segmentation fault" }, 11],
  [{ exitCode: 0, stderr: "" }, 3],
];

for (const [result, expectedId] of executionCases) {
  assert.strictEqual(
    classifyExecutionResult({ result, cleanStderr: result.stderr }).id,
    expectedId,
    `Unexpected execution status for ${JSON.stringify(result)}`
  );
}

const verdictCases = [
  [
    { status: { id: 11, description: "Runtime Error" } },
    "std::bad_alloc",
    "Memory Limit Exceeded",
  ],
  [
    { status: { id: 11, description: "Runtime Error" } },
    "segmentation fault",
    "Runtime Error",
  ],
  [
    { status: { id: 3, description: "Accepted" } },
    "warning: diagnostic",
    "Accepted",
  ],
  [
    { status: { id: 3, description: "Accepted" } },
    "",
    "Wrong Answer",
  ],
];

for (const [response, stderr, expected] of verdictCases) {
  const actual = getVerdictFromJudgeResponse({
    response,
    stderr,
    stdout: expected === "Wrong Answer" ? "2" : "42",
    expectedOutput: expected === "Wrong Answer" ? "3" : "42",
  });
  assert.strictEqual(actual.verdict, expected, `Unexpected verdict for ${JSON.stringify(response)}`);
}

console.log(`Verdict smoke test passed: ${executionCases.length} execution cases, ${verdictCases.length} verdict cases.`);
