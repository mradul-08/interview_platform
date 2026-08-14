// backend/routes/submissionRoutes.js
const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const {
    createSubmission,
    getMySubmissions,
    getSubmissionsForProblem,
} = require("../controllers/submissionController");

const router = express.Router();

router.post("/",                       protect, createSubmission);
router.get("/me",                      protect, getMySubmissions);
router.get("/problem/:problemId",      protect, getSubmissionsForProblem);

module.exports = router;