const mongoose = require("mongoose");

const CATEGORIES = ["Quantitative Aptitude", "Logical Reasoning", "Verbal Ability", "Data Interpretation"];
const TOPICS = {
  "Quantitative Aptitude": ["Number System", "Percentages", "Profit & Loss", "Ratio & Proportion", "Average", "Time & Work", "Pipes & Cisterns", "Time Speed Distance", "Boats & Streams", "Simple Interest", "Compound Interest", "Mixture & Alligation", "Probability", "Permutation & Combination", "Algebra", "Geometry", "Ages", "Data Interpretation"],
  "Logical Reasoning": ["Number Series", "Letter Series", "Coding-Decoding", "Blood Relations", "Direction Sense", "Syllogism", "Statement & Conclusion", "Statement & Assumption", "Seating Arrangement", "Puzzles", "Data Sufficiency", "Analogy", "Classification", "Venn Diagrams", "Logical Deduction"],
  "Verbal Ability": ["Reading Comprehension", "Sentence Correction", "Sentence Completion", "Para Jumbles", "Synonyms", "Antonyms", "Vocabulary", "Grammar", "Error Detection", "Fill in the Blanks"],
  "Data Interpretation": ["Bar Graph", "Line Graph", "Pie Chart", "Table", "Mixed Graph", "Caselet"],
};
const optionSchema = new mongoose.Schema({ key: { type: String, enum: ["A", "B", "C", "D"], required: true }, text: { type: String, required: true } }, { _id: false });
const schema = new mongoose.Schema({
  question: { type: String, required: true, trim: true },
  options: { type: [optionSchema], required: true, validate: { validator: (value) => value.length === 4, message: "Exactly 4 options required" } },
  correctAnswer: { type: String, enum: ["A", "B", "C", "D"], required: true },
  explanation: { type: String, required: true, trim: true }, shortTrick: { type: String, default: "" }, conceptNote: { type: String, default: "" },
  category: { type: String, enum: CATEGORIES, required: true }, topic: { type: String, required: true }, subtopic: { type: String, default: "" },
  difficulty: { type: String, enum: ["Easy", "Medium", "Hard"], required: true }, expectedTime: { type: Number, required: true, min: 10, max: 600 },
  tags: [{ type: String, trim: true }], companyTags: [{ type: String, trim: true }],
  sourceType: { type: String, enum: ["CODEVERSE_ORIGINAL", "LICENSED_DATASET", "PUBLIC_DOMAIN", "VERIFIED_REPORTED_QUESTION", "PATTERN_INSPIRED"], required: true }, sourceReference: { type: String, default: "" },
  qualityStatus: { type: String, enum: ["DRAFT", "REVIEW", "VERIFIED", "PUBLISHED", "ARCHIVED"], default: "DRAFT" },
  contentHash: { type: String, default: "", index: true }, totalAttempts: { type: Number, default: 0 }, totalCorrect: { type: Number, default: 0 }, avgTimeSpent: { type: Number, default: 0 }, version: { type: Number, default: 1 }, createdBy: { type: String, default: "system" },
}, { timestamps: true });
schema.index({ category: 1, topic: 1, difficulty: 1, qualityStatus: 1 }); schema.index({ qualityStatus: 1, difficulty: 1 }); schema.index({ companyTags: 1, qualityStatus: 1 });
module.exports = mongoose.model("AptitudeQuestion", schema); module.exports.CATEGORIES = CATEGORIES; module.exports.TOPICS = TOPICS;
