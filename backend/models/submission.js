// backend/models/Submission.js
const mongoose = require("mongoose");

const submissionSchema = new mongoose.Schema(
    {
        user:    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
        problem: { type: mongoose.Schema.Types.ObjectId, ref: "Problem", required: true },
        code:    { type: String, required: true },
        language: {
            type: String,
            enum: ["cpp", "java", "python", "javascript"],
            required: true,
        },
        verdict: {
            type: String,
            enum: [
                "Accepted",
                "Wrong Answer",
                "Runtime Error",
                "Compilation Error",
                "Time Limit Exceeded",
                "Memory Limit Exceeded",
                "Output Limit Exceeded",
                "Input Parsing Error",
                "Internal Error",
                "System Error",
            ],
            required: true,
        },
        runtime:  { type: String, default: "" },  // e.g. "42 ms"
        memory:   { type: String, default: "" },  // e.g. "16.2 MB"
        competitiveTestId: { type: mongoose.Schema.Types.ObjectId, ref: "CompetitiveTest", default: null },
        competitiveTestAttemptId: { type: mongoose.Schema.Types.ObjectId, ref: "CompetitiveTestAttempt", default: null },
    },
    { timestamps: true }
);

submissionSchema.index({ user: 1, createdAt: -1 });
submissionSchema.index({ user: 1, problem: 1, verdict: 1 });
submissionSchema.index({ competitiveTestAttemptId: 1, createdAt: -1 });

module.exports = mongoose.model("Submission", submissionSchema);
