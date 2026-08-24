// backend/controllers/sheetController.js
// No new "Sheet" model. A sheet is just Problem.sheet containing a name
// (e.g. "Blind75", "Striver"). This avoids a second source of truth that
// can drift from the actual problem bank.

const Problem = require("../models/Problem");
const Submission = require("../models/submission");
const { paginatedResponse } = require("../utils/paginate");
const { SHEET_CATALOG, normalizeSheetName } = require("../config/sheets");

// GET /api/sheets
// List every distinct sheet name with aggregate counts. Cheap aggregate,
// safe even if the bank grows — no N+1 queries.
const getSheets = async (req, res) => {
    try {
        const canonicalNames = SHEET_CATALOG.map((sheet) => sheet.name);
        const rows = await Problem.aggregate([
            { $unwind: { path: "$sheet", preserveNullAndEmptyArrays: false } },
            {
                $group: {
                    _id: "$sheet",
                    total: { $sum: 1 },
                    easy: { $sum: { $cond: [{ $eq: ["$difficulty", "Easy"] }, 1, 0] } },
                    medium: { $sum: { $cond: [{ $eq: ["$difficulty", "Medium"] }, 1, 0] } },
                    hard: { $sum: { $cond: [{ $eq: ["$difficulty", "Hard"] }, 1, 0] } },
                },
            },
            { $sort: { _id: 1 } },
        ]);
        const rowMap = new Map(rows.map((row) => [row._id, row]));

        // Per-sheet solved count for the requesting user, in one query (no loop).
        const acceptedProblemIds = await Submission.distinct("problem", {
            user: req.user._id,
            verdict: "Accepted",
        });
        const solvedSet = new Set(acceptedProblemIds.map(String));

        const sheetDocs = await Problem.find({ sheet: { $in: canonicalNames } }).select("_id sheet");
        const sheetProblemMap = new Map();
        for (const doc of sheetDocs) {
            for (const sheetName of doc.sheet || []) {
                const normalized = normalizeSheetName(sheetName);
                if (!canonicalNames.includes(normalized)) continue;
                if (!sheetProblemMap.has(normalized)) sheetProblemMap.set(normalized, []);
                sheetProblemMap.get(normalized).push(doc);
            }
        }

        const sheets = canonicalNames.map((name) => {
            const r = rowMap.get(name) || { total: 0, easy: 0, medium: 0, hard: 0 };
            const ids = sheetProblemMap.get(name) || [];
            const solved = ids.filter((p) => solvedSet.has(String(p._id))).length;
            const meta = SHEET_CATALOG.find((sheet) => sheet.name === name) || { label: name };
            return {
                name,
                label: meta.label,
                total: r.total || 0,
                solved,
                pct: r.total ? Math.round((solved / r.total) * 100) : 0,
                difficulty: { easy: r.easy || 0, medium: r.medium || 0, hard: r.hard || 0 },
            };
        });

        res.status(200).json({ items: sheets, total: sheets.length, page: 1, limit: sheets.length, totalPages: 1 });
    } catch (err) {
        console.error("getSheets error:", err);
        res.status(500).json({ message: "Server Error" });
    }
};

// GET /api/sheets/:name
// Hero stats + category (topic) breakdown for one sheet.
// ?expand=Array&page=&limit=  -> also returns the paginated problem list for that one topic,
// so the frontend never has to load all problems in a sheet just to render one expanded category.
const getSheetByName = async (req, res) => {
    try {
        const { name } = req.params;
        const { expand, page = 1, limit = 20 } = req.query;
        const sheetName = normalizeSheetName(name);

        const all = await Problem.find({ sheet: sheetName })
            .select("_id title slug difficulty topic companies acceptanceRate points");

        if (all.length === 0) {
            return res.status(404).json({ message: `No problems found for sheet "${sheetName}"` });
        }

        const acceptedProblemIds = await Submission.distinct("problem", {
            user: req.user._id,
            verdict: "Accepted",
        });
        const solvedSet = new Set(acceptedProblemIds.map(String));

        const easy = all.filter((p) => p.difficulty === "Easy").length;
        const medium = all.filter((p) => p.difficulty === "Medium").length;
        const hard = all.filter((p) => p.difficulty === "Hard").length;
        const solvedTotal = all.filter((p) => solvedSet.has(String(p._id))).length;

        // Group into categories by primary topic (topic[0]) — every problem has exactly
        // one "home" category even if it carries multiple topic tags.
        const byCategory = {};
        for (const p of all) {
            const cat = (p.topic && p.topic[0]) || "Uncategorized";
            if (!byCategory[cat]) byCategory[cat] = [];
            byCategory[cat].push(p);
        }

        const categories = Object.entries(byCategory)
            .map(([cat, probs]) => {
                const solved = probs.filter((p) => solvedSet.has(String(p._id))).length;
                return {
                    name: cat,
                    total: probs.length,
                    solved,
                    pct: probs.length ? Math.round((solved / probs.length) * 100) : 0,
                };
            })
            .sort((a, b) => b.total - a.total);

        const payload = {
            sheet: sheetName,
            stats: {
                total: all.length,
                solved: solvedTotal,
                pct: all.length ? Math.round((solvedTotal / all.length) * 100) : 0,
                easy,
                medium,
                hard,
            },
            categories,
        };

        // Optional: include one expanded category's problem list, paginated.
        if (expand && byCategory[expand]) {
            const list = byCategory[expand];
            const p = Math.max(1, parseInt(page) || 1);
            const l = Math.max(1, Math.min(100, parseInt(limit) || 20));
            const slice = list.slice((p - 1) * l, p * l).map((prob) => ({
                ...prob.toObject(),
                solved: solvedSet.has(String(prob._id)),
            }));
            payload.expanded = paginatedResponse(slice, list.length, p, l);
            payload.expanded.category = expand;
        }

        res.status(200).json(payload);
    } catch (err) {
        console.error("getSheetByName error:", err);
        res.status(500).json({ message: "Server Error" });
    }
};

module.exports = { getSheets, getSheetByName };
