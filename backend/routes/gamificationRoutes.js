const express = require("express");
const { protect, requireRole } = require("../middleware/authMiddleware");
const { summary, transactions, rewardSheets, redeem } = require("../controllers/gamificationController");

const router = express.Router();
router.use(protect, requireRole("student"));
router.get("/summary", summary);
router.get("/transactions", transactions);
router.get("/rewards/dsa-sheets", rewardSheets);
router.post("/rewards/dsa-sheet/redeem", redeem);

module.exports = router;
