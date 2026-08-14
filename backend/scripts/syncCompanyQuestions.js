// backend/scripts/syncCompanyQuestions.js
require("dotenv").config();
const axios = require("axios");
const mongoose = require("mongoose");
const CompanyQuestion = require("../models/CompanyQuestion");

const REPO = "snehasishroy/leetcode-companywise-interview-questions";
const BRANCH = "master";
const TREE_URL = `https://api.github.com/repos/${REPO}/git/trees/${BRANCH}?recursive=1`;
const RAW_BASE = `https://raw.githubusercontent.com/${REPO}/${BRANCH}/`;

function slugFromUrl(url) {
    // https://leetcode.com/problems/two-sum/ -> two-sum
    const match = url.match(/\/problems\/([a-z0-9-]+)/i);
    return match ? match[1] : url;
}

function parseCsv(content, company, list) {
    const lines = content.split("\n").map((l) => l.trim()).filter(Boolean);
    const rows = [];
    for (const line of lines) {
        // format: id,url,title,difficulty,acceptance%,frequency%
        const parts = line.split(",");
        if (parts.length < 6) continue;
        const [id, url, title, difficulty, acceptance, frequency] = parts;
        rows.push({
            leetcodeId: parseInt(id) || null,
            url: url.trim(),
            slug: slugFromUrl(url.trim()),
            title: title.trim(),
            difficulty: difficulty.trim(),
            acceptanceRate: parseFloat((acceptance || "0").replace("%", "")) || 0,
            frequency: parseFloat((frequency || "0").replace("%", "")) || 0,
            company,
            list,
        });
    }
    return rows;
}

async function sync() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB Connected ✅");

    const { data } = await axios.get(TREE_URL, { headers: { "User-Agent": "codeverse-sync" } });
    const csvFiles = data.tree.filter((item) => item.path.endsWith(".csv"));

    console.log(`Found ${csvFiles.length} CSV files. Syncing...`);

    let totalInserted = 0;
    let skipped = 0;

    for (const file of csvFiles) {
        // path is either "amazon/all.csv" (company folder) or "postmates.csv" (root file)
        const segments = file.path.split("/");
        let company, list;
        if (segments.length === 2) {
            company = segments[0];
            list = segments[1].replace(".csv", "");
        } else {
            company = segments[0].replace(".csv", "");
            list = "all";
        }
        // Skip non-company root files like canonical.csv if you don't want them tagged as a "company"
        if (company === "canonical") continue;

        try {
            const res = await axios.get(RAW_BASE + file.path, { responseType: "text" });
            const rows = parseCsv(res.data, company, list);

            for (const row of rows) {
                await CompanyQuestion.findOneAndUpdate(
                    { company: row.company, list: row.list, slug: row.slug },
                    { $set: row },
                    { upsert: true }
                );
                totalInserted++;
            }
            console.log(`✅ ${file.path} — ${rows.length} rows`);
        } catch (err) {
            skipped++;
            console.log(`⚠️ skipped ${file.path}: ${err.message}`);
        }
    }

    console.log(`Done ✅ — Upserted ${totalInserted} rows, skipped ${skipped} files`);
    process.exit(0);
}

sync().catch((err) => {
    console.error("Sync Error ❌", err.message);
    process.exit(1);
});