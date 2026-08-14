const mongoose = require("mongoose");

const importRunSchema = new mongoose.Schema(
    {
        source: { type: String, required: true, index: true },
        mode: { type: String, enum: ["codeforces", "leetcode", "bundled", "sync", "ai"], required: true, index: true },
        status: { type: String, enum: ["queued", "running", "completed", "failed", "partial"], default: "queued", index: true },
        total: { type: Number, default: 0 },
        fetched: { type: Number, default: 0 },
        saved: { type: Number, default: 0 },
        skipped: { type: Number, default: 0 },
        duplicates: { type: Number, default: 0 },
        retries: { type: Number, default: 0 },
        progress: { type: Number, default: 0 },
        startedAt: { type: Date, default: null },
        finishedAt: { type: Date, default: null },
        requestedBy: { type: String, default: "" },
        requestMeta: { type: Object, default: {} },
        error: { type: String, default: "" },
    },
    { timestamps: true }
);

importRunSchema.index({ createdAt: -1 });

module.exports = mongoose.model("ImportRun", importRunSchema);
