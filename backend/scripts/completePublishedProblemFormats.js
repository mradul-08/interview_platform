require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const mongoose = require("mongoose");
const Problem = require("../models/Problem");

const formats = {
  "two-sum": "Print the two zero-based indices whose values add up to target, in any valid order, using the format [i,j].",
  "valid-parentheses": "Print true if every opening bracket is correctly closed and nested; otherwise print false.",
  "merge-two-sorted-lists": "Print the values of the merged sorted list in non-decreasing order using the format [v1,v2,...]. Print [] for an empty list.",
};

async function main() {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is missing");
  await mongoose.connect(process.env.MONGO_URI);
  let updated = 0;
  for (const [slug, outputFormat] of Object.entries(formats)) {
    const result = await Problem.updateOne(
      { slug, isPublished: true },
      { $set: { outputFormat } }
    );
    updated += result.modifiedCount || 0;
  }
  console.log(`Completed output format for ${updated} published problem(s).`);
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
