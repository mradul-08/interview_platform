const mongoose = require("mongoose");

const problemExampleSchema = new mongoose.Schema(
  {
    problemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Problem",
      required: true,
      index: true,
    },
    input: {
      type: String,
      default: "",
    },
    output: {
      type: String,
      default: "",
    },
    explanation: {
      type: String,
      default: "",
    },
    order: {
      type: Number,
      default: 0,
      index: true,
    },
  },
  { timestamps: true }
);

problemExampleSchema.index({ problemId: 1, order: 1 }, { unique: true });

module.exports = mongoose.model("ProblemExample", problemExampleSchema);
