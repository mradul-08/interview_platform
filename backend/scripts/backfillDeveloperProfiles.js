require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const mongoose = require("mongoose");
const User = require("../models/User");
const StudentProfile = require("../models/StudentProfile");
const DeveloperProfile = require("../models/DeveloperProfile");

async function run() {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is missing");
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
  const users = await User.find({ role: "student" }).select("name username avatarUrl").lean();
  let created = 0;
  let skipped = 0;
  let usernameConflicts = 0;
  const dryRun = process.argv.includes("--dry-run");
  for (const user of users) {
    const existing = await DeveloperProfile.findOne({ userId: user._id }).select("_id").lean();
    if (existing) {
      skipped += 1;
      continue;
    }
    const legacy = await StudentProfile.findOne({ userId: user._id }).select("fullName username avatar").lean();
    const requestedUsername = String(user.username || legacy?.username || "").trim().toLowerCase();
    let username = requestedUsername || undefined;
    if (username && await DeveloperProfile.exists({ username })) {
      username = undefined;
      usernameConflicts += 1;
    }
    const profile = {
      userId: user._id,
      ...(username ? { username } : {}),
      displayName: user.name || legacy?.fullName || "",
      avatar: { url: user.avatarUrl || legacy?.avatar || "" },
    };
    if (!dryRun) await DeveloperProfile.create(profile);
    created += 1;
  }
  console.log(`Developer profile backfill complete. ${dryRun ? "Dry run. " : ""}Created: ${created}; skipped existing: ${skipped}; username conflicts omitted: ${usernameConflicts}.`);
}

run()
  .catch((error) => {
    console.error("Developer profile backfill failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState) await mongoose.disconnect();
  });
