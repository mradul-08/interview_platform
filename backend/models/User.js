const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        password: {
            type: String,
            required: function () {
                return this.authProvider === "local";
            },
        },
        role: {
            type: String,
            enum: ["student", "company", "admin"],
            default: "student",
            required: true,
        },
        authProvider: {
            type: String,
            enum: ["local", "google", "github", "linkedin"],
            default: "local",
        },
        googleId: { type: String, default: null },
        githubId: { type: String, default: null },
        linkedinId: { type: String, default: null },
        emailVerified: { type: Boolean, default: false },
        emailVerificationTokenHash: { type: String, default: "" },
        emailVerificationTokenExpiresAt: { type: Date, default: null },
        passwordResetTokenHash: { type: String, default: "" },
        passwordResetTokenExpiresAt: { type: Date, default: null },

        // Profile fields (Phase 2 will expand these)
        // Optional usernames must be omitted when unavailable. A sparse unique
        // index ignores missing fields, but it still indexes explicit nulls.
        username: { type: String, trim: true, default: undefined, unique: true, sparse: true },
        avatarUrl: { type: String, default: "" },
        bio: { type: String, default: "" },
        college: { type: String, default: "" },
        degree: { type: String, default: "" },
        branch: { type: String, default: "" },
        graduationYear: { type: String, default: "" },
        skills: [{ type: String }],
        githubUrl: { type: String, default: "" },
        linkedinUrl: { type: String, default: "" },
        portfolioUrl: { type: String, default: "" },

        // Stats
        problemsSolved: { type: Number, default: 0 },
        currentStreak: { type: Number, default: 0 },
        longestStreak: { type: Number, default: 0 },
        points: { type: Number, default: 0 },
        streakFreezes: { type: Number, default: 0, min: 0, max: 2 },
        freezeCapacity: { type: Number, default: 2, min: 0, max: 2 },
        rank: { type: Number, default: 0 },
        mockInterviewsAttended: { type: Number, default: 0 },

        // Company fields
        companyName: { type: String, default: "" },
        companyWebsite: { type: String, default: "" },
        companyIndustry: { type: String, default: "" },
        companyLinkedinUrl: { type: String, default: "" },
        companyVerified: { type: Boolean, default: false },
        companyVerificationNotes: { type: String, default: "" },
        registrationNumber: { type: String, default: "" },
        hrName: { type: String, default: "" },
        hrEmail: { type: String, default: "" },

        tokenVersion: { type: Number, default: 0 },
        refreshTokenHash: { type: String, default: "" },
        refreshTokenExpiresAt: { type: Date, default: null },
        activeSessions: [
            {
                sessionId: { type: String, required: true },
                userAgent: { type: String, default: "" },
                ipAddress: { type: String, default: "" },
                createdAt: { type: Date, default: Date.now },
                lastSeenAt: { type: Date, default: Date.now },
                revokedAt: { type: Date, default: null },
            },
        ],
        adminResetTokenHash: { type: String, default: "" },
        adminResetTokenExpiresAt: { type: Date, default: null },
    },
    { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
