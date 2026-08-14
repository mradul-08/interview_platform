require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const Problem = require("../models/Problem");
const { buildContentStatus, slugify } = require("../services/ProblemNormalizer");
const { generateProblem } = require("../services/LocalAiGenerator");

const PLACEHOLDER_RE = /^(example input|example output|another input|another output|sample input|sample output|hidden input|hidden output|illustrative example for the problem statement\.?)$/i;

function hasPlaceholderText(value) {
  return PLACEHOLDER_RE.test(String(value || "").trim());
}

function hasMeaningfulExamples(problem) {
  if (!Array.isArray(problem.examples) || problem.examples.length === 0) return false;
  const meaningfulCount = problem.examples.filter((example) => {
    const input = String(example?.input || "").trim();
    const output = String(example?.output || "").trim();
    const explanation = String(example?.explanation || "").trim();
    return input && output && !hasPlaceholderText(input) && !hasPlaceholderText(output) && !hasPlaceholderText(explanation);
  }).length;
  return meaningfulCount >= 2;
}

function hasMeaningfulTestCases(problem) {
  if (!Array.isArray(problem.testCases) || problem.testCases.length === 0) return false;
  const meaningful = problem.testCases.filter((testCase) => {
    const input = String(testCase?.input || "").trim();
    const output = String(testCase?.expectedOutput || testCase?.output || "").trim();
    return input && output && !hasPlaceholderText(input) && !hasPlaceholderText(output);
  });
  return meaningful.length >= 2 && meaningful.some((testCase) => Boolean(testCase?.isHidden || testCase?.hidden));
}

function titleLooksLike(title, patterns) {
  const value = String(title || "").toLowerCase();
  return patterns.some((pattern) => value.includes(pattern));
}

function buildConcreteContent(problem) {
  const title = String(problem.title || "Problem").trim();
  const description = String(problem.description || problem.statement || `Solve ${title}.`).trim();

  if (titleLooksLike(title, ["xor"])) {
    return {
      examples: [
        { input: "nums = [1, 2, 3]", output: "3", explanation: "The subarray [1, 2] has XOR 3." },
        { input: "nums = [4, 1, 2]", output: "7", explanation: "The subarray [4, 1, 2] has XOR 7." },
      ],
      testCases: [
        { input: "[1,2,3]", expectedOutput: "3", isHidden: false, weight: 1 },
        { input: "[4,1,2]", expectedOutput: "7", isHidden: true, weight: 1 },
      ],
    };
  }

  if (titleLooksLike(title, ["pair sum", "two sum"])) {
    return {
      examples: [
        { input: "nums = [1, 2, 3, 4], target = 5", output: "2", explanation: "Pairs are (1,4) and (2,3)." },
        { input: "nums = [1, 1, 1], target = 2", output: "3", explanation: "There are three distinct pairs." },
      ],
      testCases: [
        { input: "[1,2,3,4]\\n5", expectedOutput: "2", isHidden: false, weight: 1 },
        { input: "[1,1,1]\\n2", expectedOutput: "3", isHidden: true, weight: 1 },
      ],
    };
  }

  if (titleLooksLike(title, ["balanced", "parentheses"])) {
    return {
      examples: [
        { input: 's = "(()())"', output: "6", explanation: "The whole string is balanced." },
        { input: 's = "())(()"', output: "2", explanation: "Only the first two characters form a balanced prefix." },
      ],
      testCases: [
        { input: "(()())", expectedOutput: "6", isHidden: false, weight: 1 },
        { input: "())(()", expectedOutput: "2", isHidden: true, weight: 1 },
      ],
    };
  }

  if (titleLooksLike(title, ["window", "sliding"])) {
    return {
      examples: [
        { input: "nums = [1,2,1,3,4,2,3], k = 4", output: "[3,4,4,3]", explanation: "Count distinct numbers in each window." },
      ],
      testCases: [
        { input: "[1,2,1,3,4,2,3]\\n4", expectedOutput: "[3,4,4,3]", isHidden: false, weight: 1 },
      ],
    };
  }

  if (titleLooksLike(title, ["meeting", "interval", "booking", "overlap"])) {
    return {
      examples: [
        { input: "intervals = [[0,30],[5,10],[15,20]]", output: "false", explanation: "The meetings [0,30] and [5,10] overlap." },
        { input: "intervals = [[7,10],[2,4]]", output: "true", explanation: "No intervals overlap here." },
      ],
      testCases: [
        { input: "[[0,30],[5,10],[15,20]]", expectedOutput: "false", isHidden: false, weight: 1 },
        { input: "[[7,10],[2,4]]", expectedOutput: "true", isHidden: true, weight: 1 },
      ],
    };
  }

  if (titleLooksLike(title, ["tree", "width"])) {
    return {
      examples: [
        { input: "root = [1,3,2,5,3,null,9]", output: "4", explanation: "The last level spans width 4." },
      ],
      testCases: [
        { input: "[1,3,2,5,3,null,9]", expectedOutput: "4", isHidden: false, weight: 1 },
      ],
    };
  }

  if (titleLooksLike(title, ["median"])) {
    return {
      examples: [
        { input: "stream = [1, 2, 3]", output: "2", explanation: "After inserting 1, 2 and 3 the median is 2." },
      ],
      testCases: [
        { input: "[1,2,3]", expectedOutput: "2", isHidden: false, weight: 1 },
      ],
    };
  }

  return {
    examples: [
      { input: "", output: "", explanation: `Examples must be supplied for ${title}.` },
    ],
    // Never invent inputs or expected outputs. An incomplete problem stays
    // unpublished until an author supplies real judge data.
    testCases: [],
  };
}

function normalizeCodeString(value) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t");
}

function buildFallbackDraft(problem) {
  const title = problem.title || "Untitled Problem";
  const slug = problem.slug || slugify(title);
  const tags = Array.isArray(problem.tags) && problem.tags.length > 0
    ? problem.tags
    : Array.isArray(problem.topic) && problem.topic.length > 0
      ? problem.topic
      : ["Array"];
  const difficulty = problem.difficulty || "Medium";
  const points = difficulty === "Hard" ? 30 : difficulty === "Medium" ? 20 : 10;
  const inputFormat = String(problem.inputFormat || "").trim() || "Input is given in the format described in the statement or examples.";
  const outputFormat = String(problem.outputFormat || "").trim() || "Return a single value or structure exactly matching the required output.";

  return {
    title,
    slug,
    source: problem.source || "imported",
    sourceId: problem.sourceId || slug,
    sourceUrl: problem.sourceUrl || "",
    difficulty,
    rating: problem.rating ?? null,
    topic: tags,
    tags,
    companies: Array.isArray(problem.companies) ? problem.companies : [],
    acceptanceRate: problem.acceptanceRate || 0,
    statement: problem.statement || problem.description || `Solve the ${title} problem.`,
    description: problem.description || problem.statement || `Solve the ${title} problem.`,
    inputFormat,
    outputFormat,
    constraints: Array.isArray(problem.constraints) && problem.constraints.length > 0
      ? problem.constraints
      : ["Provide an efficient solution.", "Handle edge cases carefully."],
    examples: hasMeaningfulExamples(problem)
      ? problem.examples
      : buildConcreteContent(problem).examples,
    hints: Array.isArray(problem.hints) ? problem.hints : [],
    editorial: problem.editorial || "",
    starterCode: problem.starterCode
      ? Object.fromEntries(Object.entries(problem.starterCode).map(([lang, code]) => [lang, normalizeCodeString(code)]))
      : {
      cpp: "class Solution {\npublic:\n    // TODO\n};",
      java: "class Solution {\n    // TODO\n}",
      python: "class Solution:\n    pass",
      javascript: "var solve = function() {\n};",
    },
    testCases: hasMeaningfulTestCases(problem)
      ? problem.testCases
      : buildConcreteContent(problem).testCases,
    timeLimit: problem.timeLimit || 2000,
    memoryLimit: problem.memoryLimit || 256,
    testcaseValidator: problem.testcaseValidator || "standard",
    articleLinks: Array.isArray(problem.articleLinks) ? problem.articleLinks : [],
    videoLinks: Array.isArray(problem.videoLinks) ? problem.videoLinks : [],
    sheet: Array.isArray(problem.sheet) ? problem.sheet : [],
    points,
    createdBy: problem.createdBy || "system",
    isOriginal: !!problem.isOriginal,
    isImported: !!problem.isImported,
    isPublished: false,
  };
}

async function buildDraft(problem) {
  return buildFallbackDraft(problem);
}

async function main() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is required");
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log("MongoDB connected");

  const target = String(process.argv[2] || "all").trim();
  const save = String(process.argv[3] || "false").toLowerCase() === "true";
  const query = target === "all"
    ? {
        $or: [
          { statement: { $in: ["", null] } },
          { description: { $in: ["", null] } },
          { examples: { $size: 0 } },
          { constraints: { $size: 0 } },
          { starterCode: { $exists: false } },
          { testCases: { $size: 0 } },
        ],
      }
    : { slug: target };

  const problems = await Problem.find(query).sort({ updatedAt: -1 }).lean();
  const placeholderProblems = await Problem.find({
    $or: [
      { "examples.input": { $regex: /^example input$/i } },
      { "examples.output": { $regex: /^example output$/i } },
      { "testCases.input": { $regex: /^sample input$/i } },
      { "testCases.expectedOutput": { $regex: /^sample output$/i } },
    ],
  }).sort({ updatedAt: -1 }).lean();
  const merged = new Map();
  for (const problem of problems) merged.set(String(problem._id), problem);
  for (const problem of placeholderProblems) merged.set(String(problem._id), problem);
  const problemList = Array.from(merged.values());
  console.log(`Found ${problemList.length} problem(s) to backfill`);

  const report = [];
  for (const problem of problemList) {
    const draft = await buildDraft(problem);
    const needsRegeneration =
      !buildContentStatus(problem).isComplete ||
      !hasMeaningfulExamples(problem) ||
      !hasMeaningfulTestCases(problem);

    if (!needsRegeneration) {
      report.push({
        slug: problem.slug,
        title: problem.title,
        isComplete: true,
        missing: [],
        saved: false,
      });
      continue;
    }

    const finalDraft = needsRegeneration ? draft : buildFallbackDraft(problem);
    const status = buildContentStatus(finalDraft);
    report.push({
      slug: finalDraft.slug,
      title: finalDraft.title,
      isComplete: status.isComplete,
      missing: status.missing,
      saved: false,
    });

    if (!save) continue;

    await Problem.findByIdAndUpdate(problem._id, { $set: finalDraft }, { new: false, runValidators: true });
    report[report.length - 1].saved = true;
  }

  const summary = report.reduce(
    (acc, item) => {
      if (item.isComplete) acc.complete += 1;
      else acc.partial += 1;
      if (item.saved) acc.saved += 1;
      return acc;
    },
    { complete: 0, partial: 0, saved: 0 }
  );

  console.log(JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(report.slice(0, 10), null, 2));

  await mongoose.disconnect();
}

if (require.main === module) {
  main().catch(async (error) => {
    console.error("Backfill failed:", error.message);
    try {
      await mongoose.disconnect();
    } catch {}
    process.exit(1);
  });
}

module.exports = {
  main,
  buildFallbackDraft,
  buildConcreteContent,
  hasMeaningfulExamples,
  hasMeaningfulTestCases,
};
