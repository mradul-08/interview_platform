const mongoose = require("mongoose");

const problemStarterCodeSchema = new mongoose.Schema(
  {
    problemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Problem",
      required: true,
      index: true,
    },
    language: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    starterCode: {
      type: String,
      default: "",
    },
    functionSignature: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

problemStarterCodeSchema.index({ problemId: 1, language: 1 }, { unique: true });

module.exports = mongoose.model("ProblemStarterCode", problemStarterCodeSchema);
