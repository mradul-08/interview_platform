const Submission = require("../models/Submission");
const User = require("../models/User");
const UserAchievement = require("../models/UserAchievement");
const { BADGE_DEFINITIONS } = require("../config/badges");
const { toUtcDateKey, addDays } = require("../utils/streakDates");

function uniqueSortedKeys(submissions) {
    return [...new Set(submissions.map((submission) => toUtcDateKey(submission.createdAt)))].sort();
}

function calculateStreakStats(activeDates, now = new Date(), acceptedCount = 0, acceptedByDate = {}) {
    const active = new Set(activeDates);
    const today = toUtcDateKey(now);
    const todayCompleted = active.has(today);
    const todayAcceptedCount = acceptedByDate[today] || 0;
    const startKey = todayCompleted ? today : addDays(today, -1);
    let currentStreak = 0;
    let cursor = startKey;
    while (active.has(cursor)) {
        currentStreak += 1;
        cursor = addDays(cursor, -1);
    }
    const currentStreakStart = currentStreak ? addDays(startKey, -(currentStreak - 1)) : null;

    let longestStreak = 0;
    let longestStreakStart = null;
    let longestStreakEnd = null;
    const streakHistory = [];
    let runStart = null;
    let previous = null;
    for (const key of activeDates) {
        if (!runStart || (previous && key !== addDays(previous, 1))) {
            if (runStart && previous) streakHistory.push({ days: Math.round((new Date(`${previous}T00:00:00Z`) - new Date(`${runStart}T00:00:00Z`)) / 86400000) + 1, start: runStart, end: previous });
            runStart = key;
        }
        const runLength = Math.round((new Date(`${key}T00:00:00Z`) - new Date(`${runStart}T00:00:00Z`)) / 86400000) + 1;
        if (runLength > longestStreak) {
            longestStreak = runLength;
            longestStreakStart = runStart;
            longestStreakEnd = key;
        }
        previous = key;
    }
    if (runStart && previous) streakHistory.push({ days: Math.round((new Date(`${previous}T00:00:00Z`) - new Date(`${runStart}T00:00:00Z`)) / 86400000) + 1, start: runStart, end: previous });
    streakHistory.sort((a, b) => b.days - a.days || b.end.localeCompare(a.end));

    return {
        currentStreak,
        longestStreak,
        activeDays: activeDates.length,
        totalAcceptedSubmissions: acceptedCount,
        todayCompleted,
        todayAcceptedCount,
        currentStreakStart,
        longestStreakStart,
        longestStreakEnd,
        streakHistory,
        activeDates,
    };
}

async function getStreakStats(userId, now = new Date()) {
    const submissions = await Submission.find({ user: userId, verdict: "Accepted" })
        .select("createdAt")
        .sort({ createdAt: 1 })
        .lean();
    const acceptedByDate = {};
    for (const submission of submissions) {
        const key = toUtcDateKey(submission.createdAt);
        acceptedByDate[key] = (acceptedByDate[key] || 0) + 1;
    }
    return calculateStreakStats(uniqueSortedKeys(submissions), now, submissions.length, acceptedByDate);
}

async function unlockEligibleBadges(userId, stats) {
    const achievedStreak = Math.max(stats.currentStreak, stats.longestStreak);
    const newlyUnlocked = [];
    for (const badge of BADGE_DEFINITIONS.filter((item) => item.requirement <= achievedStreak)) {
        try {
            const result = await UserAchievement.updateOne(
                { user: userId, badgeId: badge.id },
                { $setOnInsert: { user: userId, badgeId: badge.id, unlockedAt: new Date(), metadata: { streak: badge.requirement } } },
                { upsert: true }
            );
            if (result.upsertedCount === 1) newlyUnlocked.push(badge);
        } catch (error) {
            if (error?.code !== 11000) throw error;
        }
    }
    return newlyUnlocked;
}

async function refreshStreakAndAchievements(userId) {
    const stats = await getStreakStats(userId);
    const newlyUnlocked = await unlockEligibleBadges(userId, stats);
    await User.updateOne({ _id: userId }, { $set: { currentStreak: stats.currentStreak, longestStreak: stats.longestStreak } });
    return { stats, newlyUnlocked };
}

async function getYearCalendar(userId, year) {
    const start = new Date(Date.UTC(year, 0, 1));
    const end = new Date(Date.UTC(year + 1, 0, 1));
    const submissions = await Submission.find({ user: userId, verdict: "Accepted", createdAt: { $gte: start, $lt: end } }).select("createdAt").lean();
    const counts = {};
    for (const submission of submissions) {
        const key = toUtcDateKey(submission.createdAt);
        counts[key] = (counts[key] || 0) + 1;
    }
    return Object.entries(counts).map(([date, acceptedCount]) => ({ date, acceptedCount, isActive: true }));
}

module.exports = { uniqueSortedKeys, calculateStreakStats, getStreakStats, unlockEligibleBadges, refreshStreakAndAchievements, getYearCalendar };
