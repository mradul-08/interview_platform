// backend/models/Problem.js

const mongoose = require("mongoose");

const testCaseSchema = new mongoose.Schema(
  {
    input: {
      type: String,
      required: true,
    },
    output: {
      type: String,
      default: "",
    },
    expectedOutput: {
      type: String,
      default: "",
    },
    hidden: {
      type: Boolean,
      default: false,
    },
    isHidden: {
      type: Boolean,
      default: false,
    },
    weight: {
      type: Number,
      default: 1,
      min: 0,
    },
  },
  { _id: false }
);

const exampleSchema = new mongoose.Schema(
  {
    input: String,
    output: String,
    explanation: String,
  },
  { _id: false }
);

const starterCodeSchema = new mongoose.Schema(
  {
    cpp: {
      type: String,
      default: "",
    },
    java: {
      type: String,
      default: "",
    },
    python: {
      type: String,
      default: "",
    },
    javascript: {
      type: String,
      default: "",
    },
  },
  { _id: false }
);

const problemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },

    source: {
      type: String,
      default: "original",
    },

    sourceId: {
      type: String,
      default: null,
    },

    sourceUrl: {
      type: String,
      default: "",
    },

    difficulty: {
      type: String,
      enum: ["Easy", "Medium", "Hard"],
      required: true,
    },

    rating: {
      type: Number,
      default: null,
    },

    topic: [String],

    tags: [String],

    companies: [String],

    acceptanceRate: {
      type: Number,
      default: 0,
    },

    statement: {
      type: String,
      default: "",
    },

    description: {
      type: String,
      default: "",
    },

    inputFormat: {
      type: String,
      default: "",
    },

    outputFormat: {
      type: String,
      default: "",
    },

    constraints: [String],

    examples: [exampleSchema],

    hints: [String],

    editorial: {
      type: String,
      default: "",
    },

    starterCode: {
      type: starterCodeSchema,
      default: () => ({}),
    },

    testCases: [testCaseSchema],

    timeLimit: {
      type: Number,
      default: 2000,
      min: 1,
    },

    memoryLimit: {
      type: Number,
      default: 256,
      min: 16,
    },

    executionMode: {
      type: String,
      enum: ["stdin"],
      default: "stdin",
    },

    contractVersion: {
      type: Number,
      default: 0,
    },

    testcaseValidator: {
      type: String,
      default: "standard",
    },

    articleLinks: [String],

    videoLinks: [String],

    topicSlug: {
      type: String,
      default: "",
    },

    sheet: [String],

    points: {
      type: Number,
      default: 10,
    },

    createdBy: {
      type: String,
      default: "",
    },

    isOriginal: {
      type: Boolean,
      default: false,
    },

    isImported: {
      type: Boolean,
      default: false,
    },

    isPublished: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    minimize: false,
  }
);

/* ============================
   INDEXES
============================ */

// Full-text search
problemSchema.index({
  title: "text",
  statement: "text",
  tags: "text",
  companies: "text",
  topic: "text",
});

// Filters
problemSchema.index({
  difficulty: 1,
  source: 1,
});

problemSchema.index({
  topic: 1,
});

problemSchema.index({
  tags: 1,
});

problemSchema.index({
  companies: 1,
});

problemSchema.index({
  isPublished: 1,
});

problemSchema.index({
  isImported: 1,
});

problemSchema.index({
  isOriginal: 1,
});

// Prevent duplicate imports
problemSchema.index(
  {
    source: 1,
    sourceId: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      sourceId: { $type: "string", $ne: "" },
    },
  }
);

problemSchema.virtual("statementOrDescription").get(function () {
  return this.statement || this.description || "";
});

module.exports = mongoose.model("Problem", problemSchema);
