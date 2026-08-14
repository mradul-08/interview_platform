require("dotenv").config();
const fs = require("fs/promises");
const path = require("path");

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

function getObjectField(obj, keys, fallback = "") {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(obj, key) && String(obj[key] || "").trim() !== "") {
      return obj[key];
    }
  }
  return fallback;
}

function toArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return String(value)
    .split(/[,|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function safeJson(value, fallback) {
  const text = String(value || "").trim();
  if (!text) return fallback;
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

function rowToProblem(record) {
  return {
    title: getObjectField(record, ["title", "Title"]),
    slug: getObjectField(record, ["slug", "Slug"]),
    description: getObjectField(record, ["description", "Description"]),
    difficulty: getObjectField(record, ["difficulty", "Difficulty"], "Medium"),
    inputFormat: getObjectField(record, ["inputFormat", "input_format", "InputFormat"]),
    outputFormat: getObjectField(record, ["outputFormat", "output_format", "OutputFormat"]),
    constraints: toArray(getObjectField(record, ["constraints", "Constraints"])),
    examples: safeJson(getObjectField(record, ["examples", "Examples"], "[]"), []),
    starterCodes: safeJson(getObjectField(record, ["starterCodes", "StarterCodes"], "[]"), []),
    testCases: safeJson(getObjectField(record, ["testCases", "TestCases"], "[]"), []),
    hints: toArray(getObjectField(record, ["hints", "Hints"])),
    editorial: getObjectField(record, ["editorial", "Editorial"]),
    tags: toArray(getObjectField(record, ["tags", "Tags"])),
    companies: toArray(getObjectField(record, ["companies", "Companies"])),
    sheets: toArray(getObjectField(record, ["sheets", "Sheets"])),
    source: getObjectField(record, ["source", "Source"], "dataset"),
    sourceId: getObjectField(record, ["sourceId", "SourceId"], ""),
    timeLimit: Number(getObjectField(record, ["timeLimit", "TimeLimit"], 2000)),
    memoryLimit: Number(getObjectField(record, ["memoryLimit", "MemoryLimit"], 256)),
    isPublished: String(getObjectField(record, ["isPublished", "Published"], "true")).toLowerCase() !== "false",
    createdBy: getObjectField(record, ["createdBy", "CreatedBy"], "system"),
  };
}

async function main() {
  const input = process.argv[2] || path.join(__dirname, "..", "datasets", "master_problems.csv");
  const output = process.argv[3] || path.join(__dirname, "..", "datasets", "problems.jsonl");
  const raw = await fs.readFile(input, "utf8");
  const rows = parseCsv(raw);
  if (rows.length === 0) {
    throw new Error("CSV file is empty");
  }

  const [header, ...dataRows] = rows;
  const lowerHeader = header.map((h) => String(h || "").trim());
  const jsonl = dataRows
    .map((row) => {
      const mapped = {};
      for (let i = 0; i < lowerHeader.length; i++) {
        mapped[lowerHeader[i]] = row[i] ?? "";
      }
      return mapped;
    })
    .map((record) => {
      const normalized = rowToProblem(record);
      return JSON.stringify(normalized);
    })
    .join("\n");

  await fs.writeFile(output, jsonl + "\n", "utf8");
  console.log(`Converted ${dataRows.length} rows to ${output}`);
}

main().catch((error) => {
  console.error("Conversion failed:", error.message);
  process.exit(1);
});
