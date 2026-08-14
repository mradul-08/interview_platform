require("dotenv").config();
const mongoose = require("mongoose");
const Problem = require("../models/Problem");
const { importCodeforces, importLeetCode, upsertProblems } = require("../services/ImportService");
const { problems: bundledProblems } = require("../seed/seedProblems");

async function run() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is required");
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log("MongoDB connected");

  const before = await Problem.countDocuments();
  console.log(`Starting with ${before} problems`);

  const results = [];
  results.push(await importCodeforces().catch((error) => ({ error: error.message })));
  results.push(await importLeetCode().catch((error) => ({ error: error.message })));
  results.push(await upsertProblems(bundledProblems).catch((error) => ({ error: error.message })));

  const after = await Problem.countDocuments();
  console.log("Import results:", JSON.stringify(results, null, 2));
  console.log(`Finished with ${after} total problems`);

  if (after < 1000) {
    console.warn(`Only ${after} problems found. Add more imported/seeded data to reach 1000.`);
  } else {
    console.log("1000-problem setup is ready.");
  }

  await mongoose.disconnect();
}

run().catch(async (error) => {
  console.error("Seed 1000 error:", error.message);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
