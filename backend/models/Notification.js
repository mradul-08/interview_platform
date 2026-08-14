const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  type: { type: String, enum: ["direct_message", "leaderboard", "system"], default: "system" },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  body: { type: String, required: true, trim: true, maxlength: 280 },
  readAt: { type: Date, default: null },
}, { timestamps: true });

notificationSchema.index({ userId: 1, readAt: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
