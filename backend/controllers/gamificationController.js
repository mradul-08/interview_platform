const { getGamificationSummary, getTransactions, getRewardSheets, redeemSheet } = require("../services/gamificationService");

async function summary(req, res) {
    try { res.json(await getGamificationSummary(req.user._id)); }
    catch (error) { console.error("Gamification summary error:", error); res.status(500).json({ message: "Unable to load gamification summary" }); }
}

async function transactions(req, res) {
    try { res.json({ items: await getTransactions(req.user._id) }); }
    catch (error) { console.error("Gamification transactions error:", error); res.status(500).json({ message: "Unable to load point history" }); }
}

async function rewardSheets(req, res) {
    try { res.json({ items: await getRewardSheets(req.user._id) }); }
    catch (error) { console.error("Reward sheets error:", error); res.status(500).json({ message: "Unable to load reward sheets" }); }
}

async function redeem(req, res) {
    try {
        const sheetName = String(req.body?.sheetName || "").trim();
        if (!sheetName) return res.status(400).json({ message: "sheetName is required" });
        res.json(await redeemSheet(req.user._id, sheetName));
    } catch (error) {
        console.error("Reward redemption error:", error);
        res.status(error.status || 500).json({ message: error.message || "Unable to redeem reward" });
    }
}

module.exports = { summary, transactions, rewardSheets, redeem };
