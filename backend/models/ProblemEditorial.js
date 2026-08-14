const mongoose = require("mongoose");

const problemEditorialSchema = new mongoose.Schema(
  {
    problemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Problem",
      required: true,
      unique: true,
      index: true,
    },
    markdown: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ProblemEditorial", problemEditorialSchema);
