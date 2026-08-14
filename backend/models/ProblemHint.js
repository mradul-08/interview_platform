const mongoose = require("mongoose");

const problemHintSchema = new mongoose.Schema(
  {
    problemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Problem",
      required: true,
      index: true,
    },
    order: {
      type: Number,
      default: 0,
      index: true,
    },
    hint: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

problemHintSchema.index({ problemId: 1, order: 1 }, { unique: true });

module.exports = mongoose.model("ProblemHint", problemHintSchema);
