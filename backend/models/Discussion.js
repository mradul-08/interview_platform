const mongoose = require("mongoose");

const discussionSchema = new mongoose.Schema(
  {
    problem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Problem",
      required: true,
      index: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    body: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 5000,
    },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Discussion",
      default: null,
      index: true,
    },
    likes: {
      type: Number,
      default: 0,
    },
    isSolution: {
      type: Boolean,
      default: false,
    },
    isPinned: {
      type: Boolean,
      default: false,
    },
    isModerated: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

discussionSchema.index({ problem: 1, createdAt: -1 });
discussionSchema.index({ problem: 1, parent: 1, createdAt: 1 });

module.exports = mongoose.model("Discussion", discussionSchema);
