const mongoose = require("mongoose");

const importStateSchema = new mongoose.Schema(
    {
        source: { type: String, unique: true, index: true, required: true },
        status: { type: String, enum: ["idle", "queued", "running", "completed", "failed"], default: "idle" },
        currentRunId: { type: mongoose.Schema.Types.ObjectId, ref: "ImportRun", default: null },
        lastRunId: { type: mongoose.Schema.Types.ObjectId, ref: "ImportRun", default: null },
        lastProgress: { type: Number, default: 0 },
        lastMessage: { type: String, default: "" },
        lastError: { type: String, default: "" },
    },
    { timestamps: true }
);

module.exports = mongoose.model("ImportState", importStateSchema);
