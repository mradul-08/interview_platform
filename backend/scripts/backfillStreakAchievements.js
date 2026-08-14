require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const User = require("../models/User");
const { refreshStreakAndAchievements } = require("../services/streakService");

async function run() {
    if (!process.env.MONGO_URI) throw new Error("MONGO_URI is missing");
    await mongoose.connect(process.env.MONGO_URI);
    const users = await User.find({ role: "student" }).select("_id").lean();
    for (const user of users) await refreshStreakAndAchievements(user._id);
    console.log(`Recalculated streaks for ${users.length} student account(s).`);
    await mongoose.disconnect();
}

run().catch(async (error) => {
    console.error(error);
    await mongoose.disconnect().catch(() => {});
    process.exitCode = 1;
});
