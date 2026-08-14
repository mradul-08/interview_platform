require("dotenv").config({ path: require("path").join(__dirname, "../.env") });

const mongoose = require("mongoose");

async function main() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is not configured in backend/.env");
  }

  await mongoose.connect(process.env.MONGO_URI);
  const users = mongoose.connection.collection("users");

  // The old index was created as a normal unique index. Remove it before
  // removing legacy null values and rebuilding the intended sparse index.
  try {
    await users.dropIndex("username_1");
    console.log("Dropped legacy users.username_1 index.");
  } catch (error) {
    if (error.codeName !== "IndexNotFound" && error.code !== 27) throw error;
    console.log("Legacy username index was not present.");
  }

  const cleanup = await users.updateMany(
    { username: null },
    { $unset: { username: "" } }
  );
  console.log(`Removed username:null from ${cleanup.modifiedCount} user(s).`);

  await users.createIndex(
    { username: 1 },
    { name: "username_1", unique: true, sparse: true }
  );
  console.log("Created unique sparse users.username_1 index.");
}

main()
  .then(() => mongoose.disconnect())
  .catch(async (error) => {
    console.error("User username index migration failed:", error.message);
    await mongoose.disconnect().catch(() => {});
    process.exitCode = 1;
  });
