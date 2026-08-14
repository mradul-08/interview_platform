require("dotenv").config();
const fs = require("fs/promises");
const path = require("path");
const { problems } = require("../seed/seedProblems");

function jsonCell(value) {
  return JSON.stringify(value ?? []);
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[,"\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function problemToRow(problem) {
  return {
    title: problem.title || "",
    slug: problem.slug || "",
    description: problem.description || problem.statement || "",
    difficulty: problem.difficulty || "Medium",
    inputFormat: problem.inputFormat || "",
    outputFormat: problem.outputFormat || "",
    constraints: jsonCell(problem.constraints || []),
    examples: jsonCell(problem.examples || []),
    starterCodes: jsonCell(Object.entries(problem.starterCode || {}).map(([language, starterCode]) => ({
      language,
      starterCode,
      functionSignature: "",
    }))),
    testCases: jsonCell((problem.testCases || []).map((testCase) => ({
      input: testCase.input || "",
      expectedOutput: testCase.expectedOutput || testCase.output || "",
      isHidden: Boolean(testCase.hidden ?? testCase.isHidden ?? false),
      weight: Number(testCase.weight || 1),
    }))),
    hints: jsonCell(problem.hints || []),
    editorial: problem.editorial || "",
    tags: (problem.tags || problem.topic || []).join(", "),
    companies: (problem.companies || []).join(", "),
    sheets: (problem.sheet || []).join(", "),
    source: problem.source || "seed",
    sourceId: problem.sourceId || problem.slug || "",
    timeLimit: Number(problem.timeLimit || 2000),
    memoryLimit: Number(problem.memoryLimit || 256),
    isPublished: problem.isPublished !== false,
    createdBy: problem.createdBy || "system",
  };
}

async function main() {
  const outDir = path.join(__dirname, "..", "datasets");
  const jsonlPath = path.join(outDir, "problems.jsonl");
  const csvPath = path.join(outDir, "master_problems.csv");

  const rows = problems.map(problemToRow);
  const jsonl = rows.map((row) => JSON.stringify({
    title: row.title,
    slug: row.slug,
    description: row.description,
    difficulty: row.difficulty,
    inputFormat: row.inputFormat,
    outputFormat: row.outputFormat,
    constraints: JSON.parse(row.constraints),
    examples: JSON.parse(row.examples),
    starterCodes: JSON.parse(row.starterCodes),
    testCases: JSON.parse(row.testCases),
    hints: JSON.parse(row.hints),
    editorial: row.editorial,
    tags: row.tags ? row.tags.split(",").map((item) => item.trim()).filter(Boolean) : [],
    companies: row.companies ? row.companies.split(",").map((item) => item.trim()).filter(Boolean) : [],
    sheets: row.sheets ? row.sheets.split(",").map((item) => item.trim()).filter(Boolean) : [],
    source: row.source,
    sourceId: row.sourceId,
    timeLimit: row.timeLimit,
    memoryLimit: row.memoryLimit,
    isPublished: row.isPublished,
    createdBy: row.createdBy,
  })).join("\n");

  const csvHeader = Object.keys(rows[0] || {});
  const csv = [
    csvHeader.join(","),
    ...rows.map((row) => csvHeader.map((key) => csvEscape(row[key])).join(",")),
  ].join("\n") + "\n";

  await fs.writeFile(jsonlPath, jsonl + "\n", "utf8");
  await fs.writeFile(csvPath, csv, "utf8");
  console.log(`Exported ${rows.length} bundled problems to ${jsonlPath} and ${csvPath}`);
}

main().catch((error) => {
  console.error("Export failed:", error.message);
  process.exit(1);
});
