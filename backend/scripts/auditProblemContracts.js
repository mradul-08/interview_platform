require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const mongoose = require("mongoose");
const Problem = require("../models/Problem");

const PLACEHOLDER = /^(?:sample\s+(?:input|output)|placeholder|todo|tbd|n\/a|-+)$/i;

function text(value) {
  return String(value ?? "").trim();
}

function expectedOutput(testCase) {
  return text(testCase.output) || text(testCase.expectedOutput);
}

function auditProblem(problem) {
  const cases = Array.isArray(problem.testCases) ? problem.testCases : [];
  const publicCases = cases.filter((testCase) => !(testCase.hidden || testCase.isHidden));
  const hiddenCases = cases.filter((testCase) => Boolean(testCase.hidden || testCase.isHidden));
  const placeholderCases = cases.filter((testCase) => {
    const input = text(testCase.input);
    const output = expectedOutput(testCase);
    return PLACEHOLDER.test(input) || PLACEHOLDER.test(output);
  });
  const missingOutputCases = cases.filter((testCase) => !expectedOutput(testCase));
  const hasStarterCode = Object.values(problem.starterCode || {}).some((value) => text(value));
  const rawContract = Number(problem.contractVersion || 0) === 2 && text(problem.inputFormat).startsWith("Raw stdin contract:");

  const issues = [];
  if (cases.length === 0) issues.push("no-testcases");
  if (publicCases.length === 0) issues.push("no-public-testcase");
  if (hiddenCases.length === 0) issues.push("no-hidden-testcase");
  if (!hasStarterCode && problem.source !== "codeforces") issues.push("no-starter-code");
  if (placeholderCases.length > 0) issues.push("placeholder-testcase");
  if (missingOutputCases.length > 0) issues.push("missing-expected-output");
  if (rawContract) issues.push("raw-contract");

  return {
    id: String(problem._id),
    title: problem.title,
    slug: problem.slug,
    source: problem.source,
    contractVersion: Number(problem.contractVersion || 0),
    testcaseCount: cases.length,
    publicCount: publicCases.length,
    hiddenCount: hiddenCases.length,
    placeholderCount: placeholderCases.length,
    missingOutputCount: missingOutputCases.length,
    issues,
  };
}

async function main() {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is missing");
  await mongoose.connect(process.env.MONGO_URI);
  const problems = await Problem.find({}).select("title slug source contractVersion inputFormat starterCode testCases").lean();
  const report = problems.map(auditProblem);
  const issueCounts = {};
  for (const item of report) {
    for (const issue of item.issues) issueCounts[issue] = (issueCounts[issue] || 0) + 1;
  }
  const clean = report.filter((item) => item.issues.length === 0);
  console.log(JSON.stringify({
    total: report.length,
    clean: clean.length,
    withIssues: report.length - clean.length,
    issueCounts,
    problems: report.filter((item) => item.issues.length > 0),
  }, null, 2));
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
