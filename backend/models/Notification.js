const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  type: { type: String, enum: ["direct_message", "leaderboard", "study_group_join", "study_group_message", "competitive_test_scheduled", "competitive_test_live", "competitive_test_ended", "competitive_test_results", "system"], default: "system" },
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: "GeminiStudyGroup", default: null, index: true },
  competitiveTestId: { type: mongoose.Schema.Types.ObjectId, ref: "CompetitiveTest", default: null, index: true },
  // Who this notification is about, for types that should deep-link to a
  // specific person rather than a group (direct_message: new message, new
  // chat request, and request-accepted all set this to the other party).
  fromUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  // Sparse unique index must not receive explicit null values.
  dedupeKey: { type: String, trim: true, default: undefined },
  groupMessageCount: { type: Number, default: 0 },
  groupMessageSenderIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  groupName: { type: String, trim: true },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  body: { type: String, required: true, trim: true, maxlength: 280 },
  readAt: { type: Date, default: null },
}, { timestamps: true });

notificationSchema.index({ userId: 1, readAt: 1, createdAt: -1 });
notificationSchema.index({ dedupeKey: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("Notification", notificationSchema);
