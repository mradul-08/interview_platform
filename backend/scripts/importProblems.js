require("dotenv").config();
const path = require("path");
const mongoose = require("mongoose");
const { importDatasetTree } = require("../services/problemDatasetImporter");

async function main() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error("MONGO_URI is missing in backend/.env");
  }

  const rootDir = path.join(__dirname, "..", "datasets");
  await mongoose.connect(mongoUri);
  console.log("MongoDB connected");
  const report = await importDatasetTree(rootDir);
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
      console.error(`[FAIL] ${item.filePath}: ${item.error}`);
    }
  }
  await mongoose.disconnect();
}

main().catch((error) => {
  console.error("Import failed:", error.message);
  process.exit(1);
});
