require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const mongoose = require("mongoose");
const Problem = require("../models/Problem");

async function main() {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is missing");
  await mongoose.connect(process.env.MONGO_URI);
  const problems = await Problem.find({}).lean();
  let updated = 0;
  let operations = [];

  for (const problem of problems) {
    const testCases = (problem.testCases || []).map((testCase) => {
      const hidden = Boolean(testCase.hidden || testCase.isHidden);
      const expectedOutput = String(testCase.output || testCase.expectedOutput || "");
      return {
        ...testCase,
        output: expectedOutput,
        expectedOutput,
        hidden,
        isHidden: hidden,
      };
    });
    const changed = JSON.stringify(testCases) !== JSON.stringify(problem.testCases || []);
    if (changed) {
      operations.push({ updateOne: { filter: { _id: problem._id }, update: { $set: { testCases } } } });
      updated += 1;
      if (operations.length >= 500) {
        await Problem.bulkWrite(operations, { ordered: false });
        operations = [];
      }
    }
  }

  if (operations.length > 0) await Problem.bulkWrite(operations, { ordered: false });

  console.log(`Normalized testcase fields for ${updated} problem(s).`);
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
