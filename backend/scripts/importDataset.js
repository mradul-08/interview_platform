require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const fs = require("fs/promises");
const path = require("path");
const mongoose = require("mongoose");
const { importDatasetContent, importDatasetTree } = require("../services/problemDatasetImporter");

async function main() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error("MONGO_URI is required");
  }

  const input = process.argv[2] || path.join(__dirname, "..", "datasets");
  const resolved = path.resolve(input);

  await mongoose.connect(mongoUri);
  console.log("MongoDB connected");

  const stat = await fs.stat(resolved);
  let report = [];

  if (stat.isDirectory()) {
    report = await importDatasetTree(resolved);
  } else {
    const content = await fs.readFile(resolved, "utf8");
    report = await importDatasetContent(path.basename(resolved), content);
  }

  const summary = report.reduce(
    (acc, item) => {
      if (item.status === "imported") acc.imported += 1;
      else acc.failed += 1;
      return acc;
    },
    { imported: 0, failed: 0 }
  );

  console.log(`Import complete. Imported: ${summary.imported}, Failed: ${summary.failed}`);
  for (const item of report) {
    if (item.status === "failed") {
      console.error(`[FAIL] ${item.filePath}${item.lineNumber ? `:${item.lineNumber}` : ""} ${item.error}`);
    }
  }

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error("Dataset import failed:", error.message);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
