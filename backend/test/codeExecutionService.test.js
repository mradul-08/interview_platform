const assert = require("node:assert/strict");
const test = require("node:test");
const { classifyExecutionResult, normalizeLanguage, getTimeoutMs } = require("../services/codeExecutionService");

test("normalizes supported execution language aliases", () => {
  assert.equal(normalizeLanguage("C++"), "cpp");
  assert.equal(normalizeLanguage("node"), "javascript");
  assert.equal(getTimeoutMs(2000), 17000);
});

test("distinguishes unavailable Docker from user-code verdicts", () => {
  const result = classifyExecutionResult({
    result: { exitCode: 1, stderr: "failed to connect to the Docker API: daemon is not running", timedOut: false },
  });
  assert.deepEqual(result, { id: 0, description: "System Error" });
  assert.equal(classifyExecutionResult({ result: { exitCode: 200, stderr: "" } }).description, "Compilation Error");
  assert.equal(classifyExecutionResult({ result: { exitCode: 1, stderr: "" } }).description, "Runtime Error");
  assert.equal(classifyExecutionResult({ result: { exitCode: 137, stderr: "Traceback: RuntimeError" }, cleanStderr: "Traceback: RuntimeError" }).description, "Runtime Error");
  assert.equal(classifyExecutionResult({ result: { exitCode: 137, stderr: "Killed by cgroup" }, cleanStderr: "Killed by cgroup" }).description, "Memory Limit Exceeded");
});
