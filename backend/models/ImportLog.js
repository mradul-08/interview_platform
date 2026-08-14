const mongoose = require("mongoose");

const importLogSchema = new mongoose.Schema(
    {
        runId: { type: mongoose.Schema.Types.ObjectId, ref: "ImportRun", index: true, required: true },
        source: { type: String, index: true, required: true },
        level: { type: String, enum: ["info", "warn", "error"], default: "info", index: true },
        step: { type: String, default: "" },
        message: { type: String, required: true },
        details: { type: Object, default: {} },
    },
    { timestamps: true }
);

importLogSchema.index({ runId: 1, createdAt: -1 });

module.exports = mongoose.model("ImportLog", importLogSchema);
