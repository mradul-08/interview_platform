const fs = require("fs/promises");
const path = require("path");
const mongoose = require("mongoose");
const { z } = require("zod");
const Problem = require("../models/Problem");
const ProblemExample = require("../models/ProblemExample");
const ProblemTestCase = require("../models/ProblemTestCase");
const ProblemStarterCode = require("../models/ProblemStarterCode");
const ProblemHint = require("../models/ProblemHint");
const ProblemEditorial = require("../models/ProblemEditorial");
const { buildContentStatus, slugify } = require("./ProblemNormalizer");
const { normalizeTestcaseContract } = require("./stdinContract");

const starterCodeSchema = z.object({
  language: z.string().min(1),
  starterCode: z.string().optional().default(""),
  functionSignature: z.string().optional().default(""),
});

const testCaseSchema = z.object({
  input: z.string().min(1),
  expectedOutput: z.string().min(1),
  isHidden: z.boolean().optional().default(false),
  weight: z.number().min(0).optional().default(1),
});

const exampleSchema = z.object({
  input: z.string().optional().default(""),
  output: z.string().optional().default(""),
  explanation: z.string().optional().default(""),
  order: z.number().int().min(0).optional().default(0),
});

const datasetSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional().default(""),
  difficulty: z.enum(["Easy", "Medium", "Hard"]),
  inputFormat: z.string().optional().default(""),
  outputFormat: z.string().optional().default(""),
  constraints: z.array(z.string()).optional().default([]),
  examples: z.array(exampleSchema).optional().default([]),
  starterCodes: z.array(starterCodeSchema).optional().default([]),
  testCases: z.array(testCaseSchema).optional().default([]),
  hints: z.array(z.string()).optional().default([]),
  editorial: z.string().optional().default(""),
  tags: z.array(z.string()).optional().default([]),
  companies: z.array(z.string()).optional().default([]),
  sheets: z.array(z.string()).optional().default([]),
  source: z.string().optional().default("dataset"),
  sourceId: z.string().optional().default(""),
  timeLimit: z.number().optional().default(2000),
  memoryLimit: z.number().optional().default(256),
  isPublished: z.boolean().optional().default(true),
  createdBy: z.string().optional().default("system"),
});

function normalizeSheetNameList(values) {
  return Array.from(new Set((values || []).map((v) => String(v || "").trim()).filter(Boolean)));
}

function normalizeCodeString(value) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t");
}

async function readJsonFile(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

async function readJsonlFile(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      try {
        return { value: JSON.parse(line), lineNumber: index + 1 };
      } catch (error) {
        throw new Error(`Invalid JSONL at line ${index + 1}: ${error.message}`);
      }
    });
}

async function findJsonFiles(rootDir) {
  const out = [];
  const jsonl = [];
  async function walk(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.isFile()) {
        const lower = entry.name.toLowerCase();
        if (lower.endsWith(".json")) out.push(full);
        if (lower.endsWith(".jsonl")) jsonl.push(full);
      }
    }
  }
  await walk(rootDir);
  return { jsonFiles: out, jsonlFiles: jsonl };
}

function transformDataset(raw, filePath) {
  const data = datasetSchema.parse(raw);
  return {
    filePath,
    data: {
      ...data,
      slug: slugify(data.slug || data.title),
      sheets: normalizeSheetNameList(data.sheets),
    },
  };
}

function parseCsv(content) {
  const rows = [];
  const text = String(content || "").replace(/\r\n/g, "\n");
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }

    if (ch === ",") {
      row.push(cell);
      cell = "";
      continue;
    }

    if (ch === "\n") {
      row.push(cell);
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += ch;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    if (row.length > 1 || row[0] !== "") rows.push(row);
  }

  return rows;
}

function rowToProblemRecord(record) {
  return {
    title: record.title || record.Title || "",
    slug: record.slug || record.Slug || "",
    description: record.description || record.Description || "",
    difficulty: record.difficulty || record.Difficulty || "Medium",
    inputFormat: record.inputFormat || record.input_format || record.InputFormat || "",
    outputFormat: record.outputFormat || record.output_format || record.OutputFormat || "",
    constraints: (() => {
      const value = record.constraints || record.Constraints || "[]";
      if (Array.isArray(value)) return value;
      if (typeof value === "string" && value.trim().startsWith("[")) {
        try { return JSON.parse(value); } catch {}
      }
      return String(value || "").split(/\r?\n|[,|]/).map((item) => item.trim()).filter(Boolean);
    })(),
    examples: (() => {
      const value = record.examples || record.Examples || "[]";
      if (Array.isArray(value)) return value;
      try { return JSON.parse(String(value || "[]")); } catch { return []; }
    })(),
    starterCodes: (() => {
      const value = record.starterCodes || record.StarterCodes || "[]";
      if (Array.isArray(value)) return value;
      try { return JSON.parse(String(value || "[]")); } catch { return []; }
    })(),
    testCases: (() => {
      const value = record.testCases || record.TestCases || "[]";
      if (Array.isArray(value)) return value;
      try { return JSON.parse(String(value || "[]")); } catch { return []; }
    })(),
    hints: (() => {
      const value = record.hints || record.Hints || "[]";
      if (Array.isArray(value)) return value;
      try { return JSON.parse(String(value || "[]")); } catch { return []; }
    })(),
    editorial: record.editorial || record.Editorial || "",
    tags: (() => {
      const value = record.tags || record.Tags || "";
      return Array.isArray(value) ? value : String(value || "").split(/[,|]/).map((item) => item.trim()).filter(Boolean);
    })(),
    companies: (() => {
      const value = record.companies || record.Companies || "";
      return Array.isArray(value) ? value : String(value || "").split(/[,|]/).map((item) => item.trim()).filter(Boolean);
    })(),
    sheets: (() => {
      const value = record.sheets || record.Sheets || "";
      return Array.isArray(value) ? value : String(value || "").split(/[,|]/).map((item) => item.trim()).filter(Boolean);
    })(),
    source: record.source || record.Source || "dataset",
    sourceId: record.sourceId || record.SourceId || "",
    timeLimit: Number(record.timeLimit || record.TimeLimit || 2000),
    memoryLimit: Number(record.memoryLimit || record.MemoryLimit || 256),
    isPublished: String(record.isPublished || record.Published || "true").toLowerCase() !== "false",
    createdBy: record.createdBy || record.CreatedBy || "system",
  };
}

async function importDatasetContent(fileName, content, options = {}) {
  const name = String(fileName || "").toLowerCase();
  const report = [];

  if (name.endsWith(".jsonl")) {
    const rows = String(content || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    for (let index = 0; index < rows.length; index++) {
      try {
        const raw = JSON.parse(rows[index]);
        const { data } = transformDataset(raw, fileName);
        const result = await upsertDatasetProblem(data, options);
        report.push({
          filePath: fileName,
          lineNumber: index + 1,
          slug: data.slug,
          status: "imported",
          published: Boolean(result.problem?.isPublished),
          missing: result.contentStatus?.missing || [],
        });
      } catch (error) {
        report.push({
          filePath: fileName,
          lineNumber: index + 1,
          status: "failed",
          error: error.message,
        });
      }
    }

    return report;
  }

  if (name.endsWith(".csv")) {
    const rows = parseCsv(content);
    if (rows.length === 0) return report;
    const header = rows[0].map((item) => String(item || "").trim());
    for (const [index, row] of rows.slice(1).entries()) {
      try {
        const record = {};
        for (let i = 0; i < header.length; i++) {
          record[header[i]] = row[i] ?? "";
        }
        const raw = rowToProblemRecord(record);
        const { data } = transformDataset(raw, fileName);
        const result = await upsertDatasetProblem(data, options);
        report.push({
          filePath: fileName,
          lineNumber: index + 2,
          slug: data.slug,
          status: "imported",
          published: Boolean(result.problem?.isPublished),
          missing: result.contentStatus?.missing || [],
        });
      } catch (error) {
        report.push({
          filePath: fileName,
          lineNumber: index + 2,
          status: "failed",
          error: error.message,
        });
      }
    }
    return report;
  }

  throw new Error("Unsupported file type. Use .json, .jsonl, or .csv");
}

async function upsertDatasetProblem(dataset, { dryRun = false, writeSupplementalCollections = false } = {}) {
  const starterCode = dataset.starterCodes.reduce((acc, item) => {
    acc[item.language] = normalizeCodeString(item.starterCode);
    return acc;
  }, {});
  const testCases = dataset.testCases.map((tc) => ({
    input: tc.input,
    output: tc.expectedOutput,
    expectedOutput: tc.expectedOutput,
    hidden: Boolean(tc.isHidden),
    isHidden: Boolean(tc.isHidden),
    weight: Number(tc.weight || 1),
  }));
  const contract = normalizeTestcaseContract({
    starterCode,
    testCases,
    inputFormat: dataset.inputFormat || "",
  });
  const doc = {
    title: dataset.title,
    slug: dataset.slug,
    source: dataset.source || "dataset",
    sourceId: dataset.sourceId || dataset.slug,
    sourceUrl: "",
    difficulty: dataset.difficulty,
    topic: dataset.tags,
    tags: dataset.tags,
    companies: dataset.companies,
    acceptanceRate: 0,
    statement: dataset.description,
    description: dataset.description,
    inputFormat: contract.inputFormat,
    outputFormat: dataset.outputFormat || "",
    constraints: dataset.constraints,
    examples: dataset.examples.map(({ order, ...ex }) => ex),
    hints: dataset.hints,
    editorial: dataset.editorial,
    starterCode,
    testCases: contract.testCases,
    timeLimit: Number(dataset.timeLimit || 2000),
    memoryLimit: Number(dataset.memoryLimit || 256),
    testcaseValidator: "standard",
    executionMode: "stdin",
    contractVersion: contract.contractVersion,
    articleLinks: [],
    videoLinks: [],
    sheet: dataset.sheets,
    points: dataset.difficulty === "Hard" ? 30 : dataset.difficulty === "Medium" ? 20 : 10,
    createdBy: dataset.createdBy || "system",
    isOriginal: true,
    isImported: false,
    isPublished: Boolean(dataset.isPublished),
  };

  const contentStatus = buildContentStatus(doc);
  doc.isPublished = contentStatus.isComplete && doc.isPublished;

  if (dryRun) {
    return { doc, contentStatus };
  }

  const problem = await Problem.findOneAndUpdate(
    { slug: doc.slug },
    { $set: { ...doc, isPublished: contentStatus.isComplete && doc.isPublished } },
    { upsert: true, returnDocument: "after", runValidators: true }
  );

  if (writeSupplementalCollections === true) {
    const session = await mongoose.startSession();
    await session.withTransaction(async () => {
      await Promise.all([
        ProblemExample.deleteMany({ problemId: problem._id }, { session }),
        ProblemTestCase.deleteMany({ problemId: problem._id }, { session }),
        ProblemStarterCode.deleteMany({ problemId: problem._id }, { session }),
        ProblemHint.deleteMany({ problemId: problem._id }, { session }),
        ProblemEditorial.deleteOne({ problemId: problem._id }, { session }),
      ]);

      if (dataset.examples.length > 0) {
        await ProblemExample.insertMany(
          dataset.examples.map((example, index) => ({
            problemId: problem._id,
            input: example.input || "",
            output: example.output || "",
            explanation: example.explanation || "",
            order: example.order ?? index,
          })),
          { session }
        );
      }

      if (dataset.testCases.length > 0) {
        await ProblemTestCase.insertMany(
          contract.testCases.map((testCase) => ({
            problemId: problem._id,
            input: testCase.input,
            expectedOutput: testCase.output || testCase.expectedOutput,
            isHidden: Boolean(testCase.hidden ?? testCase.isHidden),
            weight: Number(testCase.weight || 1),
          })),
          { session }
        );
      }

      if (dataset.starterCodes.length > 0) {
        await ProblemStarterCode.insertMany(
          dataset.starterCodes.map((starterCode) => ({
            problemId: problem._id,
            language: starterCode.language,
            starterCode: starterCode.starterCode || "",
            functionSignature: starterCode.functionSignature || "",
          })),
          { session }
        );
      }

      if (dataset.hints.length > 0) {
        await ProblemHint.insertMany(
          dataset.hints.map((hint, index) => ({
            problemId: problem._id,
            order: index,
            hint,
          })),
          { session }
        );
      }

      if (dataset.editorial) {
        await ProblemEditorial.create([{ problemId: problem._id, markdown: dataset.editorial }], { session });
      }
    });
    await session.endSession();
  }

  return { problem, contentStatus };
}

async function importDatasetTree(rootDir, options = {}) {
  const { jsonFiles, jsonlFiles } = await findJsonFiles(rootDir);
  const report = [];
  for (const filePath of jsonFiles) {
    try {
      const raw = await readJsonFile(filePath);
      const { data } = transformDataset(raw, filePath);
      const result = await upsertDatasetProblem(data, options);
      report.push({
        filePath,
        slug: data.slug,
        status: "imported",
        published: Boolean(result.problem?.isPublished),
        missing: result.contentStatus?.missing || [],
      });
    } catch (error) {
      report.push({
        filePath,
        status: "failed",
        error: error.message,
      });
    }
  }

  for (const filePath of jsonlFiles) {
    try {
      const rows = await readJsonlFile(filePath);
      for (const row of rows) {
        try {
          const { data } = transformDataset(row.value, filePath);
          const result = await upsertDatasetProblem(data, options);
          report.push({
            filePath,
            slug: data.slug,
            status: "imported",
            published: Boolean(result.problem?.isPublished),
            missing: result.contentStatus?.missing || [],
            lineNumber: row.lineNumber,
          });
        } catch (error) {
          report.push({
            filePath,
            status: "failed",
            lineNumber: row.lineNumber,
            error: error.message,
          });
        }
      }
    } catch (error) {
      report.push({
        filePath,
        status: "failed",
        error: error.message,
      });
    }
  }
  return report;
}

module.exports = {
  datasetSchema,
  transformDataset,
  importDatasetContent,
  importDatasetTree,
  upsertDatasetProblem,
};
