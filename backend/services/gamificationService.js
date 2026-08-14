const User = require("../models/User");
const Problem = require("../models/Problem");
const Submission = require("../models/Submission");
const PointTransaction = require("../models/PointTransaction");
const RewardTicket = require("../models/RewardTicket");
const UserSheetUnlock = require("../models/UserSheetUnlock");
const { SHEET_CATALOG } = require("../config/sheets");
const { DIFFICULTY_POINTS, STREAK_MILESTONE_BONUSES, REWARD_COST, getLevel } = require("../config/gamification");
const { toUtcDateKey } = require("../utils/streakDates");
const { refreshStreakAndAchievements, getStreakStats } = require("./streakService");

async function awardPoints({ userId, amount, type, reason, sourceId, idempotencyKey, metadata = {} }) {
    if (!amount) return { awarded: false, amount: 0 };
    const result = await PointTransaction.updateOne(
        { user: userId, idempotencyKey },
        { $setOnInsert: { user: userId, type, amount, reason, sourceId: String(sourceId), idempotencyKey, metadata } },
        { upsert: true }
    );
    if (result.upsertedCount !== 1) return { awarded: false, amount: 0 };
    await User.updateOne({ _id: userId }, { $inc: { points: amount } });
    return { awarded: true, amount };
}

async function ensureRewardTicket(userId) {
    const user = await User.findById(userId).select("points").lean();
    if (user && user.points >= REWARD_COST) {
        await RewardTicket.updateOne(
            { user: userId, type: "DSA_SHEET_UNLOCK" },
            { $setOnInsert: { user: userId, type: "DSA_SHEET_UNLOCK", threshold: REWARD_COST, status: "AVAILABLE" } },
            { upsert: true }
        );
    }
}

async function getTodayDifficultySet(userId, now = new Date()) {
    const today = toUtcDateKey(now);
    const start = new Date(`${today}T00:00:00.000Z`);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 1);
    const rows = await Submission.find({ user: userId, verdict: "Accepted", createdAt: { $gte: start, $lt: end } }).populate("problem", "difficulty").lean();
    return new Set(rows.map((row) => row.problem?.difficulty).filter(Boolean));
}

async function processAcceptedSubmission({ userId, submissionId, problem }) {
    const firstSolve = await awardPoints({
        userId,
        amount: DIFFICULTY_POINTS[problem.difficulty] || 0,
        type: "PROBLEM_SOLVED",
        reason: `Solved ${problem.difficulty} problem`,
        sourceId: problem._id,
        idempotencyKey: `problem-solved:${String(userId)}:${String(problem._id)}`,
        metadata: { difficulty: problem.difficulty, submissionId: String(submissionId) },
    });
    if (firstSolve.awarded) await User.updateOne({ _id: userId }, { $inc: { problemsSolved: 1 } });

    const streakUpdate = await refreshStreakAndAchievements(userId);
    for (const [milestone, bonus] of Object.entries(STREAK_MILESTONE_BONUSES)) {
        if (streakUpdate.stats.longestStreak >= Number(milestone)) {
            await awardPoints({ userId, amount: bonus, type: "STREAK_BONUS", reason: `${milestone}-day streak bonus`, sourceId: milestone, idempotencyKey: `streak-bonus:${String(userId)}:${milestone}`, metadata: { streak: Number(milestone) } });
        }
    }

    const todayDifficulties = await getTodayDifficultySet(userId);
    const today = toUtcDateKey(new Date());
    if (todayDifficulties.has("Easy") && todayDifficulties.has("Medium") && todayDifficulties.has("Hard")) {
        await awardPoints({ userId, amount: 50, type: "PERFECT_DAY", reason: "Completed Easy, Medium and Hard problems in one day", sourceId: today, idempotencyKey: `perfect-day:${String(userId)}:${today}` });
    }
    if (["Easy", "Medium", "Hard"].every((difficulty) => todayDifficulties.has(difficulty))) {
        await awardPoints({ userId, amount: 30, type: "DAILY_MISSION", reason: "Completed today's difficulty mission", sourceId: today, idempotencyKey: `daily-mission:${String(userId)}:${today}` });
    }
    await ensureRewardTicket(userId);
    return { ...streakUpdate, pointsAwarded: firstSolve.awarded ? firstSolve.amount : 0 };
}

async function getGamificationSummary(userId) {
    await ensureRewardTicket(userId);
    const [user, streak, ticket] = await Promise.all([
        User.findById(userId).select("points streakFreezes freezeCapacity").lean(),
        getStreakStats(userId),
        RewardTicket.findOne({ user: userId, type: "DSA_SHEET_UNLOCK", status: "AVAILABLE" }).lean(),
    ]);
    const difficulties = await getTodayDifficultySet(userId);
    const points = user?.points || 0;
    return {
        points,
        ...getLevel(points),
        currentStreak: streak.currentStreak,
        longestStreak: streak.longestStreak,
        freezeCount: user?.streakFreezes || 0,
        freezeCapacity: user?.freezeCapacity ?? 2,
        todayCompleted: streak.todayCompleted,
        todayAcceptedCount: streak.todayAcceptedCount,
        dailyMission: { Easy: difficulties.has("Easy"), Medium: difficulties.has("Medium"), Hard: difficulties.has("Hard"), complete: ["Easy", "Medium", "Hard"].every((item) => difficulties.has(item)) },
        rewardAvailable: Boolean(ticket),
    };
}

async function getTransactions(userId) { return PointTransaction.find({ user: userId }).sort({ createdAt: -1 }).limit(100).lean(); }

async function getRewardSheets(userId) {
    const owned = new Set((await UserSheetUnlock.find({ user: userId }).select("sheetName").lean()).map((item) => item.sheetName));
    const names = SHEET_CATALOG.map((sheet) => sheet.name).filter((name) => !owned.has(name));
    const counts = await Problem.aggregate([{ $match: { sheet: { $in: names } } }, { $unwind: "$sheet" }, { $match: { sheet: { $in: names } } }, { $group: { _id: "$sheet", problemCount: { $sum: 1 } } }]);
    const countMap = new Map(counts.map((item) => [item._id, item.problemCount]));
    return SHEET_CATALOG.filter((sheet) => names.includes(sheet.name)).map((sheet) => ({ ...sheet, problemCount: countMap.get(sheet.name) || 0 }));
}

async function redeemSheet(userId, sheetName) {
    const normalized = String(sheetName || "").trim();
    const exists = await Problem.exists({ sheet: normalized });
    if (!exists) throw Object.assign(new Error("DSA sheet not found"), { status: 404 });
    if (await UserSheetUnlock.exists({ user: userId, sheetName: normalized })) throw Object.assign(new Error("DSA sheet is already unlocked"), { status: 409 });
    const ticket = await RewardTicket.findOneAndUpdate({ user: userId, type: "DSA_SHEET_UNLOCK", status: "AVAILABLE" }, { $set: { status: "REDEEMED", redeemedAt: new Date(), rewardId: normalized } }, { new: true });
    if (!ticket) throw Object.assign(new Error("No reward ticket is available"), { status: 409 });
    const user = await User.findOneAndUpdate({ _id: userId, points: { $gte: REWARD_COST } }, { $inc: { points: -REWARD_COST } }, { new: true }).select("points");
    if (!user) {
        await RewardTicket.updateOne({ _id: ticket._id }, { $set: { status: "AVAILABLE", redeemedAt: null, rewardId: "" } });
        throw Object.assign(new Error("Insufficient points"), { status: 400 });
    }
    try {
        await UserSheetUnlock.create({ user: userId, sheetName: normalized, source: "POINT_REWARD", pointsSpent: REWARD_COST });
        await PointTransaction.create({ user: userId, type: "REWARD_PURCHASE", amount: -REWARD_COST, reason: `Unlocked DSA sheet: ${normalized}`, sourceId: normalized, idempotencyKey: `sheet-reward:${String(userId)}:${normalized}` });
    } catch (error) {
        await User.updateOne({ _id: userId }, { $inc: { points: REWARD_COST } });
        await RewardTicket.updateOne({ _id: ticket._id }, { $set: { status: "AVAILABLE", redeemedAt: null, rewardId: "" } });
        throw error;
    }
    return { sheetName: normalized, points: user.points };
}

module.exports = { awardPoints, processAcceptedSubmission, getGamificationSummary, getTransactions, getRewardSheets, redeemSheet };
