const mongoose = require("mongoose");

const problemTestCaseSchema = new mongoose.Schema(
  {
    problemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Problem",
      required: true,
      index: true,
    },
    input: {
      type: String,
      required: true,
    },
    expectedOutput: {
      type: String,
      required: true,
    },
    isHidden: {
      type: Boolean,
      default: false,
    },
    weight: {
      type: Number,
      default: 1,
      min: 0,
    },
  },
  { timestamps: true }
);

problemTestCaseSchema.index({ problemId: 1, isHidden: 1 });

module.exports = mongoose.model("ProblemTestCase", problemTestCaseSchema);
