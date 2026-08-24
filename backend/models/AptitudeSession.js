const mongoose = require("mongoose");
const questionSnapshotSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: [{ key: { type: String, enum: ["A", "B", "C", "D"], required: true }, text: { type: String, required: true } }],
  correctAnswer: { type: String, enum: ["A", "B", "C", "D"], required: true },
  explanation: { type: String, default: "" }, shortTrick: { type: String, default: "" }, conceptNote: { type: String, default: "" },
  expectedTime: { type: Number, default: 0 }, version: { type: Number, default: 1 }, contentHash: { type: String, default: "" },
}, { _id: false });
const sessionQuestionSchema = new mongoose.Schema({ questionId: { type: mongoose.Schema.Types.ObjectId, ref: "AptitudeQuestion", required: true }, order: { type: Number, required: true }, status: { type: String, enum: ["UNANSWERED", "ANSWERED", "MARKED_FOR_REVIEW", "SKIPPED"], default: "UNANSWERED" }, attemptId: { type: mongoose.Schema.Types.ObjectId, ref: "AptitudeAttempt", default: null }, startedAt: { type: Date, default: null }, answeredAt: { type: Date, default: null }, questionSnapshot: { type: questionSnapshotSchema, default: null } }, { _id: false });
const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, mode: { type: String, enum: ["QUICK", "FOCUSED", "PERSONALIZED", "DAILY_MISSION", "COMPANY_PATTERN", "EXAM_SIMULATION", "WEAKNESS_REVISION"], required: true },
  config: { category: { type: String, default: null }, topic: { type: String, default: null }, difficulty: { type: String, enum: ["Easy", "Medium", "Hard", "Mixed", null], default: null }, companyTag: { type: String, default: null }, replay: { type: Boolean, default: false }, totalQuestions: { type: Number, required: true }, timeLimitSeconds: { type: Number, default: null }, negativeMarking: { type: Boolean, default: false }, negativeMarkingFactor: { type: Number, default: 0.25 } },
  questions: [sessionQuestionSchema], status: { type: String, enum: ["ACTIVE", "COMPLETED", "ABANDONED"], default: "ACTIVE" }, currentQuestionIndex: { type: Number, default: 0 }, startedAt: { type: Date, default: Date.now }, expiresAt: { type: Date, default: null }, completedAt: { type: Date, default: null },
  competitiveTestId: { type: mongoose.Schema.Types.ObjectId, ref: "CompetitiveTest", default: null }, competitiveTestAttemptId: { type: mongoose.Schema.Types.ObjectId, ref: "CompetitiveTestAttempt", default: null },
  results: { totalAnswered: Number, totalCorrect: Number, totalIncorrect: Number, totalSkipped: Number, totalXpAwarded: Number, negativeMarks: Number, score: Number, accuracy: Number, avgTimeSpent: Number, timedOut: Boolean, topicBreakdown: mongoose.Schema.Types.Mixed, categoryBreakdown: mongoose.Schema.Types.Mixed, difficultyBreakdown: mongoose.Schema.Types.Mixed },
}, { timestamps: true });
schema.pre("validate", function setExpiry() {
  const questionCount = Number(this.config?.totalQuestions) || this.questions?.length || 0;
  const timeLimitSeconds = Number(this.config?.timeLimitSeconds) || questionCount * 120;
  if (timeLimitSeconds > 0 && !this.expiresAt) {
    this.config.timeLimitSeconds = timeLimitSeconds;
    this.expiresAt = new Date((this.startedAt || new Date()).getTime() + timeLimitSeconds * 1000);
  }
});
schema.index({ userId: 1, createdAt: -1 });
schema.index({ userId: 1, status: 1 });
schema.index({ userId: 1 }, { unique: true, partialFilterExpression: { status: "ACTIVE" } });
module.exports = mongoose.model("AptitudeSession", schema);
