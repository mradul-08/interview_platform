require("dotenv").config({ path: require("path").join(__dirname, "..", ".env"), override: true });

const mongoose = require("mongoose");
const Conversation = require("../models/Conversation");

async function migrate() {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is missing from backend/.env");

  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
  const legacy = await Conversation.find({
    $or: [{ status: { $exists: false } }, { status: null }],
  }).select("_id participantIds").lean();

  const operations = legacy
    .filter((conversation) => conversation.participantIds?.[0])
    .map((conversation) => ({
      updateOne: {
        filter: {
          _id: conversation._id,
          $or: [{ status: { $exists: false } }, { status: null }],
        },
        update: {
          $set: {
            status: "ACCEPTED",
            requestedBy: conversation.participantIds[0],
            respondedAt: new Date(),
          },
        },
      },
    }));

  const result = operations.length ? await Conversation.bulkWrite(operations) : { modifiedCount: 0 };
  console.log(`Legacy conversations found: ${legacy.length}`);
  console.log(`Legacy conversations updated: ${result.modifiedCount || 0}`);
  console.log("Migration is idempotent: conversations with a status are left unchanged.");
}

migrate()
  .catch((error) => {
    console.error("Conversation status migration failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => {});
  });
