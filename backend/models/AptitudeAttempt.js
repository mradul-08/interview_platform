const mongoose = require("mongoose");
const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, questionId: { type: mongoose.Schema.Types.ObjectId, ref: "AptitudeQuestion", required: true }, sessionId: { type: mongoose.Schema.Types.ObjectId, ref: "AptitudeSession", default: null },
  submissionId: { type: String, trim: true, maxlength: 100, default: null },
  selectedAnswer: { type: String, enum: ["A", "B", "C", "D", null], default: null }, correctAnswer: { type: String, enum: ["A", "B", "C", "D"], required: true }, isCorrect: { type: Boolean, required: true }, isSkipped: { type: Boolean, default: false }, confidence: { type: String, enum: ["LOW", "MEDIUM", "HIGH", null], default: null },
  timeSpent: { type: Number, default: 0 }, startedAt: { type: Date, default: null }, answeredAt: { type: Date, default: null }, hintsUsed: { type: Number, default: 0 }, answerRevealed: { type: Boolean, default: false }, attemptNumber: { type: Number, default: 1 }, mistakeType: { type: String, enum: ["CONCEPTUAL_ERROR", "CALCULATION_ERROR", "TIME_PRESSURE", "MISREAD_QUESTION", "GUESS", "UNKNOWN", null], default: null }, xpAwarded: { type: Number, default: 0 },
  difficulty: { type: String, enum: ["Easy", "Medium", "Hard"], required: true }, category: { type: String, required: true }, topic: { type: String, required: true },
}, { timestamps: true });
schema.index({ userId: 1, questionId: 1 }); schema.index({ userId: 1, createdAt: -1 }); schema.index({ userId: 1, sessionId: 1 }); schema.index({ userId: 1, topic: 1, createdAt: -1 });
schema.index({ sessionId: 1, questionId: 1 }, { unique: true, partialFilterExpression: { sessionId: { $type: "objectId" } } });
schema.index({ userId: 1, submissionId: 1 }, { unique: true, partialFilterExpression: { submissionId: { $type: "string" } } });
module.exports = mongoose.model("AptitudeAttempt", schema);
