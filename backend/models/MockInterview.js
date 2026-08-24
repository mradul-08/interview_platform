const mongoose = require("mongoose");
const crypto = require("crypto");

const mockInterviewSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    hostId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    participantIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    attendedByIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    scheduledAt: { type: Date, required: true, index: true },
    durationMinutes: { type: Number, default: 45, min: 10, max: 180 },
    joinCode: { type: String, required: true, unique: true, index: true },
    status: { type: String, enum: ["SCHEDULED", "LIVE", "ENDED", "CANCELLED"], default: "SCHEDULED", index: true },
    startedAt: { type: Date, default: null },
    endedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

mockInterviewSchema.statics.generateJoinCode = function generateJoinCode() {
  return crypto.randomBytes(5).toString("hex");
};

mockInterviewSchema.methods.isMember = function isMember(userId) {
  const id = String(userId);
  return String(this.hostId) === id || this.participantIds.some((participantId) => String(participantId) === id);
};

module.exports = mongoose.model("MockInterview", mockInterviewSchema);
