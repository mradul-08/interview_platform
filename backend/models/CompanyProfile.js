const mongoose = require("mongoose");

const companyProfileSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    companyName: { type: String, required: true },
    officialEmail: { type: String, required: true, unique: true },
    website: { type: String, required: true },
    linkedinPage: { type: String, required: true },
    registrationNumber: { type: String, required: true },
    hrName: { type: String, required: true },
    hrEmail: { type: String, required: true },
    companyLogo: { type: String, default: "" },
    verified: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CompanyProfile", companyProfileSchema);
