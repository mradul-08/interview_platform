const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  type: { type: String, enum: ["direct_message", "leaderboard", "study_group_join", "study_group_message", "system"], default: "system" },
  groupId: { type: mongoose.Schema.Types.ObjectId, ref: "GeminiStudyGroup", default: null, index: true },
  groupMessageCount: { type: Number, default: 0 },
  groupMessageSenderIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  groupName: { type: String, trim: true },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  body: { type: String, required: true, trim: true, maxlength: 280 },
  readAt: { type: Date, default: null },
}, { timestamps: true });

notificationSchema.index({ userId: 1, readAt: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
