const mongoose = require("mongoose");

const competitiveTestSchema = new mongoose.Schema({
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: "GeminiStudyGroup", required: true, index: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true, trim: true, maxlength: 140 },
  description: { type: String, trim: true, maxlength: 2000, default: "" },
  type: { type: String, enum: ["DSA", "APTITUDE", "DSA_APTITUDE"], required: true },
  problemIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Problem" }],
  aptitudeQuestionIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "AptitudeQuestion" }],
  participantIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  scheduledAt: { type: Date, required: true },
  durationSeconds: { type: Number, required: true, min: 60, max: 86400 },
  startedAt: { type: Date, default: null },
  endsAt: { type: Date, default: null },
  status: { type: String, enum: ["SCHEDULED", "LIVE", "ENDED", "RESULTS_AVAILABLE"], default: "SCHEDULED", index: true },
  scoring: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

competitiveTestSchema.index({ groupId: 1, scheduledAt: 1 });
competitiveTestSchema.index({ status: 1, scheduledAt: 1 });

module.exports = mongoose.models.CompetitiveTest || mongoose.model("CompetitiveTest", competitiveTestSchema);
