const mongoose = require("mongoose");

const userSheetUnlockSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    sheetName: { type: String, required: true },
    source: { type: String, required: true },
    pointsSpent: { type: Number, required: true },
    unlockedAt: { type: Date, default: Date.now },
}, { timestamps: true });

userSheetUnlockSchema.index({ user: 1, sheetName: 1 }, { unique: true });

module.exports = mongoose.model("UserSheetUnlock", userSheetUnlockSchema);
