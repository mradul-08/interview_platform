const mongoose = require("mongoose");

// One row per direction: `blockerId` has blocked `blockedId`. Bidirectional
// checks are done by querying both directions (see directMessageController's
// getRelationship helper) rather than folding this into User to keep the
// permission logic index-friendly and independent of document size.
const blockSchema = new mongoose.Schema({
  blockerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  blockedId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
}, { timestamps: true });

blockSchema.index({ blockerId: 1, blockedId: 1 }, { unique: true });

module.exports = mongoose.model("Block", blockSchema);


