const mongoose = require("mongoose");

const rewardTicketSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, required: true },
    threshold: { type: Number, required: true },
    status: { type: String, enum: ["AVAILABLE", "REDEEMED"], default: "AVAILABLE" },
    createdAt: { type: Date, default: Date.now },
    redeemedAt: { type: Date, default: null },
    rewardId: { type: String, default: "" },
}, { timestamps: true });

rewardTicketSchema.index({ user: 1, type: 1 }, { unique: true });
rewardTicketSchema.index({ user: 1, status: 1 });

module.exports = mongoose.model("RewardTicket", rewardTicketSchema);
