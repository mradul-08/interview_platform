const AptitudeAttempt = require("../models/AptitudeAttempt");
const AptitudeSession = require("../models/AptitudeSession");
const AptitudeQuestion = require("../models/AptitudeQuestion");
const AptitudeProfile = require("../models/AptitudeProfile");
const AptitudeBookmark = require("../models/AptitudeBookmark");
const AptitudeReport = require("../models/AptitudeReport");
const mongoose = require("mongoose");
const { APTITUDE_BADGES } = require("../config/aptitudeGamification");
const { buildPagination, paginatedResponse } = require("../utils/paginate");
const { publicQuestion, getOrCreateProfile, processAttempt, selectAdaptiveQuestions, getDashboardData, getAnalyticsSnapshot, getTodayMission, computeReadinessScore, getReadinessBreakdown, getStreakCalendar, getMistakeBreakdown, getSkillDNA, getSpeedAccuracyProfile, getRevisionQueue, getConfidenceCalibration, VISIBLE_QUESTION_STATUSES } = require("../services/aptitudeService");
const { emitToUser } = require("../socket");
const { normalizeSubmissionId, validateSelectedAnswer, validateSubmissionReuse, authoritativeTimeSeconds } = require("../services/aptitudeContracts");

const fail = (res, message) => res.status(500).json({ success: false, message });
const snapshotQuestion = (question) => ({ question: question.question, options: question.options, correctAnswer: question.correctAnswer, explanation: question.explanation || "", shortTrick: question.shortTrick || "", conceptNote: question.conceptNote || "", expectedTime: question.expectedTime || 0, version: question.version || 1, contentHash: question.contentHash || "" });
const publicSnapshot = (snapshot) => { if (!snapshot) return null; const { correctAnswer, explanation, shortTrick, conceptNote, ...safe } = snapshot; return safe; };
const sessionQuestionPayload = (questions) => questions.map((q, i) => ({ questionId: q._id, order: i, questionSnapshot: snapshotQuestion(q) }));

exports.getDashboard = async (req, res) => { try { res.json({ success: true, data: await getDashboardData(req.user._id) }); } catch (e) { console.error(e); fail(res, "Failed to load aptitude dashboard"); } };
exports.getTopics = async (req, res) => { try { const filter = { qualityStatus: { $in: VISIBLE_QUESTION_STATUSES } }; const [categories, topics, categoryStats] = await Promise.all([AptitudeQuestion.distinct("category", filter), AptitudeQuestion.distinct("topic", filter), AptitudeQuestion.aggregate([{ $match: filter }, { $group: { _id: "$category", totalQuestions: { $sum: 1 }, topics: { $addToSet: "$topic" }, difficulties: { $addToSet: "$difficulty" } } }, { $sort: { totalQuestions: -1, _id: 1 } }])]); res.json({ success: true, categories, topics, categoryStats: categoryStats.map((item) => ({ category: item._id, totalQuestions: item.totalQuestions, topicCount: item.topics.filter(Boolean).length, difficulties: item.difficulties.filter(Boolean) })) }); } catch (e) { fail(res, "Failed to fetch topics"); } };
exports.getAnalytics = async (req, res) => { try { res.json({ success: true, data: await getAnalyticsSnapshot(req.user._id, req.query.days, req.query.topic) }); } catch (e) { fail(res, "Failed to load analytics"); } };
exports.getMistakes = async (req, res) => { try { res.json({ success: true, data: await getMistakeBreakdown(req.user._id) }); } catch (e) { fail(res, "Failed to load mistake analysis"); } };
exports.getSkillDNA = async (req, res) => { try { res.json({ success: true, data: await getSkillDNA(req.user._id) }); } catch (e) { console.error(e); fail(res, "Failed to load skill DNA"); } };
exports.getSpeedAccuracy = async (req, res) => { try { res.json({ success: true, data: await getSpeedAccuracyProfile(req.user._id) }); } catch (e) { console.error(e); fail(res, "Failed to load speed vs accuracy profile"); } };
exports.getConfidenceCalibration = async (req, res) => { try { res.json({ success: true, data: await getConfidenceCalibration(req.user._id) }); } catch (e) { console.error(e); fail(res, "Failed to load confidence calibration"); } };
exports.getReadinessBreakdown = async (req, res) => { try { res.json({ success: true, data: await getReadinessBreakdown(req.user._id) }); } catch (e) { console.error(e); fail(res, "Failed to load readiness breakdown"); } };
exports.getStreakCalendar = async (req, res) => { try { res.json({ success: true, data: await getStreakCalendar(req.user._id, req.query.days, req.query.year) }); } catch (e) { console.error(e); fail(res, "Failed to load streak calendar"); } };
exports.getCompanies = async (req, res) => { try { const companies = await AptitudeQuestion.aggregate([{ $match: { qualityStatus: { $in: VISIBLE_QUESTION_STATUSES }, companyTags: { $exists: true, $ne: [] } } }, { $unwind: "$companyTags" }, { $group: { _id: "$companyTags", totalQuestions: { $sum: 1 }, categories: { $addToSet: "$category" } } }, { $sort: { totalQuestions: -1, _id: 1 } }]); res.json({ success: true, companies: companies.map((item) => ({ company: item._id, totalQuestions: item.totalQuestions, categories: item.categories })) }); } catch (e) { fail(res, "Failed to load aptitude companies"); } };
exports.getRevision = async (req, res) => { try { res.json({ success: true, data: await getRevisionQueue(req.user._id) }); } catch (e) { console.error(e); fail(res, "Failed to load revision schedule"); } };
exports.startRevisionPractice = async (req, res) => { try { const queue = await getRevisionQueue(req.user._id); if (!queue.hasData || !queue.dueCount) return res.status(404).json({ success: false, message: "Nothing due for revision right now" }); const topics = queue.due.map((item) => item.topic); const { questions } = await selectAdaptiveQuestions({ userId: req.user._id, count: Math.min(10, topics.length * 4), topicFilter: topics, includeAnswers: true }); if (!questions.length) return res.status(404).json({ success: false, message: "No questions available for your due topics" }); const session = await AptitudeSession.create({ userId: req.user._id, mode: "WEAKNESS_REVISION", config: { totalQuestions: questions.length }, questions: sessionQuestionPayload(questions) }); await AptitudeProfile.updateOne({ userId: req.user._id }, { $inc: { totalSessions: 1 } }, { upsert: true }); res.json({ success: true, session: { ...session.toObject(), questionDetails: questions.map(publicQuestion) } , dueTopics: topics }); } catch (e) { console.error(e); fail(res, "Failed to build revision session"); } };
exports.fixMistakes = async (req, res) => { try { const breakdown = await getMistakeBreakdown(req.user._id); const requestedTopic = String(req.body?.topic || "").trim(); const focusTopic = requestedTopic ? (breakdown.focusTopics || []).find((item) => item.topic === requestedTopic) : breakdown.focusTopic; if (!breakdown.hasData || !focusTopic) return res.status(404).json({ success: false, message: "Not enough mistake data yet to build a targeted session" }); const { questions } = await selectAdaptiveQuestions({ userId: req.user._id, count: 8, topicFilter: focusTopic.topic, includeAnswers: true }); if (!questions.length) return res.status(404).json({ success: false, message: "No questions available for this topic" }); const session = await AptitudeSession.create({ userId: req.user._id, mode: "WEAKNESS_REVISION", config: { topic: focusTopic.topic, totalQuestions: questions.length }, questions: sessionQuestionPayload(questions) }); await AptitudeProfile.updateOne({ userId: req.user._id }, { $inc: { totalSessions: 1 } }, { upsert: true }); res.json({ success: true, session: { ...session.toObject(), questionDetails: questions.map(publicQuestion) }, focusTopic }); } catch (e) { console.error(e); fail(res, "Failed to build mistake-focused session"); } };
exports.startMistakeReplay = async (req, res) => { try { const attempts = await AptitudeAttempt.find({ userId: req.user._id, isCorrect: false, isSkipped: false }).sort({ createdAt: -1 }).limit(10).lean(); const ids = [...new Set(attempts.map((item) => String(item.questionId)))]; if (!ids.length) return res.status(404).json({ success: false, message: "No missed questions to replay yet" }); const questions = await AptitudeQuestion.find({ _id: { $in: ids }, qualityStatus: { $in: VISIBLE_QUESTION_STATUSES } }).lean(); const byId = Object.fromEntries(questions.map((item) => [String(item._id), item])); const ordered = ids.map((id) => byId[id]).filter(Boolean); const session = await AptitudeSession.create({ userId: req.user._id, mode: "WEAKNESS_REVISION", config: { totalQuestions: ordered.length, replay: true }, questions: sessionQuestionPayload(ordered) }); await AptitudeProfile.updateOne({ userId: req.user._id }, { $inc: { totalSessions: 1 } }, { upsert: true }); res.json({ success: true, session: { ...session.toObject(), questionDetails: ordered.map((q) => ({ ...q, correctAnswer: undefined, explanation: undefined, shortTrick: undefined, conceptNote: undefined })) } }); } catch (e) { console.error(e); fail(res, "Failed to build mistake replay"); } };
exports.getRecommendations = async (req, res) => { try { const data = await selectAdaptiveQuestions({ userId: req.user._id, count: 8, includeAnswers: true }); res.json({ success: true, ...data }); } catch (e) { fail(res, "Failed to fetch recommendations"); } };
exports.getDailyMission = async (req, res) => { try { res.json({ success: true, mission: await getTodayMission(req.user._id) }); } catch (e) { fail(res, "Failed to fetch daily mission"); } };
exports.getBadges = async (req, res) => { try { const profile = await AptitudeProfile.findOne({ userId: req.user._id }).lean(); const earned = new Set((profile?.badges || []).map((b) => b.badgeId)); res.json({ success: true, badges: APTITUDE_BADGES.map((badge) => ({ ...badge, earned: earned.has(badge.id), unlockedAt: profile?.badges?.find((b) => b.badgeId === badge.id)?.unlockedAt || null })) }); } catch (e) { fail(res, "Failed to fetch badges"); } };

exports.getQuestions = async (req, res) => { try { const filter = { qualityStatus: { $in: VISIBLE_QUESTION_STATUSES } }; ["category", "topic", "difficulty"].forEach((key) => { if (req.query[key]) filter[key] = req.query[key]; }); const total = await AptitudeQuestion.countDocuments(filter); const { skip, limit, page, totalPages } = buildPagination(total, req.query.page, req.query.limit); const questions = await AptitudeQuestion.find(filter).select("-correctAnswer -explanation -shortTrick -conceptNote").sort({ createdAt: -1 }).skip(skip).limit(limit).lean(); res.json({ success: true, ...paginatedResponse(questions, total, page, limit), totalPages }); } catch (e) { fail(res, "Failed to fetch questions"); } };
exports.getQuestion = async (req, res) => { try { const question = await AptitudeQuestion.findOne({ _id: req.params.id, qualityStatus: { $in: VISIBLE_QUESTION_STATUSES } }).select("-correctAnswer -explanation -shortTrick -conceptNote").lean(); if (!question) return res.status(404).json({ success: false, message: "Question not found" }); res.json({ success: true, question }); } catch (e) { res.status(404).json({ success: false, message: "Question not found" }); } };
exports.submitAttempt = async (req, res) => { try { const { questionId, selectedAnswer, confidence, timeSpent, startedAt, sessionId } = req.body; if (!questionId || !["A", "B", "C", "D", null, undefined].includes(selectedAnswer)) return res.status(400).json({ success: false, message: "Valid questionId and answer are required" }); const question = await AptitudeQuestion.findOne({ _id: questionId, qualityStatus: { $in: VISIBLE_QUESTION_STATUSES } }).lean(); if (!question) return res.status(404).json({ success: false, message: "Question not found" }); const now = new Date(); const clientStart = startedAt ? new Date(startedAt) : null; const elapsed = clientStart && !Number.isNaN(clientStart.getTime()) ? Math.max(0, Math.round((now.getTime() - clientStart.getTime()) / 1000)) : Number(timeSpent) || 0; const safeTime = Math.min(elapsed, 3600); const result = await processAttempt({ userId: req.user._id, question, selectedAnswer: selectedAnswer || null, timeSpent: safeTime, confidence: confidence || null, sessionId: sessionId || null }); if (sessionId) await AptitudeSession.updateOne({ _id: sessionId, userId: req.user._id, "questions.questionId": questionId }, { $set: { "questions.$.status": selectedAnswer ? "ANSWERED" : "SKIPPED", "questions.$.attemptId": result.attempt._id, "questions.$.answeredAt": now } }); emitToUser(req.app.locals.io, req.user._id, "aptitude:analytics-updated", { reason: "attempt-saved" }); if (result.newBadges?.length || result.streakData || result.xpAwarded) emitToUser(req.app.locals.io, req.user._id, "gamification:updated", { reason: "attempt-saved" }); res.json({ success: true, result: { ...result, serverTimeSpent: safeTime } }); } catch (e) { console.error(e); fail(res, "Failed to submit attempt"); } };

exports.createSession = async (req, res) => { try { const { mode = "QUICK", config = {} } = req.body || {}; const validModes = ["QUICK", "FOCUSED", "PERSONALIZED", "DAILY_MISSION", "COMPANY_PATTERN", "EXAM_SIMULATION", "WEAKNESS_REVISION"]; if (!validModes.includes(mode)) return res.status(400).json({ success: false, message: "Invalid session mode" }); const { questions } = await selectAdaptiveQuestions({ userId: req.user._id, count: Math.min(Math.max(Number(config.totalQuestions) || 10, 1), 50), categoryFilter: config.category, topicFilter: config.topic, difficultyFilter: config.difficulty, companyTagFilter: config.companyTag, includeAnswers: true }); if (!questions.length) return res.status(404).json({ success: false, message: "No questions available" }); const session = await AptitudeSession.create({ userId: req.user._id, mode, config: { ...config, totalQuestions: questions.length }, questions: sessionQuestionPayload(questions) }); await AptitudeProfile.updateOne({ userId: req.user._id }, { $inc: { totalSessions: 1 } }, { upsert: true }); res.json({ success: true, session: { ...session.toObject(), questionDetails: questions.map(publicQuestion) } }); } catch (e) { console.error(e); fail(res, "Failed to create session"); } };
exports.getSession = async (req, res) => { try { const session = await AptitudeSession.findOne({ _id: req.params.id, userId: req.user._id }).lean(); if (!session) return res.status(404).json({ success: false, message: "Session not found" }); const ids = session.questions.map((q) => q.questionId); const details = await AptitudeQuestion.find({ _id: { $in: ids } }).select("-correctAnswer -explanation -shortTrick -conceptNote").lean(); const map = Object.fromEntries(details.map((q) => [String(q._id), q])); res.json({ success: true, session: { ...session, questions: session.questions.map((q) => ({ ...q, questionData: map[String(q.questionId)] || null })) } }); } catch (e) { fail(res, "Failed to fetch session"); } };
exports.getSessionReview = async (req, res) => {
  try {
    const session = await AptitudeSession.findOne({ _id: req.params.id, userId: req.user._id }).lean();
    if (!session) return res.status(404).json({ success: false, message: "Session not found" });
    const questionIds = session.questions.map((item) => item.questionId);
    const attemptIds = session.questions.map((item) => item.attemptId).filter(Boolean);
    const fullReview = req.query.all === "true";
    const attempts = await AptitudeAttempt.find({ userId: req.user._id, ...(fullReview ? {} : { isCorrect: false, isSkipped: false }), $or: [{ sessionId: session._id }, { _id: { $in: attemptIds } }] }).sort({ createdAt: 1 }).lean();
    const attemptsByQuestion = Object.fromEntries(attempts.map((attempt) => [String(attempt.questionId), attempt]));
    const sourceQuestions = await AptitudeQuestion.find({ _id: { $in: questionIds } }).select("question options correctAnswer explanation shortTrick conceptNote").lean();
    const sourceById = Object.fromEntries(sourceQuestions.map((question) => [String(question._id), question]));
    const questions = session.questions
      .map((item) => ({ item, attempt: attemptsByQuestion[String(item.questionId)] }))
      .filter(({ attempt }) => fullReview || attempt)
      .map(({ item, attempt }) => ({
        _id: item.questionId,
        order: item.order,
        question: item.questionSnapshot?.question || sourceById[String(item.questionId)]?.question || "",
        options: item.questionSnapshot?.options || sourceById[String(item.questionId)]?.options || [],
        category: attempt.category,
        topic: attempt.topic,
        difficulty: attempt.difficulty,
        selectedAnswer: attempt?.selectedAnswer || null,
        correctAnswer: attempt?.correctAnswer || item.questionSnapshot?.correctAnswer || sourceById[String(item.questionId)]?.correctAnswer,
        isCorrect: attempt?.isCorrect === true,
        isSkipped: attempt?.isSkipped === true || !attempt,
        explanation: item.questionSnapshot?.explanation || sourceById[String(item.questionId)]?.explanation || "",
        shortTrick: item.questionSnapshot?.shortTrick || sourceById[String(item.questionId)]?.shortTrick || "",
        conceptNote: item.questionSnapshot?.conceptNote || sourceById[String(item.questionId)]?.conceptNote || "",
        timeSpent: attempt.timeSpent || 0,
      }));
    res.json({ success: true, session: { _id: session._id, mode: session.mode, completedAt: session.completedAt }, questions });
  } catch (e) {
    console.error(e);
    fail(res, "Failed to load session mistakes");
  }
};
exports.repracticeSessionMistakes = async (req, res) => {
  try {
    const session = await AptitudeSession.findOne({ _id: req.params.id, userId: req.user._id }).lean();
    if (!session) return res.status(404).json({ success: false, message: "Session not found" });
    const attempts = await AptitudeAttempt.find({ userId: req.user._id, sessionId: session._id, isCorrect: false, isSkipped: false }).lean();
    const wrongIds = new Set(attempts.map((attempt) => String(attempt.questionId)));
    const orderedIds = session.questions.filter((item) => wrongIds.has(String(item.questionId))).sort((a, b) => a.order - b.order).map((item) => item.questionId);
    if (!orderedIds.length) return res.status(404).json({ success: false, message: "No incorrect questions in this session" });
    const questions = await AptitudeQuestion.find({ _id: { $in: orderedIds }, qualityStatus: { $in: VISIBLE_QUESTION_STATUSES } }).lean();
    const byId = Object.fromEntries(questions.map((question) => [String(question._id), question]));
    const ordered = orderedIds.map((id) => byId[String(id)]).filter(Boolean);
    const replay = await AptitudeSession.create({ userId: req.user._id, mode: "WEAKNESS_REVISION", config: { totalQuestions: ordered.length, replay: true, sourceSessionId: session._id }, questions: sessionQuestionPayload(ordered) });
    await AptitudeProfile.updateOne({ userId: req.user._id }, { $inc: { totalSessions: 1 } }, { upsert: true });
    res.json({ success: true, session: { ...replay.toObject(), questionDetails: ordered.map(publicQuestion) } });
  } catch (e) {
    console.error(e);
    fail(res, "Failed to create mistake practice session");
  }
};
exports.submitSession = async (req, res) => {
  try {
    const session = await AptitudeSession.findOne({ _id: req.params.id, userId: req.user._id }).lean();
    if (!session) return res.status(404).json({ success: false, message: "Session not found" });
    if (session.status === "COMPLETED") return res.json({ success: true, results: session.results, sessionId: session._id });
    if (session.status !== "ACTIVE") return res.status(409).json({ success: false, code: "SESSION_NOT_ACTIVE", message: "This session is no longer active" });

    const timedOut = Boolean(session.expiresAt && new Date() >= session.expiresAt);
    const attempts = await AptitudeAttempt.find({ userId: req.user._id, sessionId: session._id, isSkipped: false }).lean();
    const totalAnswered = attempts.length;
    const totalCorrect = attempts.filter((attempt) => attempt.isCorrect).length;
    const breakdown = (field) => {
      const groups = {};
      attempts.forEach((attempt) => {
        const key = attempt[field];
        if (!groups[key]) groups[key] = { total: 0, correct: 0, accuracy: 0 };
        groups[key].total += 1;
        groups[key].correct += attempt.isCorrect ? 1 : 0;
        groups[key].accuracy = Math.round((groups[key].correct / groups[key].total) * 100);
      });
      return groups;
    };
    const negativeFactor = session.config?.negativeMarking ? Number(session.config.negativeMarkingFactor) || 0.25 : 0;
    const negativeMarks = Math.round((totalAnswered - totalCorrect) * negativeFactor * 100) / 100;
    const results = {
      totalAnswered,
      totalCorrect,
      totalIncorrect: totalAnswered - totalCorrect,
      totalSkipped: Math.max(0, session.questions.length - totalAnswered),
      totalXpAwarded: attempts.reduce((sum, attempt) => sum + (attempt.xpAwarded || 0), 0),
      negativeMarks,
      score: Math.max(0, Math.round((totalCorrect - negativeMarks) * 100) / 100),
      accuracy: totalAnswered ? Math.round((totalCorrect / totalAnswered) * 100) : 0,
      avgTimeSpent: attempts.length ? Math.round(attempts.reduce((sum, attempt) => sum + (attempt.timeSpent || 0), 0) / attempts.length) : 0,
      timedOut,
      topicBreakdown: breakdown("topic"),
      categoryBreakdown: breakdown("category"),
      difficultyBreakdown: breakdown("difficulty"),
    };

    const completed = await AptitudeSession.findOneAndUpdate(
      { _id: session._id, userId: req.user._id, status: "ACTIVE" },
      { $set: { status: "COMPLETED", completedAt: new Date(), results } },
      { returnDocument: "after" }
    ).lean();

    if (!completed) {
      const alreadyCompleted = await AptitudeSession.findOne({ _id: session._id, userId: req.user._id, status: "COMPLETED" }).lean();
      if (alreadyCompleted) return res.json({ success: true, results: alreadyCompleted.results, sessionId: alreadyCompleted._id });
      return res.status(409).json({ success: false, code: "SESSION_NOT_ACTIVE", message: "This session is no longer active" });
    }

    emitToUser(req.app.locals.io, req.user._id, "aptitude:analytics-updated", { reason: "session-completed" });
    emitToUser(req.app.locals.io, req.user._id, "gamification:updated", { reason: "session-completed" });
    res.json({ success: true, results, readinessScore: await computeReadinessScore(req.user._id), sessionId: session._id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to submit session" });
  }
};

exports.createCompanySession = async (req, res) => {
  try {
    const { companyTag, totalQuestions = 15, timeLimitSeconds = 900 } = req.body || {};
    if (!companyTag) return res.status(400).json({ success: false, message: "companyTag is required" });
    const questions = await AptitudeQuestion.find({ companyTags: companyTag, qualityStatus: { $in: VISIBLE_QUESTION_STATUSES } }).select("-correctAnswer -explanation -shortTrick -conceptNote").limit(Math.min(Math.max(Number(totalQuestions) || 15, 1), 50)).lean();
    if (!questions.length) return res.status(404).json({ success: false, message: "No questions available for this company" });
    const session = await AptitudeSession.create({ userId: req.user._id, mode: "COMPANY_PATTERN", config: { companyTag, totalQuestions: questions.length, timeLimitSeconds }, questions: questions.map((q, i) => ({ questionId: q._id, order: i })) });
    await AptitudeProfile.updateOne({ userId: req.user._id }, { $inc: { totalSessions: 1 } }, { upsert: true });
    res.json({ success: true, session: { ...session.toObject(), questionDetails: questions } });
  } catch (e) { console.error(e); fail(res, "Failed to create company session"); }
};

const attemptResult = (attempt, question, duplicate = false) => ({ attempt, isCorrect: attempt.isCorrect, isFirstSolve: false, xpAwarded: attempt.xpAwarded || 0, correctAnswer: question.correctAnswer, explanation: question.explanation, shortTrick: question.shortTrick, conceptNote: question.conceptNote, mistakeType: attempt.mistakeType || null, duplicate });

async function submitAttemptV2(req, res) {
  // Keep answer submission compatible with local standalone MongoDB as well
  // as replica-set deployments. This endpoint performs one question save at
  // a time, so it does not require a Mongo transaction/session.
  const dbSession = null;
  try {
    const { questionId, selectedAnswer, confidence, sessionId, submissionId } = req.body || {};
    if (!questionId) return res.status(400).json({ success: false, message: "questionId is required" });
    validateSelectedAnswer(selectedAnswer);
    const normalizedSubmissionId = normalizeSubmissionId(submissionId);
    const question = await AptitudeQuestion.findOne({ _id: questionId, qualityStatus: { $in: VISIBLE_QUESTION_STATUSES } }).lean();
    if (!question) return res.status(404).json({ success: false, message: "Question not found" });

    let result = null;
    let duplicate = null;
    // The app also runs with a local standalone MongoDB, where transactions
    // are unavailable. Keep the same guarded flow but allow ordinary sessions.
    const executeAttempt = async () => {
      if (normalizedSubmissionId) {
        duplicate = await AptitudeAttempt.findOne({ userId: req.user._id, submissionId: normalizedSubmissionId }).lean();
        validateSubmissionReuse(duplicate, { questionId, sessionId });
        if (duplicate) return;
      }

      if (sessionId) {
        const session = await AptitudeSession.findOne({ _id: sessionId, userId: req.user._id, status: "ACTIVE" });
        if (!session) throw Object.assign(new Error("This session is no longer active"), { status: 409, code: "SESSION_NOT_ACTIVE" });
        const sessionQuestion = session.questions.find((item) => String(item.questionId) === String(questionId));
        if (!sessionQuestion) throw Object.assign(new Error("Question does not belong to this session"), { status: 403, code: "QUESTION_NOT_IN_SESSION" });
        if (sessionQuestion.attemptId) throw Object.assign(new Error("This question has already been submitted"), { status: 409, code: "QUESTION_ALREADY_SUBMITTED" });
        if (session.expiresAt && new Date() >= session.expiresAt) throw Object.assign(new Error("Time is up for this session"), { status: 409, code: "SESSION_EXPIRED" });
        const startedAt = sessionQuestion.startedAt || session.startedAt;
        const timeSpent = authoritativeTimeSeconds({ startedAt });
        result = await processAttempt({ userId: req.user._id, question, selectedAnswer: selectedAnswer || null, confidence: confidence || null, timeSpent, sessionId, submissionId: normalizedSubmissionId });
        sessionQuestion.status = selectedAnswer ? "ANSWERED" : "SKIPPED";
        sessionQuestion.attemptId = result.attempt._id;
        sessionQuestion.startedAt = sessionQuestion.startedAt || session.startedAt || new Date();
        sessionQuestion.answeredAt = new Date();
        session.currentQuestionIndex = Math.max(session.currentQuestionIndex || 0, sessionQuestion.order + 1);
        await session.save();
      } else {
        result = await processAttempt({ userId: req.user._id, question, selectedAnswer: selectedAnswer || null, confidence: confidence || null, timeSpent: 0, submissionId: normalizedSubmissionId });
      }
    };
    await executeAttempt();

    if (duplicate) return res.json({ success: true, result: attemptResult(duplicate, question, true), duplicate: true });
    if (selectedAnswer) emitToUser(req.app.locals.io, req.user._id, "aptitude:activity-updated", { reason: "attempt-saved", date: result.attempt.createdAt, isCorrect: result.isCorrect, category: question.category, topic: question.topic });
    if (selectedAnswer) {
      try {
        const revision = await getRevisionQueue(req.user._id);
        emitToUser(req.app.locals.io, req.user._id, "aptitude:revision-updated", { reason: "attempt-saved", revision });
      } catch (revisionError) {
        console.error("[aptitude] revision realtime update failed:", revisionError);
      }
    }
    emitToUser(req.app.locals.io, req.user._id, "aptitude:analytics-updated", { reason: "attempt-saved" });
    if (result.newBadges?.length || result.streakData || result.xpAwarded) {
      emitToUser(req.app.locals.io, req.user._id, "gamification:updated", { reason: "attempt-saved" });
    }
    return res.json({ success: true, result: { ...result, serverTimeSpent: result.attempt.timeSpent } });
  } catch (error) {
    console.error(error);
    const duplicateKey = error?.code === 11000;
    return res.status(error.status || (duplicateKey ? 409 : 500)).json({
      success: false,
      code: error.code && error.code !== 11000 ? error.code : (duplicateKey ? "DUPLICATE_ATTEMPT" : "APTITUDE_ATTEMPT_FAILED"),
      message: error.status || duplicateKey ? error.message || "This attempt was already submitted" : "Failed to submit attempt",
    });
  } finally { if (dbSession) await dbSession.endSession(); }
}

exports.submitAttempt = submitAttemptV2;

exports.getActiveSession = async (req, res) => {
  try {
    const session = await AptitudeSession.findOne({ userId: req.user._id, status: "ACTIVE" }).sort({ createdAt: -1 }).lean();
    if (!session) return res.json({ success: true, session: null });
    const timeLimitSeconds = Number(session.config?.timeLimitSeconds) || session.questions.length * 120;
    const expiresAt = session.expiresAt || new Date(new Date(session.startedAt || session.createdAt).getTime() + timeLimitSeconds * 1000);
    if (!session.expiresAt) await AptitudeSession.updateOne({ _id: session._id }, { $set: { "config.timeLimitSeconds": timeLimitSeconds, expiresAt } });
    const ids = session.questions.map((item) => item.questionId);
    const details = await AptitudeQuestion.find({ _id: { $in: ids } }).select("-correctAnswer -explanation -shortTrick -conceptNote").lean();
    const map = Object.fromEntries(details.map((item) => [String(item._id), item]));
    res.json({ success: true, session: { ...session, config: { ...session.config, timeLimitSeconds }, expiresAt, questionDetails: session.questions.map((item) => map[String(item.questionId)] || null) } });
  } catch (error) { console.error(error); fail(res, "Failed to load active session"); }
};

exports.markForReview = async (req, res) => { try { const { sessionId, questionId } = req.body; const result = await AptitudeSession.updateOne({ _id: sessionId, userId: req.user._id, status: "ACTIVE", "questions.questionId": questionId }, { $set: { "questions.$.status": "MARKED_FOR_REVIEW" } }); res.json({ success: true, updated: result.modifiedCount > 0 }); } catch (e) { fail(res, "Failed to mark for review"); } };
exports.getSimilarQuestion = async (req, res) => { try { const original = await AptitudeQuestion.findOne({ _id: req.params.questionId, qualityStatus: { $in: VISIBLE_QUESTION_STATUSES } }).lean(); if (!original) return res.status(404).json({ success: false, message: "Question not found" }); const solved = (await AptitudeProfile.findOne({ userId: req.user._id }).lean())?.solvedQuestionIds || []; const question = await AptitudeQuestion.findOne({ _id: { $nin: [original._id, ...solved] }, topic: original.topic, difficulty: original.difficulty, qualityStatus: { $in: VISIBLE_QUESTION_STATUSES } }).select("-correctAnswer -explanation -shortTrick -conceptNote").lean(); if (!question) return res.status(404).json({ success: false, message: "No similar question found" }); res.json({ success: true, question }); } catch (e) { fail(res, "Failed to fetch similar question"); } };
exports.getBookmarks = async (req, res) => { try { const bookmarks = await AptitudeBookmark.find({ userId: req.user._id }).populate({ path: "questionId" }).sort({ createdAt: -1 }).lean(); res.json({ success: true, bookmarks }); } catch (e) { fail(res, "Failed to fetch bookmarks"); } };
exports.toggleBookmark = async (req, res) => { try { const filter = { userId: req.user._id, questionId: req.params.questionId }; const existing = await AptitudeBookmark.findOne(filter); if (existing) { await existing.deleteOne(); return res.json({ success: true, bookmarked: false }); } await AptitudeBookmark.create(filter); res.json({ success: true, bookmarked: true }); } catch (e) { if (e.code === 11000) return res.json({ success: true, bookmarked: true }); fail(res, "Failed to update bookmark"); } };
exports.reportQuestion = async (req, res) => { try { const { reason, details = "" } = req.body; if (!["INCORRECT_ANSWER", "AMBIGUOUS", "TYPO", "WRONG_EXPLANATION", "DUPLICATE", "BROKEN"].includes(reason)) return res.status(400).json({ success: false, message: "Invalid report reason" }); await AptitudeReport.create({ userId: req.user._id, questionId: req.params.questionId, reason, details }); res.json({ success: true, message: "Report submitted" }); } catch (e) { fail(res, "Failed to submit report"); } };
