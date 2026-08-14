require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "../data/aptitude");
const CATEGORIES = ["Quantitative Aptitude", "Logical Reasoning", "Verbal Ability", "Data Interpretation"];
const DIFFICULTIES = ["Easy", "Medium", "Hard"];
const REQUIRED_COUNTS = { Easy: 15, Medium: 25, Hard: 10 };
const KEY_BY_INDEX = ["A", "B", "C", "D"];

function normalize(value) { return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }
function fail(message) { throw new Error(message); }

function validateQuestion(item, file, index, seenIds, seenText) {
  const prefix = `${file}[${index + 1}]`;
  if (!item || typeof item !== "object") fail(`${prefix}: question must be an object`);
  ["id", "category", "topic", "difficulty", "question", "options", "explanation", "timeTargetSeconds"].forEach((field) => {
    if (item[field] === undefined || item[field] === null || String(item[field]).trim() === "") fail(`${prefix}: missing ${field}`);
  });
  if (!CATEGORIES.includes(item.category)) fail(`${prefix}: invalid category ${item.category}`);
  if (!DIFFICULTIES.includes(item.difficulty)) fail(`${prefix}: invalid difficulty ${item.difficulty}`);
  if (!Array.isArray(item.options) || item.options.length !== 4) fail(`${prefix}: exactly four options required`);
  const optionTexts = item.options.map((option) => typeof option === "string" ? option : option.text);
  if (optionTexts.some((option) => !String(option || "").trim()) || new Set(optionTexts.map(normalize)).size !== 4) fail(`${prefix}: options must be non-empty and unique`);
  const correctIndex = Number.isInteger(item.correctOptionIndex) ? item.correctOptionIndex : KEY_BY_INDEX.indexOf(item.correctAnswer);
  if (correctIndex < 0 || correctIndex > 3) fail(`${prefix}: correct option is invalid`);
  if (seenIds.has(item.id)) fail(`${prefix}: duplicate id ${item.id}`);
  const textKey = normalize(item.question);
  if (seenText.has(textKey)) fail(`${prefix}: duplicate question text`);
  seenIds.add(item.id); seenText.add(textKey);
  const explanation = typeof item.explanation === "string" ? item.explanation : item.explanation?.finalAnswer;
  if (typeof item.explanation === "object") {
    if (!explanation || !String(explanation).trim() || !Array.isArray(item.explanation.stepByStep) || item.explanation.stepByStep.length === 0) fail(`${prefix}: detailed explanation with stepByStep and finalAnswer is required`);
  } else if (!explanation || explanation.trim().length < 20) {
    fail(`${prefix}: explanation is too short`);
  }
  if (!Number.isFinite(Number(item.timeTargetSeconds)) || Number(item.timeTargetSeconds) < 10) fail(`${prefix}: invalid timeTargetSeconds`);
  return { ...item, correctOptionIndex: correctIndex };
}

function loadBank() {
  if (!fs.existsSync(ROOT)) fail(`Missing aptitude data directory: ${ROOT}`);
  const files = fs.readdirSync(ROOT).filter((file) => file.endsWith(".json")).sort();
  const baseFiles = files.filter((file) => !file.includes("supplemental"));
  const requestedCategory = process.argv.find((arg) => arg.startsWith("--category="))?.split("=")[1];
  const selectedFiles = requestedCategory ? files.filter((file) => file.toLowerCase().includes(requestedCategory.toLowerCase())) : files;
  if (requestedCategory && selectedFiles.length === 0) fail(`Expected at least one JSON file for category '${requestedCategory}', found 0`);
  if (!requestedCategory && baseFiles.length !== 4) fail(`Expected exactly four primary aptitude JSON files, found ${baseFiles.length}`);
  const seenIds = new Set();
  const seenText = new Set();
  const report = [];
  for (const file of selectedFiles) {
    const items = JSON.parse(fs.readFileSync(path.join(ROOT, file), "utf8"));
    if (!Array.isArray(items) || items.length !== 50) fail(`${file}: expected exactly 50 questions`);
    const questions = items.map((item, index) => validateQuestion(item, file, index, seenIds, seenText));
    const distribution = Object.fromEntries(DIFFICULTIES.map((difficulty) => [difficulty, questions.filter((item) => item.difficulty === difficulty).length]));
    if (!file.includes("supplemental")) {
      for (const difficulty of DIFFICULTIES) if (distribution[difficulty] !== REQUIRED_COUNTS[difficulty]) fail(`${file}: ${difficulty} count is ${distribution[difficulty]}, expected ${REQUIRED_COUNTS[difficulty]}`);
    }
    report.push({ file, total: questions.length, distribution, supplemental: file.includes("supplemental") });
  }
  return report;
}

if (require.main === module) {
  try {
    const report = loadBank();
    console.log(JSON.stringify({ valid: true, total: report.reduce((sum, item) => sum + item.total, 0), categories: report }, null, 2));
  } catch (error) {
    console.error(`Aptitude validation failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { loadBank, normalize };
