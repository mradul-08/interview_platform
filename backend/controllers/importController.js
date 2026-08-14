const {
    createOrUpdateProblem,
} = require("../services/ImportService");
const { fetchCodeforcesProblemsWithRetry } = require("../services/CodeforcesImporter");
const { fetchLeetCodeProblemsWithRetry } = require("../services/LeetCodeImporter");
const { generateProblem } = require("../services/LocalAiGenerator");
const ImportRun = require("../models/ImportRun");
const ImportLog = require("../models/ImportLog");
const ImportState = require("../models/ImportState");
const { enqueueImport } = require("../services/importQueue");
const { parseImportRequest } = require("../validation/importValidation");
const { importDatasetContent } = require("../services/problemDatasetImporter");

const importCodeforcesHandler = async (req, res) => {
    try {
        const payload = parseImportRequest({ source: "codeforces", requestedBy: req.user?._id?.toString(), meta: req.body || {} });
        const result = await enqueueImport(payload);
        res.json({ success: true, ...result });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message || "Codeforces import failed" });
    }
};

const importLeetCodeHandler = async (req, res) => {
    try {
        const payload = parseImportRequest({ source: "leetcode", requestedBy: req.user?._id?.toString(), meta: req.body || {} });
        const result = await enqueueImport(payload);
        res.json({ success: true, ...result });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message || "LeetCode import failed" });
    }
};

const syncHandler = async (req, res) => {
    try {
        const payload = parseImportRequest({ source: "sync", requestedBy: req.user?._id?.toString(), meta: req.body || {} });
        const result = await enqueueImport(payload);
        res.json({ success: true, ...result });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message || "Sync failed" });
    }
};

const dedupeHandler = async (req, res) => {
    try {
        const result = { message: "Duplicate cleanup is handled by unique indexes and upsert keys." };
        res.json({ success: true, ...result });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message || "Duplicate cleanup failed" });
    }
};

const debugCodeforcesHandler = async (req, res) => {
    try {
        const problems = await fetchCodeforcesProblemsWithRetry(2);
        res.json({
            success: true,
            source: "codeforces",
            fetched: problems.length,
            sample: problems.slice(0, 3).map((p) => ({
                title: p.title,
                slug: p.slug,
                sourceId: p.sourceId,
                difficulty: p.difficulty,
            })),
        });
    } catch (error) {
        res.status(500).json({ success: false, source: "codeforces", message: error.message });
    }
};

const debugLeetCodeHandler = async (req, res) => {
    try {
        const problems = await fetchLeetCodeProblemsWithRetry(2);
        res.json({
            success: true,
            source: "leetcode",
            fetched: problems.length,
            sample: problems.slice(0, 3).map((p) => ({
                title: p.title,
                slug: p.slug,
                sourceId: p.sourceId,
                difficulty: p.difficulty,
            })),
        });
    } catch (error) {
        res.status(500).json({ success: false, source: "leetcode", message: error.message });
    }
};

const bootstrapBundledHandler = async (req, res) => {
    try {
        const payload = parseImportRequest({ source: "bundled", requestedBy: req.user?._id?.toString(), meta: req.body || {} });
        const result = await enqueueImport(payload);
        res.json({ success: true, ...result });
    } catch (error) {
        res.status(500).json({ success: false, source: "bundled-seed", message: error.message });
    }
};

const generateProblemHandler = async (req, res) => {
    try {
        const draft = await generateProblem(req.body || {});
        res.json({
            success: true,
            draft,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message || "AI generation failed" });
    }
};

const saveGeneratedProblemHandler = async (req, res) => {
    try {
        const problem = await createOrUpdateProblem(req.body || {}, req.user?._id);
        res.json({ success: true, problem });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message || "Save failed" });
    }
};

const getImportRunsHandler = async (req, res) => {
    try {
        const runs = await ImportRun.find({}).sort({ createdAt: -1 }).limit(25);
        res.json({ success: true, items: runs });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message || "Failed to fetch runs" });
    }
};

const getImportRunByIdHandler = async (req, res) => {
    try {
        const run = await ImportRun.findById(req.params.id);
        if (!run) return res.status(404).json({ success: false, message: "Run not found" });
        const logs = await ImportLog.find({ runId: run._id }).sort({ createdAt: 1 });
        res.json({ success: true, run, logs });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message || "Failed to fetch run" });
    }
};

const getImportStateHandler = async (req, res) => {
    try {
        const states = await ImportState.find({}).sort({ updatedAt: -1 });
        res.json({ success: true, items: states });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message || "Failed to fetch import state" });
    }
};

const uploadDatasetHandler = async (req, res) => {
    try {
        const fileName = String(req.body?.fileName || "").trim();
        const content = String(req.body?.content || "");
        if (!fileName) {
            return res.status(400).json({ success: false, message: "fileName is required" });
        }
        if (!content.trim()) {
            return res.status(400).json({ success: false, message: "content is required" });
        }

        const report = await importDatasetContent(fileName, content, { dryRun: false });
        const summary = report.reduce(
            (acc, item) => {
                if (item.status === "imported") acc.imported += 1;
                else acc.failed += 1;
                return acc;
            },
            { imported: 0, failed: 0 }
        );

        res.json({
            success: true,
            fileName,
            imported: summary.imported,
            failed: summary.failed,
            report,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message || "Dataset upload failed" });
    }
};

module.exports = {
    importCodeforcesHandler,
    importLeetCodeHandler,
    syncHandler,
    dedupeHandler,
    debugCodeforcesHandler,
    debugLeetCodeHandler,
    bootstrapBundledHandler,
    generateProblemHandler,
    saveGeneratedProblemHandler,
    getImportRunsHandler,
    getImportRunByIdHandler,
    getImportStateHandler,
    uploadDatasetHandler,
};
