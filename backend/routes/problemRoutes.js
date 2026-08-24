// backend/routes/problemRoutes.js
const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/authMiddleware");
const {
    getProblems,
    getProblemBySlug,
    searchProblems,
    randomProblem,
    getTopics,
    getTagList,
    getCompaniesFromProblems,
    getSourceList,
    getProblemStats,
    getProblemContentAudit,
    repairImportedProblemContent,
    repairImportedProblemById,
    republishCompleteImportedProblems,
    republishImportedProblemById,
    createProblem,
    updateProblem,
    deleteProblem,
    getBookmarks,
    addBookmark,
    removeBookmark,
} = require("../controllers/problemController");

const router = express.Router();

// IMPORTANT: specific routes BEFORE /:slug wildcard
router.get("/stats", protect, getProblemStats);
router.get("/topics", protect, getTopics);
router.get("/tags", protect, getTagList);
router.get("/companies", protect, getCompaniesFromProblems);
router.get("/sources", protect, getSourceList);
router.get("/bookmarks", protect, getBookmarks);
router.get("/audit/content", protect, getProblemContentAudit);
router.post("/audit/repair-imported", protect, requireRole("admin"), repairImportedProblemContent);
router.post("/audit/repair-imported/:id", protect, requireRole("admin"), repairImportedProblemById);
router.post("/audit/republish-complete", protect, requireRole("admin"), republishCompleteImportedProblems);
router.post("/audit/republish-complete/:id", protect, requireRole("admin"), republishImportedProblemById);
router.get("/search", protect, searchProblems);
router.get("/random", protect, randomProblem);
router.get("/", protect, getProblems);
router.get("/slug/:slug", protect, getProblemBySlug);
router.post("/:id/bookmark", protect, addBookmark);
router.delete("/:id/bookmark", protect, removeBookmark);
router.post("/", protect, requireRole("admin"), createProblem);
router.put("/:id", protect, requireRole("admin"), updateProblem);
router.delete("/:id", protect, requireRole("admin"), deleteProblem);

module.exports = router;
