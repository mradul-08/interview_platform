const mongoose = require("mongoose");

const userAchievementSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    badgeId: { type: String, required: true },
    unlockedAt: { type: Date, required: true, default: Date.now },
    metadata: { streak: { type: Number, required: true } },
}, { timestamps: true });

userAchievementSchema.index({ user: 1, badgeId: 1 }, { unique: true });

module.exports = mongoose.model("UserAchievement", userAchievementSchema);
