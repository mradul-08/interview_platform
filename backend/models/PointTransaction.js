const mongoose = require("mongoose");

const pointTransactionSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, required: true },
    amount: { type: Number, required: true },
    reason: { type: String, required: true },
    sourceId: { type: String, required: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    idempotencyKey: { type: String, required: true },
}, { timestamps: true });

pointTransactionSchema.index({ user: 1, createdAt: -1 });
pointTransactionSchema.index({ user: 1, idempotencyKey: 1 }, { unique: true });

module.exports = mongoose.model("PointTransaction", pointTransactionSchema);
