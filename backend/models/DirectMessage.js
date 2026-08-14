const mongoose = require("mongoose");

const attachmentSchema = new mongoose.Schema({
  type: { type: String, enum: ["image", "file", "link"], required: true },
  url: { type: String, required: true, trim: true, maxlength: 2000 },
  name: { type: String, default: "", trim: true, maxlength: 200 },
}, { _id: false });

const directMessageSchema = new mongoose.Schema({
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation", required: true, index: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  content: { type: String, default: "", trim: true, maxlength: 2000 },
  attachments: { type: [attachmentSchema], default: [] },
  editedAt: { type: Date, default: null },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });

directMessageSchema.index({ conversationId: 1, createdAt: -1 });

module.exports = mongoose.model("DirectMessage", directMessageSchema);
