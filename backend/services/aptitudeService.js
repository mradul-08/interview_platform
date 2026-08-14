const mongoose = require("mongoose");
const AptitudeQuestion = require("../models/AptitudeQuestion");
const AptitudeAttempt = require("../models/AptitudeAttempt");
const AptitudeProfile = require("../models/AptitudeProfile");
const { toUtcDateKey, addDays, dateFromKey } = require("../utils/streakDates");
const { APTITUDE_XP, DAILY_MISSION_XP, RETRY_XP, MIN_ATTEMPTS_FOR_ANALYTICS, MIN_ATTEMPTS_FOR_TOPIC_MASTERY, MIN_ATTEMPTS_FOR_READINESS, MIN_ATTEMPTS_FOR_WEAKNESS, MIN_MISTAKES_FOR_MISTAKE_LAB, MIN_ATTEMPTS_FOR_SKILL_DNA_CATEGORY, MIN_ATTEMPTS_FOR_SPEED_ACCURACY, MIN_SAMPLE_FOR_SUBMETRIC, REVISION_INTERVAL_DAYS, READINESS_WEIGHTS, WEAKNESS_ACCURACY_THRESHOLD, APTITUDE_BADGES } = require("../config/aptitudeGamification");

const MISTAKE_LABELS = { CONCEPTUAL_ERROR: "Conceptual gap", CALCULATION_ERROR: "Calculation slip", TIME_PRESSURE: "Time pressure", MISREAD_QUESTION: "Misread question", GUESS: "Guessing", UNKNOWN: "Unclassified" };
const txOptions = (dbSession) => dbSession ? { session: dbSession } : {};

// Mistake Lab (Part 8): aggregates real wrong-answer attempts into a mistake-type
// breakdown and surfaces which topic is driving the most errors, so "Fix My Mistakes"
// has a concrete target. Never fabricates a distribution below the minimum sample size.
async function getMistakeBreakdown(userId) {
  const wrongAttempts = await AptitudeAttempt.find({ userId, isCorrect: false, isSkipped: false }).sort({ createdAt: -1 }).limit(200).lean();
  const total = wrongAttempts.length;
  if (total < MIN_MISTAKES_FOR_MISTAKE_LAB) return { hasData: false, minRequired: MIN_MISTAKES_FOR_MISTAKE_LAB, totalMistakes: total };
  const counts = {};
  const byTopic = {};
  wrongAttempts.forEach((attempt) => { const type = attempt.mistakeType || "UNKNOWN"; counts[type] = (counts[type] || 0) + 1; byTopic[attempt.topic] = (byTopic[attempt.topic] || 0) + 1; });
  const breakdown = Object.entries(counts).map(([type, count]) => ({ type, label: MISTAKE_LABELS[type] || type, count, percentage: Math.round((count / total) * 100) })).sort((a, b) => b.count - a.count);
  const focusTopics = Object.entries(byTopic)
    .map(([topic, mistakeCount]) => ({
      topic,
      mistakeCount,
      percentage: Math.round((mistakeCount / total) * 100),
      priority: mistakeCount >= Math.max(3, Math.ceil(total * 0.25)) ? "high" : mistakeCount >= 2 ? "medium" : "standard",
    }))
    .sort((a, b) => b.mistakeCount - a.mistakeCount);
  return { hasData: true, totalMistakes: total, breakdown, focusTopic: focusTopics[0] || null, focusTopics };
}

const VISIBLE_QUESTION_STATUSES = ["VERIFIED", "PUBLISHED"];

const publicQuestion = (question) => { const item = question.toObject ? question.toObject() : { ...question }; delete item.correctAnswer; delete item.explanation; delete item.shortTrick; delete item.conceptNote; return item; };
async function getOrCreateProfile(userId, dbSession = null) { return AptitudeProfile.findOneAndUpdate({ userId }, { $setOnInsert: { userId } }, { upsert: true, returnDocument: "after", setDefaultsOnInsert: true, ...txOptions(dbSession) }).lean(); }

async function awardAptitudeXp(userId, questionId, difficulty, isFirstSolve, dbSession = null) {
  if (!isFirstSolve) {
    const first = await AptitudeAttempt.findOne({ userId, questionId, isCorrect: true }).sort({ createdAt: 1 }).session(dbSession).lean();
    if (!first || toUtcDateKey(first.createdAt) === toUtcDateKey(new Date())) return 0;
    await AptitudeProfile.updateOne({ userId }, { $inc: { aptitudeXp: RETRY_XP } }, txOptions(dbSession));
    return RETRY_XP;
  }
  const xp = APTITUDE_XP[difficulty] || 10;
  await AptitudeProfile.updateOne({ userId }, { $inc: { aptitudeXp: xp } }, txOptions(dbSession));
  return xp;
}

async function refreshAptitudeStreak(userId, dbSession = null) { const profile = await AptitudeProfile.findOne({ userId }).session(dbSession); if (!profile) return null; const today = toUtcDateKey(new Date()); const yesterday = addDays(today, -1); if (profile.lastActiveDate !== today) profile.currentStreak = profile.lastActiveDate === yesterday ? (profile.currentStreak || 0) + 1 : 1; profile.longestStreak = Math.max(profile.longestStreak || 0, profile.currentStreak || 0); profile.lastActiveDate = today; await profile.save(txOptions(dbSession)); return { currentStreak: profile.currentStreak, longestStreak: profile.longestStreak }; }

function categoryKey(category) { return { "Quantitative Aptitude": "Quantitative", "Logical Reasoning": "Logical", "Verbal Ability": "Verbal", "Data Interpretation": "DI" }[category] || null; }
async function markMissionCategory(userId, key, dbSession = null) { const today = toUtcDateKey(new Date()); const profile = await AptitudeProfile.findOne({ userId }).session(dbSession); if (!profile) return null; let mission = profile.dailyMissions.find((item) => item.date === today); if (!mission) { profile.dailyMissions.push({ date: today, completed: { Quantitative: false, Logical: false, Verbal: false, DI: false, Mixed: false } }); mission = profile.dailyMissions[profile.dailyMissions.length - 1]; } mission.completed[key] = true; const allDone = Object.values(mission.completed.toObject ? mission.completed.toObject() : mission.completed).every(Boolean); let xpAwarded = 0; if (allDone && !mission.xpRewarded) { mission.xpRewarded = true; mission.completedAt = new Date(); profile.aptitudeXp += DAILY_MISSION_XP; xpAwarded = DAILY_MISSION_XP; } profile.dailyMissions = profile.dailyMissions.slice(-7); await profile.save(txOptions(dbSession)); return { mission, xpAwarded, allDone }; }
async function updateTopicMastery(userId, topic, category, isCorrect, timeSpent, dbSession = null) { const profile = await AptitudeProfile.findOne({ userId }).session(dbSession); if (!profile) return; let mastery = profile.topicMastery.find((item) => item.topic === topic && item.category === category); if (!mastery) { profile.topicMastery.push({ topic, category, totalAttempts: 1, totalCorrect: isCorrect ? 1 : 0, avgTimeSpent: timeSpent, masteryScore: null }); } else { mastery.totalAttempts += 1; mastery.totalCorrect += isCorrect ? 1 : 0; mastery.avgTimeSpent = Math.round(((mastery.avgTimeSpent || 0) * (mastery.totalAttempts - 1) + timeSpent) / mastery.totalAttempts); mastery.lastAttemptAt = new Date(); if (mastery.totalAttempts >= MIN_ATTEMPTS_FOR_TOPIC_MASTERY) mastery.masteryScore = Math.round((mastery.totalCorrect / mastery.totalAttempts) * 100); } await profile.save(txOptions(dbSession)); }
function getWeakTopics(profile) {
  return (profile.topicMastery || [])
    .filter((item) => item.totalAttempts > 0)
    .map((item) => ({ ...item, masteryScore: item.masteryScore ?? Math.round((item.totalCorrect / item.totalAttempts) * 100), earlySignal: item.masteryScore == null }))
    .map((item) => ({ ...item, isWeak: item.masteryScore < WEAKNESS_ACCURACY_THRESHOLD }))
    .sort((a, b) => a.masteryScore - b.masteryScore || b.totalAttempts - a.totalAttempts)
    .slice(0, 5);
}

// Spaced Revision Engine (Part 9): a wrong answer opens (or resets to stage 0) a revision
// entry for that topic, due the next day. A later correct answer on that topic advances
// the entry through 1 -> 3 -> 7 -> 14 day intervals; reaching past the last interval
// resolves it. A later wrong answer resets it back to stage 0 — the concept wasn't
// actually recovered. This never repeats the same question; it only tracks the topic,
// and question selection (selectAdaptiveQuestions) always picks a fresh question.
async function updateRevisionSchedule(userId, topic, category, isCorrect, dbSession = null) {
  const profile = await AptitudeProfile.findOne({ userId }).session(dbSession);
  if (!profile) return;
  const entry = profile.revisionSchedule.find((item) => item.topic === topic && item.category === category && !item.resolvedAt);
  const now = new Date();
  if (!isCorrect) {
    if (entry) { entry.stage = 0; entry.dueDate = dateFromKey(addDays(toUtcDateKey(now), 1)); entry.lastMistakeAt = now; }
    else profile.revisionSchedule.push({ topic, category, stage: 0, dueDate: dateFromKey(addDays(toUtcDateKey(now), 1)), lastMistakeAt: now });
    profile.revisionSchedule = profile.revisionSchedule.slice(-50);
  } else if (entry) {
    const nextStage = entry.stage + 1;
    if (nextStage >= REVISION_INTERVAL_DAYS.length) entry.resolvedAt = now;
    else { entry.stage = nextStage; entry.dueDate = dateFromKey(addDays(toUtcDateKey(now), REVISION_INTERVAL_DAYS[nextStage])); }
  }
  await profile.save(txOptions(dbSession));
}
async function getRevisionQueue(userId) {
  const profile = await getOrCreateProfile(userId);
  const active = (profile.revisionSchedule || []).filter((item) => !item.resolvedAt);
  const topics = [...new Set(active.map((item) => item.topic))];
  const attempts = topics.length ? await AptitudeAttempt.find({ userId, isSkipped: false, topic: { $in: topics } }).select("topic category isCorrect createdAt").sort({ createdAt: -1 }).lean() : [];
  const stats = new Map();
  attempts.forEach((attempt) => {
    const key = `${attempt.topic}::${attempt.category}`;
    const item = stats.get(key) || { attempts: 0, correct: 0, mistakes: 0, lastMistakeAt: null };
    item.attempts += 1;
    item.correct += attempt.isCorrect ? 1 : 0;
    item.mistakes += attempt.isCorrect ? 0 : 1;
    if (!attempt.isCorrect && !item.lastMistakeAt) item.lastMistakeAt = attempt.createdAt;
    stats.set(key, item);
  });
  const enrich = (item) => {
    const itemStats = stats.get(`${item.topic}::${item.category}`) || { attempts: 0, correct: 0, mistakes: 0, lastMistakeAt: item.lastMistakeAt };
    const accuracy = itemStats.attempts ? Math.round((itemStats.correct / itemStats.attempts) * 100) : 0;
    const priority = accuracy < 50 || itemStats.mistakes >= 3 ? "high" : accuracy < 70 ? "medium" : "standard";
    return { topic: item.topic, category: item.category, stage: item.stage, dueDate: item.dueDate, intervalDays: REVISION_INTERVAL_DAYS[item.stage], attempts: itemStats.attempts, mistakes: itemStats.mistakes, accuracy, lastMistakeAt: itemStats.lastMistakeAt, priority, priorityLabel: priority === "high" ? "Needs attention" : priority === "medium" ? "Keep warm" : "Reinforce" };
  };
  const now = new Date();
  const due = active.filter((item) => new Date(item.dueDate) <= now).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  const upcoming = active.filter((item) => new Date(item.dueDate) > now).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  const enrichedDue = due.map(enrich);
  const enrichedUpcoming = upcoming.slice(0, 10).map(enrich);
  return { hasData: active.length > 0, dueCount: due.length, upcomingCount: upcoming.length, totalMistakes: [...stats.values()].reduce((sum, item) => sum + item.mistakes, 0), due: enrichedDue, upcoming: enrichedUpcoming, summary: { activeTopics: active.length, highPriority: [...enrichedDue, ...enrichedUpcoming].filter((item) => item.priority === "high").length, nextDue: enrichedDue[0]?.dueDate || enrichedUpcoming[0]?.dueDate || null } };
}

// Confidence Calibration (Part 22): compares self-reported confidence against actual
// correctness. Overconfident = claims HIGH confidence but is wrong often; underconfident =
// claims LOW confidence but is usually right anyway. Also flags the single topic where
// overconfidence shows up most, mirroring the spec's "overconfident in Probability" example.
const CALIBRATION_OVERCONFIDENT_THRESHOLD = 70;
const CALIBRATION_UNDERCONFIDENT_THRESHOLD = 70;
async function getConfidenceCalibration(userId) {
  const attempts = await AptitudeAttempt.find({ userId, isSkipped: false, confidence: { $ne: null } }).sort({ createdAt: -1 }).limit(200).lean();
  const byLevel = { HIGH: [], MEDIUM: [], LOW: [] };
  attempts.forEach((item) => { if (byLevel[item.confidence]) byLevel[item.confidence].push(item); });
  if (byLevel.HIGH.length < MIN_SAMPLE_FOR_SUBMETRIC && byLevel.LOW.length < MIN_SAMPLE_FOR_SUBMETRIC) return { hasData: false, minRequired: MIN_SAMPLE_FOR_SUBMETRIC };

  const levels = Object.entries(byLevel).map(([level, rows]) => ({ level, sample: rows.length, accuracy: rows.length ? Math.round((rows.filter((item) => item.isCorrect).length / rows.length) * 100) : null }));

  let verdict = "WELL_CALIBRATED";
  const highAccuracy = levels.find((item) => item.level === "HIGH");
  const lowAccuracy = levels.find((item) => item.level === "LOW");
  if (highAccuracy?.accuracy != null && highAccuracy.sample >= MIN_SAMPLE_FOR_SUBMETRIC && highAccuracy.accuracy < CALIBRATION_OVERCONFIDENT_THRESHOLD) verdict = "OVERCONFIDENT";
  else if (lowAccuracy?.accuracy != null && lowAccuracy.sample >= MIN_SAMPLE_FOR_SUBMETRIC && lowAccuracy.accuracy > CALIBRATION_UNDERCONFIDENT_THRESHOLD) verdict = "UNDERCONFIDENT";

  let overconfidentTopic = null;
  if (verdict === "OVERCONFIDENT") {
    const byTopic = {};
    byLevel.HIGH.forEach((item) => { byTopic[item.topic] ||= []; byTopic[item.topic].push(item); });
    const worst = Object.entries(byTopic).filter(([, rows]) => rows.length >= 3).map(([topic, rows]) => ({ topic, sample: rows.length, accuracy: Math.round((rows.filter((item) => item.isCorrect).length / rows.length) * 100) })).sort((a, b) => a.accuracy - b.accuracy)[0];
    if (worst && worst.accuracy < CALIBRATION_OVERCONFIDENT_THRESHOLD) overconfidentTopic = worst;
  }

  return { hasData: true, levels, verdict, overconfidentTopic };
}

const MIN_ATTEMPTS_FOR_CATEGORY_MASTERY_BADGE = 15;
function computeCategoryMastery(profile, category) { const rows = (profile.topicMastery || []).filter((item) => item.category === category); const totalAttempts = rows.reduce((sum, item) => sum + (item.totalAttempts || 0), 0); const totalCorrect = rows.reduce((sum, item) => sum + (item.totalCorrect || 0), 0); if (totalAttempts < MIN_ATTEMPTS_FOR_CATEGORY_MASTERY_BADGE) return null; return Math.round((totalCorrect / totalAttempts) * 100); }
async function checkAndUnlockBadges(userId, dbSession = null) { const profile = await AptitudeProfile.findOne({ userId }).session(dbSession).lean(); if (!profile) return []; const earned = new Set((profile.badges || []).map((item) => item.badgeId)); const unlocked = []; for (const badge of APTITUDE_BADGES) { if (earned.has(badge.id)) continue; const req = badge.requirement || {}; let ok = false; if (badge.id === "apt-first-solve") ok = profile.totalAttempts >= 1 && profile.totalCorrect >= 1; else if (badge.category === "xp") ok = profile.aptitudeXp >= req.xp; else if (badge.category === "streak") ok = profile.longestStreak >= req.streak; else if (badge.category === "milestone") ok = (profile.solvedQuestionIds || []).length >= req.totalSolved; else if (badge.category === "accuracy") ok = profile.totalAttempts >= req.minAttempts && profile.totalCorrect / profile.totalAttempts * 100 >= req.accuracy; else if (badge.category === "speed") ok = (profile.underTargetSolves || 0) >= req.underTargetSolves; else if (badge.category === "mastery") { const mastery = computeCategoryMastery(profile, req.category); ok = mastery !== null && mastery >= req.mastery; } if (ok) { const result = await AptitudeProfile.updateOne({ userId, "badges.badgeId": { $ne: badge.id } }, { $push: { badges: { badgeId: badge.id, unlockedAt: new Date() } } }, txOptions(dbSession)); if (result.modifiedCount) unlocked.push(badge); } } return unlocked; }

async function computeReadinessScore(userId, dbSession = null) { const profile = await AptitudeProfile.findOne({ userId }).session(dbSession).lean(); if (!profile || profile.totalAttempts < MIN_ATTEMPTS_FOR_READINESS) return null; const attempts = await AptitudeAttempt.find({ userId, isSkipped: false }).sort({ createdAt: -1 }).session(dbSession).lean(); const accuracy = profile.totalCorrect / profile.totalAttempts; const hard = attempts.filter((item) => item.difficulty === "Hard"); const medium = attempts.filter((item) => item.difficulty === "Medium"); const hardAccuracy = hard.length ? hard.filter((item) => item.isCorrect).length / hard.length : 0; const mediumAccuracy = medium.length ? medium.filter((item) => item.isCorrect).length / medium.length : 0; const days = new Set(attempts.slice(0, 100).map((item) => toUtcDateKey(item.createdAt))).size; const consistency = Math.min(1, days / 10); const speed = Math.min(1, 60 / Math.max(profile.avgTimeSpent || 60, 20)); const recent = attempts.slice(0, 20); const recentAccuracy = recent.length ? recent.filter((item) => item.isCorrect).length / recent.length : 0; const balance = accuracy * 0.4 + mediumAccuracy * 0.35 + hardAccuracy * 0.25; const score = Math.min(100, Math.round((accuracy * READINESS_WEIGHTS.accuracy + balance * READINESS_WEIGHTS.difficultyBalance + consistency * READINESS_WEIGHTS.consistency + speed * READINESS_WEIGHTS.speedEfficiency + recentAccuracy * READINESS_WEIGHTS.recentPerformance) * 100)); await AptitudeProfile.updateOne({ userId }, { $set: { readinessScore: score, readinessUpdatedAt: new Date() } }, txOptions(dbSession)); return score; }

async function getReadinessBreakdown(userId) {
  const profile = await AptitudeProfile.findOne({ userId }).lean();
  if (!profile || profile.totalAttempts < MIN_ATTEMPTS_FOR_READINESS) return { hasData: false, minRequired: MIN_ATTEMPTS_FOR_READINESS };
  const attempts = await AptitudeAttempt.find({ userId, isSkipped: false }).sort({ createdAt: -1 }).limit(100).lean();
  const accuracy = profile.totalCorrect / Math.max(profile.totalAttempts, 1);
  const rate = (rows) => rows.length ? rows.filter((item) => item.isCorrect).length / rows.length : 0;
  const medium = attempts.filter((item) => item.difficulty === "Medium");
  const hard = attempts.filter((item) => item.difficulty === "Hard");
  const recent = attempts.slice(0, 20);
  const days = new Set(attempts.map((item) => toUtcDateKey(item.createdAt))).size;
  const components = {
    accuracy: Math.round(accuracy * 100),
    difficultyBalance: Math.round((accuracy * 0.4 + rate(medium) * 0.35 + rate(hard) * 0.25) * 100),
    consistency: Math.round(Math.min(1, days / 10) * 100),
    speedEfficiency: Math.round(Math.min(1, 60 / Math.max(profile.avgTimeSpent || 60, 20)) * 100),
    recentPerformance: recent.length ? Math.round(rate(recent) * 100) : 0,
  };
  const weights = { accuracy: 0.35, difficultyBalance: 0.20, consistency: 0.20, speedEfficiency: 0.15, recentPerformance: 0.10 };
  const labels = { accuracy: ["Accuracy", "Correctness across answered questions"], difficultyBalance: ["Difficulty balance", "Performance on medium and hard questions"], consistency: ["Consistency", "Number of active practice days"], speedEfficiency: ["Speed efficiency", "Average time compared with the target"], recentPerformance: ["Recent performance", "Accuracy across the latest answers"] };
  const score = Math.min(100, Math.round(Object.entries(components).reduce((total, [key, value]) => total + (value / 100) * weights[key], 0) * 100));
  return { hasData: true, score, components: Object.entries(components).map(([key, value]) => ({ key, label: labels[key][0], note: labels[key][1], score: value, weight: weights[key] })), sampleSize: profile.totalAttempts, totalAttempts: profile.totalAttempts };
}

async function getStreakCalendar(userId, days = 84, year = null) {
  const requestedYear = Number(year);
  const hasYear = Number.isInteger(requestedYear) && requestedYear >= 2000 && requestedYear <= 2100;
  const start = hasYear ? new Date(Date.UTC(requestedYear, 0, 1)) : new Date(Date.now() - (Math.min(Math.max(Number(days) || 84, 7), 366) - 1) * 86400000);
  const end = hasYear ? new Date(Date.UTC(requestedYear + 1, 0, 1)) : new Date();
  const safeDays = hasYear ? Math.round((end - start) / 86400000) : Math.min(Math.max(Number(days) || 84, 7), 366);
  const since = start;
  const attempts = await AptitudeAttempt.find({ userId, isSkipped: false, createdAt: { $gte: since, $lt: end } }).select("createdAt isCorrect difficulty category topic questionId").populate("questionId", "question").lean();
  const byDay = {};
  attempts.forEach((item) => {
    const key = toUtcDateKey(item.createdAt);
    byDay[key] ||= { attempts: 0, correct: 0, difficulty: {}, categories: {}, topics: {}, questions: [] };
    byDay[key].attempts += 1;
    byDay[key].correct += item.isCorrect ? 1 : 0;
    byDay[key].difficulty[item.difficulty] = (byDay[key].difficulty[item.difficulty] || 0) + 1;
    byDay[key].categories[item.category] = (byDay[key].categories[item.category] || 0) + 1;
    byDay[key].topics[item.topic] = (byDay[key].topics[item.topic] || 0) + 1;
    byDay[key].questions.push({ id: item.questionId?._id || item.questionId, question: item.questionId?.question || "Aptitude question", difficulty: item.difficulty, category: item.category, topic: item.topic, correct: item.isCorrect });
  });
  const daysData = Array.from({ length: safeDays }, (_, index) => { const date = new Date(start.getTime() + index * 86400000); const key = toUtcDateKey(date); return { date: key, ...(byDay[key] || { attempts: 0, correct: 0, difficulty: {}, categories: {}, topics: {}, questions: [] }), active: Boolean(byDay[key]) }; });
  return { year: hasYear ? requestedYear : null, days: daysData, totalAttempts: attempts.length };
}

// Mistake Intelligence: classifies *why* a wrong answer happened using response time
// relative to the question's expected time, combined with self-reported confidence.
// - Answered far faster than expected -> user didn't engage with the question (misread/guess)
// - Answered far slower than expected -> ran out of runway while working it out (time pressure)
// - Answered near expected time with high confidence -> worked it through but landed wrong:
//     closer to full expected time => arithmetic/execution slip (calculation error)
//     well under expected time => jumped to a wrong conclusion (conceptual gap)
// - Low confidence at a normal pace -> acknowledged guess
function classifyMistake({ isCorrect, selectedAnswer, confidence, timeSpent, expectedTime }) {
  if (isCorrect || !selectedAnswer) return null;
  const expected = expectedTime || 60;
  if (timeSpent <= expected * 0.35) return confidence === "LOW" ? "GUESS" : "MISREAD_QUESTION";
  if (timeSpent >= expected * 1.4) return "TIME_PRESSURE";
  if (confidence === "LOW") return "GUESS";
  if (confidence === "HIGH") return timeSpent >= expected * 0.8 ? "CALCULATION_ERROR" : "CONCEPTUAL_ERROR";
  return "CONCEPTUAL_ERROR";
}

// Shared aggregation: joins recent attempts to their question's expectedTime so we can
// reason about pace (timeSpent vs expectedTime) without storing expectedTime redundantly
// on every attempt. Used by Skill DNA and Speed vs Accuracy Intelligence.
async function getTimingSample(userId, limit = 150) {
  return AptitudeAttempt.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId), isSkipped: false } },
    { $sort: { createdAt: -1 } },
    { $limit: limit },
    { $lookup: { from: "aptitudequestions", localField: "questionId", foreignField: "_id", as: "q" } },
    { $unwind: "$q" },
    { $project: {
      isCorrect: 1, timeSpent: 1, confidence: 1, createdAt: 1, category: 1,
      expectedTime: "$q.expectedTime",
      paceRatio: { $min: [2, { $divide: ["$q.expectedTime", { $max: [{ $ifNull: ["$timeSpent", 1] }, 1] }] }] },
      underPressure: { $gte: ["$timeSpent", { $multiply: ["$q.expectedTime", 1.2] }] },
    } },
  ]);
}

// Skill DNA (Part 6): per-category mastery scores plus five composite metrics, all derived
// from real attempts. Any metric without enough samples reports null with a reason rather
// than a fabricated number.
async function getSkillDNA(userId) {
  const profile = await getOrCreateProfile(userId);
  if (profile.totalAttempts < MIN_ATTEMPTS_FOR_ANALYTICS) return { hasData: false, minRequired: MIN_ATTEMPTS_FOR_ANALYTICS };

  const categoryTotals = {};
  (profile.topicMastery || []).forEach((item) => {
    const label = categoryKey(item.category) || item.category;
    categoryTotals[label] ||= { category: label, correct: 0, attempts: 0 };
    categoryTotals[label].correct += item.totalCorrect || 0;
    categoryTotals[label].attempts += item.totalAttempts || 0;
  });
  const categoryScores = Object.values(categoryTotals).map((row) => ({ category: row.category, attempts: row.attempts, score: row.attempts >= MIN_ATTEMPTS_FOR_SKILL_DNA_CATEGORY ? Math.round((row.correct / row.attempts) * 100) : null }));

  const timing = await getTimingSample(userId);
  const withConfidence = timing.filter((item) => item.confidence);
  const highConfidence = withConfidence.filter((item) => item.confidence === "HIGH");
  const underPressure = timing.filter((item) => item.underPressure);
  const days = new Set(timing.map((item) => toUtcDateKey(item.createdAt))).size;

  const avgPace = timing.length ? timing.reduce((sum, item) => sum + item.paceRatio, 0) / timing.length : null;

  const metrics = {
    accuracy: { value: Math.round((profile.totalCorrect / profile.totalAttempts) * 100), sample: profile.totalAttempts },
    speed: { value: timing.length >= MIN_ATTEMPTS_FOR_SPEED_ACCURACY ? Math.round(Math.min(1, avgPace / 1.3) * 100) : null, sample: timing.length },
    consistency: { value: timing.length >= MIN_ATTEMPTS_FOR_SPEED_ACCURACY ? Math.round(Math.min(1, days / 10) * 100) : null, sample: days },
    pressureHandling: { value: underPressure.length >= MIN_SAMPLE_FOR_SUBMETRIC ? Math.round((underPressure.filter((item) => item.isCorrect).length / underPressure.length) * 100) : null, sample: underPressure.length },
    confidence: { value: highConfidence.length >= MIN_SAMPLE_FOR_SUBMETRIC ? Math.round((highConfidence.filter((item) => item.isCorrect).length / highConfidence.length) * 100) : null, sample: highConfidence.length },
  };

  return { hasData: true, categoryScores, metrics };
}

// Speed vs Accuracy Intelligence (Part 7): classifies the learner into one of four
// performance patterns using real pace (question expectedTime vs actual timeSpent) and
// real accuracy, both overall and broken down by category.
function classifySpeedAccuracy(avgPace, accuracyPct) {
  const fast = avgPace >= 1;
  const accurate = accuracyPct >= 65;
  if (fast && accurate) return { pattern: "A", label: "Elite performer", description: "Fast and accurate — strong command of both speed and correctness." };
  if (!fast && accurate) return { pattern: "B", label: "Strong fundamentals, speed improvement needed", description: "Consistently correct, but taking longer than the expected pace." };
  if (fast && !accurate) return { pattern: "C", label: "Possible guessing / careless errors", description: "Answering quickly but missing accuracy — worth slowing down." };
  return { pattern: "D", label: "Conceptual foundation needs work", description: "Slower than expected and still missing questions — points to a knowledge gap, not a speed issue." };
}

async function getSpeedAccuracyProfile(userId) {
  const timing = await getTimingSample(userId);
  if (timing.length < MIN_ATTEMPTS_FOR_SPEED_ACCURACY) return { hasData: false, minRequired: MIN_ATTEMPTS_FOR_SPEED_ACCURACY, sample: timing.length };

  const overallAccuracy = Math.round((timing.filter((item) => item.isCorrect).length / timing.length) * 100);
  const overallPace = timing.reduce((sum, item) => sum + item.paceRatio, 0) / timing.length;
  const overall = { ...classifySpeedAccuracy(overallPace, overallAccuracy), accuracy: overallAccuracy, avgPaceRatio: Math.round(overallPace * 100) / 100 };

  const byCategory = {};
  timing.forEach((item) => { byCategory[item.category] ||= []; byCategory[item.category].push(item); });
  const categories = Object.entries(byCategory).filter(([, rows]) => rows.length >= MIN_SAMPLE_FOR_SUBMETRIC).map(([category, rows]) => {
    const accuracy = Math.round((rows.filter((item) => item.isCorrect).length / rows.length) * 100);
    const pace = rows.reduce((sum, item) => sum + item.paceRatio, 0) / rows.length;
    return { category, sample: rows.length, accuracy, avgPaceRatio: Math.round(pace * 100) / 100, ...classifySpeedAccuracy(pace, accuracy) };
  });

  return { hasData: true, sample: timing.length, overall, categories };
}

async function processAttempt({ userId, question, selectedAnswer, timeSpent, confidence, sessionId, submissionId, dbSession = null }) {
  const isCorrect = selectedAnswer === question.correctAnswer;
  const previousCorrect = await AptitudeAttempt.findOne({ userId, questionId: question._id, isCorrect: true }).session(dbSession).lean();
  const isFirstSolve = isCorrect && !previousCorrect;
  const attemptNumber = await AptitudeAttempt.countDocuments({ userId, questionId: question._id }, txOptions(dbSession)) + 1;
  const safeTime = Math.min(3600, Math.max(0, Math.round(Number(timeSpent) || 0)));
  const mistakeType = classifyMistake({ isCorrect, selectedAnswer, confidence, timeSpent: safeTime, expectedTime: question.expectedTime });
  const solvedUnderTarget = isCorrect && question.expectedTime ? safeTime <= question.expectedTime : false;
  const xpAwarded = isCorrect ? await awardAptitudeXp(userId, question._id, question.difficulty, isFirstSolve, dbSession) : 0;
  const [attempt] = await AptitudeAttempt.create([{ userId, questionId: question._id, sessionId: sessionId || null, submissionId: submissionId || null, selectedAnswer: selectedAnswer || null, correctAnswer: question.correctAnswer, isCorrect, isSkipped: !selectedAnswer, confidence: confidence || null, timeSpent: safeTime, answeredAt: new Date(), attemptNumber, mistakeType, xpAwarded, difficulty: question.difficulty, category: question.category, topic: question.topic }], txOptions(dbSession));
  await AptitudeProfile.updateOne({ userId }, { $inc: { totalAttempts: selectedAnswer ? 1 : 0, totalCorrect: isCorrect ? 1 : 0, underTargetSolves: solvedUnderTarget ? 1 : 0 }, ...(isCorrect ? { $addToSet: { solvedQuestionIds: question._id } } : {}) }, { upsert: true, ...txOptions(dbSession) });
  const average = await AptitudeAttempt.aggregate([{ $match: { userId, isSkipped: false } }, { $group: { _id: null, avg: { $avg: "$timeSpent" } } }]).session(dbSession);
  await AptitudeProfile.updateOne({ userId }, { $set: { avgTimeSpent: Math.round(average[0]?.avg || 0) } }, txOptions(dbSession));
  if (selectedAnswer) await updateTopicMastery(userId, question.topic, question.category, isCorrect, safeTime, dbSession);
  if (selectedAnswer) await updateRevisionSchedule(userId, question.topic, question.category, isCorrect, dbSession);
  const streakData = selectedAnswer ? await refreshAptitudeStreak(userId, dbSession) : null;
  const missionResult = selectedAnswer && isCorrect ? await markMissionCategory(userId, "Mixed", dbSession) : null;
  const key = categoryKey(question.category);
  if (selectedAnswer && isCorrect && key) await markMissionCategory(userId, key, dbSession);
  const newBadges = selectedAnswer ? await checkAndUnlockBadges(userId, dbSession) : [];
  const readinessScore = selectedAnswer ? await computeReadinessScore(userId, dbSession) : null;
  return { attempt, isCorrect, isFirstSolve, xpAwarded, correctAnswer: question.correctAnswer, explanation: question.explanation, shortTrick: question.shortTrick, conceptNote: question.conceptNote, mistakeType, streakData, missionResult, newBadges, readinessScore };
}
async function getTodayMission(userId) { const profile = await AptitudeProfile.findOne({ userId }).lean(); const today = toUtcDateKey(new Date()); return profile?.dailyMissions?.find((item) => item.date === today) || { date: today, completed: { Quantitative: false, Logical: false, Verbal: false, DI: false, Mixed: false }, xpRewarded: false, completedAt: null }; }
async function getDashboardData(userId) {
  const profile = await getOrCreateProfile(userId);
  const [attempts, topicRows, dailyMission] = await Promise.all([
    AptitudeAttempt.find({ userId, isSkipped: false }).sort({ createdAt: -1 }).limit(10).lean(),
    AptitudeAttempt.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(String(userId)), isSkipped: false } },
      { $group: { _id: { topic: "$topic", category: "$category" }, totalAttempts: { $sum: 1 }, totalCorrect: { $sum: { $cond: ["$isCorrect", 1, 0] } }, avgTimeSpent: { $avg: "$timeSpent" } } },
      { $sort: { totalCorrect: 1, totalAttempts: -1 } },
    ]),
    getTodayMission(userId),
  ]);
  const weakTopics = topicRows.map((row) => { const masteryScore = Math.round((row.totalCorrect / row.totalAttempts) * 100); return { topic: row._id.topic, category: row._id.category, totalAttempts: row.totalAttempts, totalCorrect: row.totalCorrect, avgTimeSpent: Math.round(row.avgTimeSpent || 0), masteryScore, isWeak: masteryScore < WEAKNESS_ACCURACY_THRESHOLD, earlySignal: row.totalAttempts < MIN_ATTEMPTS_FOR_TOPIC_MASTERY }; });
  const readinessScore = profile.totalAttempts >= MIN_ATTEMPTS_FOR_READINESS ? profile.readinessScore || null : null;
  return { hasData: profile.totalAttempts >= MIN_ATTEMPTS_FOR_ANALYTICS, aptitudeXp: profile.aptitudeXp || 0, currentStreak: profile.currentStreak || 0, longestStreak: profile.longestStreak || 0, totalAttempts: profile.totalAttempts || 0, totalCorrect: profile.totalCorrect || 0, totalSessions: profile.totalSessions || 0, accuracy: profile.totalAttempts ? Math.round(profile.totalCorrect / profile.totalAttempts * 100) : 0, readinessScore, topicMastery: profile.topicMastery || [], weakTopics, badges: profile.badges || [], dailyMission, avgTimeSpent: profile.avgTimeSpent || 0, recentAttempts: attempts };
}
async function getAnalytics(userId) { const profile = await getOrCreateProfile(userId); if (profile.totalAttempts < MIN_ATTEMPTS_FOR_ANALYTICS) return { hasData: false, minAttemptsRequired: MIN_ATTEMPTS_FOR_ANALYTICS }; const attempts = await AptitudeAttempt.find({ userId, isSkipped: false }).sort({ createdAt: -1 }).limit(100).lean(); const byTopic = {}; const byDifficulty = {}; const byConfidence = {}; attempts.forEach((item) => { const topic = item.topic; byTopic[topic] ||= { topic, category: item.category, total: 0, correct: 0, totalTime: 0 }; byTopic[topic].total += 1; byTopic[topic].correct += item.isCorrect ? 1 : 0; byTopic[topic].totalTime += item.timeSpent || 0; const difficulty = item.difficulty; byDifficulty[difficulty] ||= { difficulty, total: 0, correct: 0, totalTime: 0 }; byDifficulty[difficulty].total += 1; byDifficulty[difficulty].correct += item.isCorrect ? 1 : 0; byDifficulty[difficulty].totalTime += item.timeSpent || 0; if (item.confidence) { byConfidence[item.confidence] ||= { confidence: item.confidence, total: 0, correct: 0 }; byConfidence[item.confidence].total += 1; byConfidence[item.confidence].correct += item.isCorrect ? 1 : 0; } }); const summarize = (item) => ({ ...item, accuracy: Math.round(item.correct / item.total * 100), avgTimeSpent: item.totalTime === undefined ? undefined : Math.round(item.totalTime / item.total), hasData: item.total >= MIN_ATTEMPTS_FOR_TOPIC_MASTERY }); return { hasData: true, totalAttempts: profile.totalAttempts, totalCorrect: profile.totalCorrect, overallAccuracy: Math.round(profile.totalCorrect / profile.totalAttempts * 100), topicPerformance: Object.values(byTopic).map(summarize), difficultyPerformance: Object.values(byDifficulty).map(summarize), confidencePerformance: Object.values(byConfidence).map((item) => ({ ...item, accuracy: Math.round(item.correct / item.total * 100), hasData: item.total >= MIN_ATTEMPTS_FOR_TOPIC_MASTERY })), weakTopics: getWeakTopics(profile) }; }
async function getAnalyticsSnapshot(userId, days = 30, topic = null) {
  const safeDays = Math.min(Math.max(Number(days) || 30, 7), 3650);
  const since = new Date(Date.now() - (safeDays - 1) * 86400000);
  const [profile, base, attempts] = await Promise.all([
    getOrCreateProfile(userId),
    getAnalytics(userId),
    AptitudeAttempt.find({ userId, isSkipped: false, ...(topic ? { topic: String(topic).trim() } : {}), createdAt: { $gte: since } }).sort({ createdAt: -1 }).limit(500).lean(),
  ]);
  const byDay = {};
  attempts.forEach((item) => {
    const date = toUtcDateKey(item.createdAt);
    byDay[date] ||= { date, attempts: 0, correct: 0, time: 0 };
    byDay[date].attempts += 1;
    byDay[date].correct += item.isCorrect ? 1 : 0;
    byDay[date].time += item.timeSpent || 0;
  });
  const dailyTrend = Array.from({ length: safeDays }, (_, index) => {
    const date = toUtcDateKey(new Date(since.getTime() + index * 86400000));
    const row = byDay[date] || { date, attempts: 0, correct: 0, time: 0 };
    return { date, attempts: row.attempts, correct: row.correct, accuracy: row.attempts ? Math.round((row.correct / row.attempts) * 100) : 0, averageTime: row.attempts ? Math.round(row.time / row.attempts) : 0 };
  });
  return { ...base, rangeDays: safeDays, summary: { totalAttempts: profile.totalAttempts || 0, totalCorrect: profile.totalCorrect || 0, accuracy: profile.totalAttempts ? Math.round((profile.totalCorrect / profile.totalAttempts) * 100) : 0, averageTime: profile.avgTimeSpent || 0, currentStreak: profile.currentStreak || 0, longestStreak: profile.longestStreak || 0, aptitudeXp: profile.aptitudeXp || 0 }, dailyTrend, recentAttempts: attempts.slice(0, 14).map((item) => ({ date: item.createdAt, difficulty: item.difficulty, category: item.category, topic: item.topic, isCorrect: item.isCorrect, timeSpent: item.timeSpent || 0 })) };
}
async function selectAdaptiveQuestions({ userId, count = 5, excludeIds = [], categoryFilter = null, topicFilter = null, difficultyFilter = null }) { const profile = await getOrCreateProfile(userId); const solved = (profile.solvedQuestionIds || []).map(String); const query = { qualityStatus: { $in: VISIBLE_QUESTION_STATUSES }, _id: { $nin: [...new Set([...solved, ...excludeIds.map(String)])] } }; if (categoryFilter) query.category = categoryFilter; if (topicFilter) query.topic = { $in: Array.isArray(topicFilter) ? topicFilter : [topicFilter] }; let targetDifficulty = difficultyFilter; let adaptiveReason = null; if (!targetDifficulty) { const recentQuery = { userId }; if (topicFilter) recentQuery.topic = query.topic; const recent = await AptitudeAttempt.find(recentQuery).sort({ createdAt: -1 }).limit(10).lean(); if (recent.length >= 5) { const accuracy = recent.filter((item) => item.isCorrect).length / recent.length; const wrong = recent.filter((item) => !item.isCorrect && item.selectedAnswer); const conceptualShare = wrong.length ? wrong.filter((item) => item.mistakeType === "CONCEPTUAL_ERROR").length / wrong.length : 0; const hasConceptualGap = wrong.length >= 3 && conceptualShare >= 0.5; targetDifficulty = accuracy > .8 ? "Hard" : accuracy > .55 ? "Medium" : "Easy"; if (hasConceptualGap && targetDifficulty === "Hard") { targetDifficulty = "Medium"; adaptiveReason = "Accuracy supports Hard, but recent mistakes are mostly conceptual — holding at Medium for concept repair first."; } else if (hasConceptualGap && targetDifficulty === "Medium") { targetDifficulty = "Easy"; adaptiveReason = "Recent mistakes are mostly conceptual gaps, not calculation slips — reinforcing fundamentals before stepping back up."; } } } if (targetDifficulty && targetDifficulty !== "Mixed") query.difficulty = targetDifficulty; let questions = await AptitudeQuestion.find(query).select("-correctAnswer -explanation -shortTrick -conceptNote").sort({ createdAt: 1, _id: 1 }).limit(count * 3).lean(); if (questions.length < count) { delete query.difficulty; questions = await AptitudeQuestion.find(query).select("-correctAnswer -explanation -shortTrick -conceptNote").sort({ createdAt: 1, _id: 1 }).limit(count * 3).lean(); } return { questions: questions.slice(0, Math.min(Math.max(1, count), 50)), targetDifficulty: targetDifficulty || "Mixed", adaptiveReason }; }
async function selectAdaptiveQuestions({ userId, count = 5, excludeIds = [], categoryFilter = null, topicFilter = null, difficultyFilter = null, companyTagFilter = null, includeAnswers = false }) {
  const profile = await getOrCreateProfile(userId);
  const solved = (profile.solvedQuestionIds || []).map(String);
  const safeCount = Math.min(Math.max(Number(count) || 5, 1), 50);
  const query = {
    qualityStatus: { $in: VISIBLE_QUESTION_STATUSES },
    _id: { $nin: [...new Set([...solved, ...excludeIds.map(String)])] },
  };
  if (categoryFilter) query.category = categoryFilter;
  if (topicFilter) query.topic = { $in: Array.isArray(topicFilter) ? topicFilter : [topicFilter] };
  if (companyTagFilter) query.companyTags = companyTagFilter;

  let targetDifficulty = difficultyFilter;
  let adaptiveReason = null;
  if (!targetDifficulty) {
    const recentQuery = { userId, isSkipped: false };
    if (topicFilter) recentQuery.topic = query.topic;
    const recent = await AptitudeAttempt.find(recentQuery).sort({ createdAt: -1 }).limit(10).lean();
    if (recent.length >= 5) {
      const accuracy = recent.filter((item) => item.isCorrect).length / recent.length;
      const wrong = recent.filter((item) => !item.isCorrect && item.selectedAnswer);
      const conceptualShare = wrong.length ? wrong.filter((item) => item.mistakeType === "CONCEPTUAL_ERROR").length / wrong.length : 0;
      const hasConceptualGap = wrong.length >= 3 && conceptualShare >= 0.5;
      targetDifficulty = accuracy > 0.8 ? "Hard" : accuracy > 0.55 ? "Medium" : "Easy";
      if (hasConceptualGap && targetDifficulty === "Hard") {
        targetDifficulty = "Medium";
        adaptiveReason = "Accuracy supports Hard, but recent mistakes are mostly conceptual — holding at Medium for concept repair first.";
      } else if (hasConceptualGap && targetDifficulty === "Medium") {
        targetDifficulty = "Easy";
        adaptiveReason = "Recent mistakes are mostly conceptual gaps — reinforcing fundamentals before stepping back up.";
      }
    }
  }
  if (targetDifficulty && targetDifficulty !== "Mixed") query.difficulty = targetDifficulty;
  const projection = includeAnswers ? "" : "-correctAnswer -explanation -shortTrick -conceptNote";
  let questions = await AptitudeQuestion.find(query).select(projection).sort({ createdAt: 1, _id: 1 }).limit(safeCount * 3).lean();
  if (questions.length < safeCount) {
    delete query.difficulty;
    questions = await AptitudeQuestion.find(query).select(projection).sort({ createdAt: 1, _id: 1 }).limit(safeCount * 3).lean();
  }
  return { questions: questions.slice(0, safeCount), targetDifficulty: targetDifficulty || "Mixed", adaptiveReason };
}

module.exports = { publicQuestion, getOrCreateProfile, awardAptitudeXp, refreshAptitudeStreak, checkAndUnlockBadges, updateTopicMastery, updateRevisionSchedule, getRevisionQueue, getConfidenceCalibration, computeReadinessScore, getReadinessBreakdown, getStreakCalendar, getWeakTopics, getTodayMission, markMissionCategory, processAttempt, getDashboardData, getAnalytics, getAnalyticsSnapshot, selectAdaptiveQuestions, classifyMistake, getMistakeBreakdown, getSkillDNA, getSpeedAccuracyProfile, VISIBLE_QUESTION_STATUSES };
