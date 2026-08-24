const mongoose = require("mongoose");

const participantSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  lastReadAt: { type: Date, default: null },
}, { _id: false });

const conversationSchema = new mongoose.Schema({
  // Sorted `${lowerId}_${higherId}` pair key guarantees one private thread per pair.
  pairKey: { type: String, required: true, unique: true },
  participantIds: { type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], required: true, validate: (value) => value.length === 2 },
  participants: { type: [participantSchema], default: [] },
  // Chat-request gate: a conversation starts PENDING until the recipient accepts it.
  // Only ACCEPTED conversations may exchange messages, attachments, or calls.
  status: { type: String, enum: ["PENDING", "ACCEPTED", "DECLINED"], default: "PENDING" },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  // Optional short intro the requester can attach to a PENDING request so the
  // recipient has context before deciding — cleared once resolved either way
  // (accept turns it into an ordinary open conversation; decline drops it).
  requestNote: { type: String, trim: true, maxlength: 200, default: "" },
  respondedAt: { type: Date, default: null },
  lastMessageAt: { type: Date, default: Date.now },
  lastMessagePreview: { type: String, default: "", trim: true, maxlength: 200 },
  lastMessageSenderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true });

conversationSchema.index({ participantIds: 1, lastMessageAt: -1 });

module.exports = mongoose.model("Conversation", conversationSchema);


