require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const mongoose = require("mongoose");
const Problem = require("../models/Problem");
const { parseCppSignature, convertInput, describeContract } = require("../services/stdinContract");

async function main() {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is missing");
  await mongoose.connect(process.env.MONGO_URI);
  const problems = await Problem.find({}).lean();
  let migrated = 0;
  let rawFallback = 0;
  for (const problem of problems) {
    // A second run must not try to interpret already-normalized token input
    // as JSON again.
    if (Number(problem.contractVersion || 0) >= 1) continue;
    const signature = parseCppSignature(problem.starterCode?.cpp || "");
    const convertedCases = [];
    let failed = null;
    for (const testCase of problem.testCases || []) {
      const result = convertInput(testCase.input, signature);
      if (!result.ok) { failed = result.reason; break; }
      convertedCases.push({ ...testCase, input: result.input });
    }
    const useRawFallback = Boolean(failed);
    const finalCases = useRawFallback
      ? (problem.testCases || []).map((testCase) => ({ ...testCase, input: String(testCase.input || "") }))
      : convertedCases;
    if (useRawFallback) rawFallback += 1;
    await Problem.updateOne({ _id: problem._id }, {
      $set: {
        executionMode: "stdin",
        contractVersion: 2,
        inputFormat: useRawFallback
          ? "Raw stdin contract: each testcase is passed exactly as stored. Read stdin until EOF and print only the answer to stdout."
          : describeContract(signature),
        testCases: finalCases,
      },
    });
    migrated += 1;
  }
  console.log(`Migrated ${migrated} problem contract(s); raw fallback used for ${rawFallback}.`);
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
