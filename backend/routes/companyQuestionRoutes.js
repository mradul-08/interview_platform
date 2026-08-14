const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { getQuestions, getByCompany, searchQuestions, getCompanyList } = require("../controllers/companyQuestionController");

const router = express.Router();

router.get("/companies", protect, getCompanyList);
router.get("/search", protect, searchQuestions);
router.get("/company/:company", protect, getByCompany);
router.get("/", protect, getQuestions);

module.exports = router;