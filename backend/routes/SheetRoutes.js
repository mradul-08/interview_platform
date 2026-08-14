// backend/routes/sheetRoutes.js
const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { getSheets, getSheetByName } = require("../controllers/sheetController");

const router = express.Router();

router.get("/", protect, getSheets);
router.get("/:name", protect, getSheetByName);

module.exports = router;
