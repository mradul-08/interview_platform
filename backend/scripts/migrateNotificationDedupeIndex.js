require("dotenv").config({ path: require("path").join(__dirname, "..", ".env"), override: true });

const mongoose = require("mongoose");
const Notification = require("../models/Notification");

async function migrate() {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is missing from backend/.env");
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });

  const indexes = await Notification.collection.indexes();
  const dedupeIndex = indexes.find((index) => index.name === "dedupeKey_1");
  if (dedupeIndex && (!dedupeIndex.unique || !dedupeIndex.sparse)) {
    await Notification.collection.dropIndex("dedupeKey_1");
    await Notification.collection.createIndex(
      { dedupeKey: 1 },
      { unique: true, sparse: true, name: "dedupeKey_1" }
    );
    console.log("Rebuilt dedupeKey_1 as a sparse unique index.");
  } else {
    console.log("dedupeKey_1 is already a sparse unique index; no change needed.");
  }

  const cleanup = await Notification.updateMany(
    { dedupeKey: null },
    { $unset: { dedupeKey: "" } }
  );
  console.log(`Removed explicit null dedupe keys: ${cleanup.modifiedCount || 0}`);
}

migrate()
  .catch((error) => {
    console.error("Notification index migration failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => {});
  });
