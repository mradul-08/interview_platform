const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: "GeminiStudyGroup", required: true, unique: true },
  currentStreak: { type: Number, default: 0 },
  longestStreak: { type: Number, default: 0 },
  lastQualifiedDate: { type: String, default: null },
  qualifiedTestIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "CompetitiveTest" }],
}, { timestamps: true });

module.exports = mongoose.models.GroupCompetitiveStreak || mongoose.model("GroupCompetitiveStreak", schema);
