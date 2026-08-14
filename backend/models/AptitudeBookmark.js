const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: "AptitudeQuestion", required: true },
  note: { type: String, default: "" },
}, { timestamps: true });
schema.index({ userId: 1, questionId: 1 }, { unique: true });
module.exports = mongoose.model("AptitudeBookmark", schema);
