const mongoose = require("mongoose");

const companyQuestionSchema = new mongoose.Schema(
    {
        leetcodeId: { type: Number },
        title: { type: String, required: true },
        slug: { type: String, required: true },       // derived from URL, used to link to your own Problem if it exists
        url: { type: String, required: true },
        company: { type: String, required: true, lowercase: true },
        difficulty: { type: String, enum: ["Easy", "Medium", "Hard"], required: true },
        acceptanceRate: { type: Number, default: 0 },
        frequency: { type: Number, default: 0 },       // 0-100, repo's "how often asked" signal
        list: { type: String, default: "all" },         // "all" | "thirty-days" | "three-months" etc — from filename
        source: { type: String, default: "leetcode-companywise-interview-questions" },
    },
    { timestamps: true }
);

companyQuestionSchema.index({ company: 1, list: 1 });
companyQuestionSchema.index({ slug: 1 });

module.exports = mongoose.model("CompanyQuestion", companyQuestionSchema);