function toLower(value) {
  return String(value || "").toLowerCase();
}

function normalizeOutput(value) {
  return String(value ?? "").replace(/\r\n/g, "\n").trim();
}

function outputsMatch(actual, expected) {
  const left = normalizeOutput(actual);
  const right = normalizeOutput(expected);
  if (left === right) return true;
  try {
    return JSON.stringify(JSON.parse(left)) === JSON.stringify(JSON.parse(right));
  } catch {
    return left.split("\n").map((line) => line.trimEnd()).join("\n") === right.split("\n").map((line) => line.trimEnd()).join("\n");
  }
}

function getVerdictFromJudgeResponse({ response, expectedOutput, stdout, stderr, compileOutput }) {
  const status = response?.status || null;
  const statusId = Number(status?.id || 0);
  const statusDescription = toLower(status?.description || "");
  const errorText = toLower(stderr);
  const time = response?.time ?? "";
  const memory = response?.memory ?? "";

  if (statusDescription.includes("internal")) {
    return { verdict: "Internal Error", runtime: time, memory };
  }

  if (statusDescription.includes("compile") || compileOutput) {
    return { verdict: "Compilation Error", runtime: time, memory };
  }

  if (statusDescription.includes("time limit") || statusDescription.includes("time limit exceeded") || statusId === 5) {
    return { verdict: "Time Limit Exceeded", runtime: time, memory };
  }

  if (statusDescription.includes("output limit") || statusId === 7) {
    return { verdict: "Output Limit Exceeded", runtime: time, memory };
  }

  if (
    statusDescription.includes("memory") ||
    statusId === 4 ||
    errorText.includes("bad_alloc") ||
    errorText.includes("std::bad_alloc") ||
    errorText.includes("cannot allocate memory") ||
    errorText.includes("out of memory") ||
    errorText.includes("oom")
  ) {
    return { verdict: "Memory Limit Exceeded", runtime: time, memory };
  }

  // A successful process may legitimately write warnings or diagnostics to
  // stderr. Compare its stdout before treating stderr as a runtime failure.
  if (statusId === 3 || statusDescription.includes("accepted")) {
    if (String(expectedOutput ?? "").trim() === "") {
      return { verdict: "Accepted", runtime: time, memory };
    }
    return {
      verdict: outputsMatch(stdout, expectedOutput) ? "Accepted" : "Wrong Answer",
      runtime: time,
      memory,
    };
  }

  if (
    statusDescription.includes("runtime") ||
    statusId === 11 ||
    stderr
  ) {
    return { verdict: "Runtime Error", runtime: time, memory };
  }

  if (statusId === 6) return { verdict: "Compilation Error", runtime: time, memory };
  if (statusId === 11) return { verdict: "Runtime Error", runtime: time, memory };

  return { verdict: "Internal Error", runtime: time, memory };
}

module.exports = {
  getVerdictFromJudgeResponse,
};
