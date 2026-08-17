const mongoose = require("mongoose");

const urlSchema = {
  type: String,
  trim: true,
  default: "",
  maxlength: 500,
  validate: {
    validator(value) {
      if (!value) return true;
      try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:";
      } catch {
        return false;
      }
    },
    message: "URL must use http or https",
  },
};

const developerProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    username: {
      type: String,
      trim: true,
      lowercase: true,
      default: undefined,
      unique: true,
      sparse: true,
      index: true,
      validate: {
        validator(value) {
          return !value || /^[a-z0-9](?:[a-z0-9._-]{1,28}[a-z0-9])?$/.test(value);
        },
        message: "Username contains unsupported characters",
      },
    },
    displayName: { type: String, trim: true, default: "", maxlength: 100 },
    headline: { type: String, trim: true, default: "", maxlength: 160 },
    about: { type: String, trim: true, default: "", maxlength: 4000 },
    location: { type: String, trim: true, default: "", maxlength: 120 },
    openToWork: { type: Boolean, default: false },
    avatar: {
      url: { type: String, trim: true, default: "", maxlength: 1000 },
      publicId: { type: String, trim: true, default: "", maxlength: 300 },
    },
    banner: {
      url: { type: String, trim: true, default: "", maxlength: 1000 },
      publicId: { type: String, trim: true, default: "", maxlength: 300 },
    },
    resume: {
      url: { type: String, trim: true, default: "", maxlength: 1000 },
      publicId: { type: String, trim: true, default: "", maxlength: 300 },
      fileName: { type: String, trim: true, default: "", maxlength: 255 },
      uploadedAt: { type: Date, default: null },
    },
    resumeVisibility: {
      type: String,
      enum: ["public", "private"],
      default: "public",
    },
    socialLinks: {
      github: urlSchema,
      linkedin: urlSchema,
      portfolio: urlSchema,
    },
    education: [
      {
        institution: { type: String, trim: true, maxlength: 200, default: "" },
        board: { type: String, trim: true, maxlength: 100, default: "" },
        stream: { type: String, trim: true, maxlength: 100, default: "" },
        degree: { type: String, trim: true, maxlength: 120, default: "" },
        field: { type: String, trim: true, maxlength: 120, default: "" },
        startYear: { type: Number, min: 1900, max: 2200, default: null },
        endYear: { type: Number, min: 1900, max: 2200, default: null },
        percentage: { type: Number, min: 0, max: 100, default: null },
        reportCardUrl: { ...urlSchema },
        current: { type: Boolean, default: false },
      },
    ],
    schoolEducation: {
      tenth: {
        school: { type: String, trim: true, maxlength: 200, default: "" },
        board: { type: String, trim: true, maxlength: 100, default: "" },
        year: { type: Number, min: 1900, max: 2200, default: null },
        percentage: { type: Number, min: 0, max: 100, default: null },
        reportCardUrl: { ...urlSchema },
      },
      twelfth: {
        school: { type: String, trim: true, maxlength: 200, default: "" },
        board: { type: String, trim: true, maxlength: 100, default: "" },
        stream: { type: String, trim: true, maxlength: 100, default: "" },
        year: { type: Number, min: 1900, max: 2200, default: null },
        percentage: { type: Number, min: 0, max: 100, default: null },
        reportCardUrl: { ...urlSchema },
      },
    },
    skills: [
      {
        name: { type: String, trim: true, required: true, maxlength: 60 },
        level: { type: String, trim: true, default: "", maxlength: 30 },
        years: { type: Number, min: 0, max: 80, default: null },
      },
    ],
    developerInfo: {
      primaryRole: { type: String, trim: true, default: "", maxlength: 100 },
      experienceLevel: { type: String, trim: true, default: "", maxlength: 50 },
      preferredLanguages: [{ type: String, trim: true, maxlength: 50 }],
      interests: [{ type: String, trim: true, maxlength: 80 }],
    },
    projects: [
      {
        title: { type: String, trim: true, maxlength: 160, default: "" },
        description: { type: String, trim: true, maxlength: 2000, default: "" },
        technologies: [{ type: String, trim: true, maxlength: 60 }],
        liveUrl: urlSchema,
        sourceUrl: urlSchema,
        imageUrl: urlSchema,
        startDate: { type: Date, default: null },
        endDate: { type: Date, default: null },
        featured: { type: Boolean, default: false },
      },
    ],
    achievements: [
      {
        title: { type: String, trim: true, maxlength: 160, default: "" },
        description: { type: String, trim: true, maxlength: 2000, default: "" },
        issuer: { type: String, trim: true, maxlength: 160, default: "" },
        date: { type: Date, default: null },
        link: { ...urlSchema },
      },
    ],
    certifications: [
      {
        name: { type: String, trim: true, maxlength: 160, default: "" },
        issuer: { type: String, trim: true, maxlength: 160, default: "" },
        credentialUrl: { ...urlSchema },
        issuedAt: { type: Date, default: null },
      },
    ],
    privacy: {
      showEducation: { type: Boolean, default: true },
      showStats: { type: Boolean, default: true },
      showActivity: { type: Boolean, default: true },
    },
    profileVisibility: {
      type: String,
      enum: ["public", "private"],
      default: "public",
    },
  },
  { timestamps: true, strict: true, minimize: false },
);

module.exports = mongoose.model("DeveloperProfile", developerProfileSchema);
