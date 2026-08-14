const { BADGE_DEFINITIONS } = require("../config/badges");
const UserAchievement = require("../models/UserAchievement");
const { getStreakStats, getYearCalendar } = require("../services/streakService");

const getStreak = async (req, res) => {
    try {
        const stats = await getStreakStats(req.user._id);
        const achieved = Math.max(stats.currentStreak, stats.longestStreak);
        const next = BADGE_DEFINITIONS.find((badge) => badge.requirement > achieved);
        res.json({ ...stats, nextMilestone: next?.requirement || null, daysToNextMilestone: next ? Math.max(0, next.requirement - stats.currentStreak) : 0 });
    } catch (error) {
        console.error("Get streak error:", error);
        res.status(500).json({ message: "Unable to load streak data" });
    }
};

const getStreakCalendar = async (req, res) => {
    try {
        const requestedYear = Number.parseInt(req.query.year, 10);
        const year = Number.isInteger(requestedYear) && requestedYear >= 2000 && requestedYear <= 2100 ? requestedYear : new Date().getUTCFullYear();
        res.json({ year, days: await getYearCalendar(req.user._id, year) });
    } catch (error) {
        console.error("Get streak calendar error:", error);
        res.status(500).json({ message: "Unable to load streak calendar" });
    }
};

const getAchievements = async (req, res) => {
    try {
        const owned = await UserAchievement.find({ user: req.user._id }).sort({ unlockedAt: 1 }).lean();
        const byId = new Map(owned.map((item) => [item.badgeId, item]));
        res.json({ achievements: BADGE_DEFINITIONS.map((badge) => ({ ...badge, unlocked: byId.has(badge.id), unlockedAt: byId.get(badge.id)?.unlockedAt || null })) });
    } catch (error) {
        console.error("Get achievements error:", error);
        res.status(500).json({ message: "Unable to load achievements" });
    }
};

module.exports = { getStreak, getStreakCalendar, getAchievements };
