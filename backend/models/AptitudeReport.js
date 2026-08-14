const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: "AptitudeQuestion", required: true },
  reason: { type: String, enum: ["INCORRECT_ANSWER", "AMBIGUOUS", "TYPO", "WRONG_EXPLANATION", "DUPLICATE", "BROKEN"], required: true },
  details: { type: String, default: "", maxlength: 2000 },
  status: { type: String, enum: ["PENDING", "REVIEWED", "RESOLVED", "DISMISSED"], default: "PENDING" },
}, { timestamps: true });
module.exports = mongoose.model("AptitudeReport", schema);
