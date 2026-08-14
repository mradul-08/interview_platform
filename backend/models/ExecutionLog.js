const mongoose = require("mongoose");

const executionLogSchema = new mongoose.Schema(
  {
    executionId: { type: String, required: true, unique: true, index: true },
    type: { type: String, enum: ["run", "submit"], required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    problem: { type: mongoose.Schema.Types.ObjectId, ref: "Problem", required: true, index: true },
    language: { type: String, required: true, index: true },
    sourceCode: { type: String, required: true },
    generatedSource: { type: String, default: "" },
    judge0Request: { type: Object, default: {} },
    judge0Response: { type: Object, default: {} },
    verdict: { type: String, default: "" },
    runtime: { type: String, default: "" },
    memory: { type: String, default: "" },
    stdout: { type: String, default: "" },
    stderr: { type: String, default: "" },
    compileOutput: { type: String, default: "" },
    input: { type: String, default: "" },
    expectedOutput: { type: String, default: "" },
    actualOutput: { type: String, default: "" },
    failedTestcase: { type: Object, default: null },
    executionTimeMs: { type: Number, default: 0 },
    error: { type: String, default: "" },
  },
  { timestamps: true }
);

executionLogSchema.index({ problem: 1, createdAt: -1 });
executionLogSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model("ExecutionLog", executionLogSchema);
