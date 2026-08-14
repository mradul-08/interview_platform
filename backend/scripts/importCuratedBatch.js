require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const fs = require("fs/promises");
const path = require("path");
const mongoose = require("mongoose");
const { importDatasetContent } = require("../services/problemDatasetImporter");

const PLACEHOLDER = /^(sample|hidden|example|expected|another) (input|output)$/i;

function isJudgeReady(problem) {
  const testCases = Array.isArray(problem.testCases) ? problem.testCases : [];
  const hasHidden = testCases.some((testCase) => Boolean(testCase.isHidden || testCase.hidden));
  const hasRealCases = testCases.length >= 2 && testCases.every((testCase) => {
    const input = String(testCase.input || "").trim();
    const output = String(testCase.expectedOutput || testCase.output || "").trim();
    return input && output && !PLACEHOLDER.test(input) && !PLACEHOLDER.test(output);
  });
  const hasExamples = Array.isArray(problem.examples) && problem.examples.some((example) => {
    return String(example.input || "").trim() && !PLACEHOLDER.test(String(example.input || "").trim());
  });
  return Boolean(
    String(problem.description || problem.statement || "").trim() &&
    String(problem.inputFormat || "").trim() &&
    String(problem.outputFormat || "").trim() &&
    Array.isArray(problem.constraints) && problem.constraints.length > 0 &&
    Array.isArray(problem.starterCodes) && problem.starterCodes.length === 4 &&
    hasExamples && hasHidden && hasRealCases
  );
}

function normalizeDatasetShape(problem) {
  return {
    ...problem,
    sheets: problem.sheets || problem.sheet || [],
    source: problem.source || process.env.CURATED_BATCH_SOURCE || "batch-01",
    sourceId: problem.sourceId || problem.slug,
    isPublished: true,
  };
}

async function main() {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is missing");
  const batchFile = String(process.env.CURATED_BATCH_FILE || "batch-01.jsonl").trim();
  const batchSource = String(process.env.CURATED_BATCH_SOURCE || "batch-01").trim();
  const filePath = path.isAbsolute(batchFile)
    ? batchFile
    : path.join(__dirname, "../datasets/batches", batchFile);
  const content = await fs.readFile(filePath, "utf8");
  const problems = content.trim().split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));
  const curated = problems.filter(isJudgeReady).map(normalizeDatasetShape);
  if (curated.length === 0) throw new Error(`No judge-ready problems found in ${batchFile}`);

  await mongoose.connect(process.env.MONGO_URI);
  const report = await importDatasetContent(
    path.basename(filePath),
    curated.map((problem) => JSON.stringify(problem)).join("\n"),
    { writeSupplementalCollections: false }
  );
  const curatedSlugs = curated.map((problem) => problem.slug);
  const unpublished = await require("../models/Problem").updateMany(
    { source: batchSource, sourceId: { $nin: curatedSlugs } },
    { $set: { isPublished: false } }
  );
  console.log(JSON.stringify({
    total: problems.length,
    judgeReady: curated.length,
    unpublishedIncomplete: unpublished.modifiedCount || 0,
    report,
  }, null, 2));
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
