const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const CompanyProfile = require("../models/CompanyProfile");

async function main() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is missing in backend/.env");
  }

  const email = "testcompany@codeverse.dev";
  const password = process.env.ADMIN_PRIVATE_KEY || "TestCompany@123";

  await mongoose.connect(process.env.MONGO_URI);

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await User.findOneAndUpdate(
    { email },
    {
      $set: {
        name: "Test Company",
        email,
        username: "testcompany",
        password: hashedPassword,
        role: "company",
        authProvider: "local",
        emailVerified: true,
        companyName: "Test Company",
        companyWebsite: "https://codeverse.dev",
        companyIndustry: "Technology",
        companyLinkedinUrl: "https://www.linkedin.com/company/codeverse",
        companyVerificationNotes: "Seeded company account for login testing.",
        companyVerified: true,
        registrationNumber: "CV-TEST-001",
        hrName: "CodeVerse HR",
        hrEmail: "hr@codeverse.dev",
      },
    },
    { upsert: true, new: true }
  );

  await CompanyProfile.updateOne(
    { userId: user._id },
    {
      $set: {
        companyName: "Test Company",
        officialEmail: email,
        website: "https://codeverse.dev",
        linkedinPage: "https://www.linkedin.com/company/codeverse",
        registrationNumber: "CV-TEST-001",
        hrName: "CodeVerse HR",
        hrEmail: "hr@codeverse.dev",
        companyLogo: "",
        verified: true,
      },
    },
    { upsert: true }
  );

  console.log(`Seeded test company login:
Email: ${email}
Password: ${password}`);

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error("Seed Test Company Error:", error.message);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});
