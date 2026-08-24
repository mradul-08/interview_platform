const mongoose = require("mongoose");

const competitiveTestAttemptSchema = new mongoose.Schema({
  testId: { type: mongoose.Schema.Types.ObjectId, ref: "CompetitiveTest", required: true, index: true },
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: "GeminiStudyGroup", required: true, index: true },
  participantId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  status: { type: String, enum: ["INVITED", "JOINED", "STARTED", "COMPLETED", "PARTIAL", "MISSED"], default: "INVITED" },
  startedAt: { type: Date, default: null },
  endsAt: { type: Date, default: null },
  completedAt: { type: Date, default: null },
  aptitudeSessionId: { type: mongoose.Schema.Types.ObjectId, ref: "AptitudeSession", default: null },
  dsaSubmissionIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Submission" }],
  score: { type: Number, default: null },
  aptitudeScore: { type: Number, default: null },
  dsaScore: { type: Number, default: null },
  scoreBreakdown: { type: mongoose.Schema.Types.Mixed, default: {} },
  completionTimeSeconds: { type: Number, default: null },
  categoryBreakdown: { type: mongoose.Schema.Types.Mixed, default: {} },
  rank: { type: Number, default: null },
}, { timestamps: true });

competitiveTestAttemptSchema.index({ testId: 1, participantId: 1 }, { unique: true });
competitiveTestAttemptSchema.index({ testId: 1, score: -1, completionTimeSeconds: 1 });

module.exports = mongoose.models.CompetitiveTestAttempt || mongoose.model("CompetitiveTestAttempt", competitiveTestAttemptSchema);
