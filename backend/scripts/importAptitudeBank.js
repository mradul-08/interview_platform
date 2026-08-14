require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const mongoose = require("mongoose");
const AptitudeQuestion = require("../models/AptitudeQuestion");
const { loadBank, normalize } = require("./validateAptitudeBank");

const ROOT = path.join(__dirname, "../data/aptitude");
const keys = ["A", "B", "C", "D"];
const hash = (text) => crypto.createHash("sha256").update(normalize(text)).digest("hex").slice(0, 16);

async function main() {
  const report = loadBank();
  await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
  });
  let inserted = 0; let updated = 0; let skipped = 0;
  for (const item of report) {
    const fileItems = JSON.parse(fs.readFileSync(path.join(ROOT, item.file), "utf8"));
    for (const question of fileItems) {
      const options = question.options.map((option, index) => ({ key: typeof option === "string" ? keys[index] : option.key || keys[index], text: typeof option === "string" ? option : option.text }));
      const correctAnswer = keys[question.correctOptionIndex ?? keys.indexOf(question.correctAnswer)];
      const explanation = typeof question.explanation === "string" ? question.explanation : [question.explanation.concept, ...(question.explanation.stepByStep || []), `Final answer: ${question.explanation.finalAnswer}`, question.explanation.commonMistake ? `Common mistake: ${question.explanation.commonMistake}` : ""].filter(Boolean).join("\n");
      const contentHash = hash(question.question);
      const payload = { question: question.question, options, correctAnswer, explanation, shortTrick: question.explanation?.shortcut || question.shortcut || "", conceptNote: question.explanation?.concept || "", category: question.category, topic: question.topic, subtopic: question.subtopic || "", difficulty: question.difficulty, expectedTime: Number(question.timeTargetSeconds), tags: question.tags || [], sourceType: "CODEVERSE_ORIGINAL", sourceReference: "Aptitude bank review pipeline", qualityStatus: question.qualityStatus || "PUBLISHED", contentHash, version: 1, createdBy: "aptitude-pipeline" };
      const result = await AptitudeQuestion.updateOne({ $or: [{ contentHash }, { question: question.question }] }, { $set: payload }, { upsert: true });
      if (result.upsertedCount) inserted += 1; else if (result.matchedCount) skipped += 1; else updated += 1;
    }
  }
  console.log(JSON.stringify({ validated: report.reduce((sum, item) => sum + item.total, 0), inserted, skipped, updated, note: "Existing DSA/Problem collections were not touched." }, null, 2));
  await mongoose.disconnect();
}

main().catch(async (error) => { console.error(`Aptitude import failed: ${error.message}`); await mongoose.disconnect().catch(() => {}); process.exit(1); });
