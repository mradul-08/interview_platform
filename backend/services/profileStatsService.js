const User = require("../models/User");
const Submission = require("../models/submission");
const UserAchievement = require("../models/UserAchievement");
const AptitudeAttempt = require("../models/AptitudeAttempt");
const PointTransaction = require("../models/PointTransaction");
const { getStreakStats } = require("./streakService");

function breakdown(rows, key) {
  const result = {};
  rows.forEach((row) => {
    const value = String(row[key] || "Unknown");
    result[value] ||= { attempted: 0, solved: 0, accuracy: 0 };
    result[value].attempted += 1;
    if (row.solved) result[value].solved += 1;
  });
  Object.values(result).forEach((item) => { item.accuracy = item.attempted ? Math.round((item.solved / item.attempted) * 100) : 0; });
  return Object.entries(result).sort((a, b) => b[1].attempted - a[1].attempted).map(([name, value]) => ({ name, ...value }));
}

function buildHeatmap(items, type) {
  const byDay = {};
  items.forEach((item) => {
    const date = new Date(item.createdAt);
    if (Number.isNaN(date.getTime())) return;
    const key = date.toISOString().slice(0, 10);
    byDay[key] ||= { date: key, total: 0, solved: 0, submissions: 0, attempts: 0 };
    byDay[key].total += 1;
    byDay[key][type === "dsa" ? "submissions" : "attempts"] += 1;
    if (type === "dsa" ? item.verdict === "Accepted" : item.isCorrect) byDay[key].solved += 1;
  });
  return byDay;
}

function fillHeatmap(byDay, days = 365) {
  const result = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(); date.setUTCHours(0, 0, 0, 0); date.setUTCDate(date.getUTCDate() - offset);
    const key = date.toISOString().slice(0, 10);
    result.push(byDay[key] || { date: key, total: 0, solved: 0, submissions: 0, attempts: 0 });
  }
  return result;
}

async function getProfileStats(userId, includeActivity = true) {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 364);
  const [user, totalSubmissions, acceptedSubmissions, solvedProblemIds, submissions, dsaHeatmap, aptitudeHeatmap, dsaRows, aptitudeRows, streak, achievements] = await Promise.all([
    User.findById(userId).select("points rank").lean(),
    Submission.countDocuments({ user: userId }),
    Submission.countDocuments({ user: userId, verdict: "Accepted" }),
    Submission.distinct("problem", { user: userId, verdict: "Accepted" }),
    includeActivity ? Submission.find({ user: userId }).select("verdict createdAt problem").populate("problem", "title slug difficulty topic").sort({ createdAt: -1 }).limit(10).lean() : [],
    includeActivity ? Submission.find({ user: userId, createdAt: { $gte: since } }).select("createdAt verdict").lean() : [],
    includeActivity ? AptitudeAttempt.find({ userId, createdAt: { $gte: since }, isSkipped: false }).select("createdAt isCorrect category").lean() : [],
    Submission.find({ user: userId }).select("verdict createdAt problem").populate("problem", "title slug difficulty topic").lean(),
    AptitudeAttempt.find({ userId, isSkipped: false }).select("createdAt isCorrect category topic difficulty questionId timeSpent").lean(),
    getStreakStats(userId),
    UserAchievement.find({ user: userId }).select("badgeId unlockedAt metadata").sort({ unlockedAt: -1 }).lean(),
  ]);
  const byDay = {};
  const addActivity = (item, type, accepted = false) => {
    const date = new Date(item.createdAt);
    if (Number.isNaN(date.getTime())) return;
    const key = date.toISOString().slice(0, 10);
    byDay[key] ||= { date: key, total: 0, accepted: 0, dsa: 0, aptitude: 0 };
    byDay[key].total += 1;
    byDay[key][type] += 1;
    if (accepted) byDay[key].accepted += 1;
  };
  dsaHeatmap.forEach((item) => addActivity(item, "dsa", item.verdict === "Accepted"));
  aptitudeHeatmap.forEach((item) => addActivity(item, "aptitude", item.isCorrect));
  const activityHeatmap = fillHeatmap(byDay);
  const dsaActivityHeatmap = fillHeatmap(buildHeatmap(dsaHeatmap, "dsa"));
  const aptitudeActivityHeatmap = fillHeatmap(buildHeatmap(aptitudeHeatmap, "aptitude"));
  let currentActivityStreak = 0;
  for (let index = activityHeatmap.length - 1; index >= 0 && activityHeatmap[index].total > 0; index -= 1) currentActivityStreak += 1;
  let longestActivityStreak = 0;
  let runningActivityStreak = 0;
  activityHeatmap.forEach((item) => { runningActivityStreak = item.total > 0 ? runningActivityStreak + 1 : 0; longestActivityStreak = Math.max(longestActivityStreak, runningActivityStreak); });
  const aptitudeAttempts = aptitudeHeatmap.length;
  const aptitudeCorrect = aptitudeHeatmap.filter((item) => item.isCorrect).length;
  const dsaAttempts = dsaHeatmap.length;
  const dsaCorrect = dsaHeatmap.filter((item) => item.verdict === "Accepted").length;
  const dsaTopicRows = dsaRows.flatMap((item) => (Array.isArray(item.problem?.topic) ? item.problem.topic : [item.problem?.topic]).filter(Boolean).map((topic) => ({ key: topic, solved: item.verdict === "Accepted" })));
  const dsaDifficultyRows = dsaRows.map((item) => ({ key: item.problem?.difficulty, solved: item.verdict === "Accepted" })).filter((item) => item.key);
  const aptitudeTopicRows = aptitudeRows.map((item) => ({ key: item.topic, solved: item.isCorrect })).filter((item) => item.key);
  const aptitudeCategoryRows = aptitudeRows.map((item) => ({ key: item.category, solved: item.isCorrect })).filter((item) => item.key);
  return {
    problemsSolved: solvedProblemIds.filter(Boolean).length,
    totalSubmissions,
    acceptedSubmissions,
    currentStreak: currentActivityStreak,
    longestStreak: Math.max(longestActivityStreak, streak.longestStreak || 0),
    points: user?.points || 0,
    rank: user?.rank || 0,
    badges: achievements.map(({ badgeId, unlockedAt, metadata }) => ({ badgeId, unlockedAt, metadata })),
    activityHeatmap,
    dsaHeatmap: dsaActivityHeatmap,
    aptitudeHeatmap: aptitudeActivityHeatmap,
    activitySummary: { aptitudeAttempts, aptitudeCorrect, dsaAttempts, dsaCorrect, totalAttempts: aptitudeAttempts + dsaAttempts, totalCorrect: aptitudeCorrect + dsaCorrect },
    dsaAnalytics: { attempted: totalSubmissions, solved: solvedProblemIds.filter(Boolean).length, acceptedSubmissions, accuracy: totalSubmissions ? Math.round((acceptedSubmissions / totalSubmissions) * 100) : 0, topics: breakdown(dsaTopicRows, "key"), difficulties: breakdown(dsaDifficultyRows, "key") },
    aptitudeAnalytics: { attempted: aptitudeRows.length, solved: aptitudeRows.filter((item) => item.isCorrect).length, accuracy: aptitudeRows.length ? Math.round((aptitudeRows.filter((item) => item.isCorrect).length / aptitudeRows.length) * 100) : 0, topics: breakdown(aptitudeTopicRows, "key"), categories: breakdown(aptitudeCategoryRows, "key"), difficulties: breakdown(aptitudeRows.map((item) => ({ key: item.difficulty, solved: item.isCorrect })), "key") },
    recentActivity: includeActivity ? submissions.map((item) => ({ verdict: item.verdict, createdAt: item.createdAt, problem: item.problem ? { title: item.problem.title, slug: item.problem.slug, difficulty: item.problem.difficulty, topic: item.problem.topic || [] } : null })) : [],
  };
}

async function getProfileActivity(userId, { year, date } = {}) {
  const now = new Date();
  const start = year ? new Date(Date.UTC(Number(year), 0, 1)) : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 364));
  const end = year ? new Date(Date.UTC(Number(year) + 1, 0, 1)) : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  const matchDate = { $gte: start, $lt: end };
  const dayKey = { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } };
  const [dsa, aptitude, points] = await Promise.all([
    Submission.aggregate([{ $match: { user: userId, createdAt: matchDate } }, { $group: { _id: dayKey, submissions: { $sum: 1 }, solved: { $sum: { $cond: [{ $eq: ["$verdict", "Accepted"] }, 1, 0] } } } }]),
    AptitudeAttempt.aggregate([{ $match: { userId, createdAt: matchDate, isSkipped: false } }, { $group: { _id: dayKey, attempted: { $sum: 1 }, solved: { $sum: { $cond: ["$isCorrect", 1, 0] } } } }]),
    PointTransaction.aggregate([{ $match: { user: userId, createdAt: matchDate } }, { $group: { _id: dayKey, points: { $sum: "$amount" } } }]),
  ]);
  const byDay = {};
  const dsaByDay = {};
  const aptitudeByDay = {};
  const ensure = (key) => { byDay[key] ||= { date: key, questionsAttempted: 0, questionsSolved: 0, submissions: 0, dsaActivity: 0, aptitudeActivity: 0, pointsEarned: 0 }; return byDay[key]; };
  const ensureDsa = (key) => { dsaByDay[key] ||= { date: key, total: 0, solved: 0, submissions: 0 }; return dsaByDay[key]; };
  const ensureAptitude = (key) => { aptitudeByDay[key] ||= { date: key, total: 0, solved: 0, attempts: 0 }; return aptitudeByDay[key]; };
  dsa.forEach((item) => { const day = ensure(item._id); day.submissions = item.submissions; day.dsaActivity = item.submissions; day.questionsAttempted += item.submissions; day.questionsSolved += item.solved; const separate = ensureDsa(item._id); separate.total = item.submissions; separate.submissions = item.submissions; separate.solved = item.solved; });
  aptitude.forEach((item) => { const day = ensure(item._id); day.aptitudeActivity = item.attempted; day.questionsAttempted += item.attempted; day.questionsSolved += item.solved; const separate = ensureAptitude(item._id); separate.total = item.attempted; separate.attempts = item.attempted; separate.solved = item.solved; });
  points.forEach((item) => { ensure(item._id).pointsEarned = item.points; });
  const days = [];
  const dsaDays = [];
  const aptitudeDays = [];
  for (let cursor = new Date(start); cursor < end; cursor.setUTCDate(cursor.getUTCDate() + 1)) { const key = cursor.toISOString().slice(0, 10); const day = byDay[key] || ensure(key); day.accuracy = day.questionsAttempted ? Math.round((day.questionsSolved / day.questionsAttempted) * 100) : 0; days.push(day); const dsaDay = dsaByDay[key] || ensureDsa(key); dsaDay.accuracy = dsaDay.total ? Math.round((dsaDay.solved / dsaDay.total) * 100) : 0; dsaDays.push(dsaDay); const aptitudeDay = aptitudeByDay[key] || ensureAptitude(key); aptitudeDay.accuracy = aptitudeDay.total ? Math.round((aptitudeDay.solved / aptitudeDay.total) * 100) : 0; aptitudeDays.push(aptitudeDay); }
  const selectedDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
  let details = null;
  if (selectedDate) {
    const detailStart = new Date(`${selectedDate}T00:00:00.000Z`); const detailEnd = new Date(detailStart); detailEnd.setUTCDate(detailEnd.getUTCDate() + 1);
    const [submissions, attempts, transactions] = await Promise.all([
      Submission.find({ user: userId, createdAt: { $gte: detailStart, $lt: detailEnd } }).select("verdict language problem createdAt").populate("problem", "title difficulty slug topic").lean(),
      AptitudeAttempt.find({ userId, createdAt: { $gte: detailStart, $lt: detailEnd }, isSkipped: false }).select("questionId isCorrect category topic difficulty timeSpent hintsUsed mistakeType createdAt").populate("questionId", "question").lean(),
      PointTransaction.find({ user: userId, createdAt: { $gte: detailStart, $lt: detailEnd } }).select("amount type reason createdAt").lean(),
    ]);
    details = { dsa: { submissions }, aptitude: { attempts }, points: transactions, submissions, attempts, transactions };
  }
  return { start: start.toISOString(), end: end.toISOString(), days, dsaDays, aptitudeDays, details };
}

module.exports = { getProfileStats, getProfileActivity };
