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
  lastMessageAt: { type: Date, default: Date.now },
  lastMessagePreview: { type: String, default: "", trim: true, maxlength: 200 },
  lastMessageSenderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true });

conversationSchema.index({ participantIds: 1, lastMessageAt: -1 });

module.exports = mongoose.model("Conversation", conversationSchema);
