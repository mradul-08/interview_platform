const mongoose = require("mongoose");

const studentProfileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    fullName: { type: String, required: true },
    username: { type: String, required: true, unique: true, sparse: true },
    email: { type: String, required: true, unique: true },
    avatar: { type: String, default: "" },
    provider: { type: String, enum: ["local", "google", "github", "linkedin"], default: "local" },
    emailVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("StudentProfile", studentProfileSchema);
