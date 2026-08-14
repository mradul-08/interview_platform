require("dotenv").config();
const mongoose = require("mongoose");
const { problems } = require("../seed/seedProblems");
const { upsertProblems } = require("../services/ImportService");

async function main() {
    if (!process.env.MONGO_URI) {
        throw new Error("MONGO_URI is required");
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected ✅");

    const result = await upsertProblems(problems);
    console.log(`Bootstrap done ✅ — Fetched: ${problems.length}, Saved: ${result.saved}`);
    await mongoose.disconnect();
}

if (require.main === module) {
    main().catch((err) => {
        console.error("Bootstrap Error ❌", err.message);
        process.exit(1);
    });
}

module.exports = { main };
