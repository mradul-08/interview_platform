require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const Problem = require("../models/Problem");

// Usage: node seed/importProblems.js ./seed/data/blind75.normalized.json
const filePath = process.argv[2];
if (!filePath) {
    console.error("Usage: node seed/importProblems.js <path-to-normalized-json>");
    process.exit(1);
}

const raw = fs.readFileSync(path.resolve(filePath), "utf-8");
const problems = JSON.parse(raw);

const POINTS_BY_DIFFICULTY = { Easy: 10, Medium: 20, Hard: 30 };

(async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB Connected ✅");

        let inserted = 0, updated = 0;

        for (const p of problems) {
            const doc = {
                title: p.title,
                slug: p.slug,
                source: p.source || "leetcode",
                sourceId: p.sourceId || p.slug,
                difficulty: p.difficulty,
                topic: p.topic || [],
                tags: p.tags || p.topic || [],
                companies: p.companies || [],
                description: p.description || `${p.title} — full description pending. See source: ${p.sourceUrl || "N/A"}`,
                examples: p.examples || [],
                constraints: p.constraints || [],
                starterCode: p.starterCode || {},
                testCases: p.testCases || [],
                sheet: p.sheet || [],
                sourceUrl: p.sourceUrl || "",
                acceptanceRate: p.acceptanceRate || 0,
                points: POINTS_BY_DIFFICULTY[p.difficulty] || 10,
                isOriginal: p.isOriginal ?? false,
                isImported: p.isImported ?? true,
                isPublished: p.isPublished ?? true,
            };

            const result = await Problem.findOneAndUpdate(
                { slug: doc.slug },
                { $set: doc },
                { upsert: true, new: true, rawResult: true }
            );

            if (result.lastErrorObject?.updatedExisting) updated++;
            else inserted++;
        }

        console.log(`Done ✅ — Inserted: ${inserted}, Updated: ${updated}, Total processed: ${problems.length}`);
        process.exit(0);
    } catch (err) {
        console.error("Import Error ❌", err.message);
        process.exit(1);
    }
})();
