const express = require("express");
const { protect, requireRole } = require("../middleware/authMiddleware");
const {
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
} = require("../controllers/importController");

const router = express.Router();

router.post("/codeforces", protect, requireRole("admin"), importCodeforcesHandler);
router.post("/leetcode", protect, requireRole("admin"), importLeetCodeHandler);
router.post("/sync", protect, requireRole("admin"), syncHandler);
router.post("/dedupe", protect, requireRole("admin"), dedupeHandler);
router.get("/debug/codeforces", protect, requireRole("admin"), debugCodeforcesHandler);
router.get("/debug/leetcode", protect, requireRole("admin"), debugLeetCodeHandler);
router.post("/bootstrap/bundled", protect, requireRole("admin"), bootstrapBundledHandler);
router.post("/generate/problem", protect, requireRole("admin"), generateProblemHandler);
router.post("/generate/problem/save", protect, requireRole("admin"), saveGeneratedProblemHandler);
router.get("/runs", protect, requireRole("admin"), getImportRunsHandler);
router.get("/runs/:id", protect, requireRole("admin"), getImportRunByIdHandler);
router.get("/state", protect, requireRole("admin"), getImportStateHandler);
router.post("/upload", protect, requireRole("admin"), uploadDatasetHandler);

module.exports = router;
