const CompetitiveTest = require("../models/CompetitiveTest");
const CompetitiveTestAttempt = require("../models/CompetitiveTestAttempt");
const AptitudeSession = require("../models/AptitudeSession");
const Submission = require("../models/submission");
const { qualifyCompetitiveGroupTest } = require("./competitiveGamificationService");
const { notifyCompetitiveTest } = require("./competitiveNotificationService");

function normalizeScoring(scoring, hasDsa, hasAptitude) {
  if (hasDsa && !hasAptitude) return { dsa: 100, aptitude: 0 };
  if (!hasDsa && hasAptitude) return { dsa: 0, aptitude: 100 };
  if (!hasDsa && !hasAptitude) return { dsa: 0, aptitude: 0 };
  const dsa = Number(scoring?.dsa ?? scoring?.dsaWeight);
  const aptitude = Number(scoring?.aptitude ?? scoring?.aptitudeWeight);
  if (!Number.isFinite(dsa) || !Number.isFinite(aptitude) || dsa < 0 || aptitude < 0 || dsa + aptitude <= 0) return { dsa: 50, aptitude: 50 };
  return { dsa: (dsa / (dsa + aptitude)) * 100, aptitude: (aptitude / (dsa + aptitude)) * 100 };
}

function componentScore({ test, acceptedCount, aptitudeScore }) {
  const dsaTotal = test.problemIds?.length || 0;
  const aptitudeTotal = test.aptitudeQuestionIds?.length || 0;
  const dsa = dsaTotal ? Math.round((acceptedCount / dsaTotal) * 10000) / 100 : null;
  const aptitude = aptitudeTotal ? Math.max(0, Math.min(100, Math.round((Number(aptitudeScore || 0) / aptitudeTotal) * 10000) / 100)) : null;
  const weights = normalizeScoring(test.scoring, dsa !== null, aptitude !== null);
  const score = Math.round(((dsa === null ? 0 : dsa * weights.dsa / 100) + (aptitude === null ? 0 : aptitude * weights.aptitude / 100)) * 100) / 100;
  return { score, dsa, aptitude, dsaTotal, aptitudeTotal };
}

function rankResults(rows) {
  return [...rows].sort((a, b) => (b.score - a.score) || ((a.completionTimeSeconds ?? Number.MAX_SAFE_INTEGER) - (b.completionTimeSeconds ?? Number.MAX_SAFE_INTEGER)) || String(a.participantId).localeCompare(String(b.participantId))).map((row, index) => ({ ...row, rank: index + 1 }));
}

function resultStatus({ attemptStatus, completed }) {
  if (completed) return "COMPLETED";
  if (["INVITED", "JOINED", "MISSED"].includes(attemptStatus)) return "MISSED";
  return "PARTIAL";
}

async function finalizeCompetitiveTest(testId, io) {
  const test = await CompetitiveTest.findOne({ _id: testId, status: "ENDED" });
  if (!test) return CompetitiveTest.findById(testId);
  const attempts = await CompetitiveTestAttempt.find({ testId: test._id }).lean();
  const [accepted, aptitudeSessions] = await Promise.all([
    Submission.find({ competitiveTestId: test._id, verdict: "Accepted" }).select("competitiveTestAttemptId problem").lean(),
    AptitudeSession.find({ competitiveTestId: test._id, status: "COMPLETED" }).select("competitiveTestAttemptId results").lean(),
  ]);
  const acceptedByAttempt = new Map();
  for (const submission of accepted) {
    const key = String(submission.competitiveTestAttemptId);
    const set = acceptedByAttempt.get(key) || new Set();
    set.add(String(submission.problem));
    acceptedByAttempt.set(key, set);
  }
  const aptitudeByAttempt = new Map(aptitudeSessions.map((session) => [String(session.competitiveTestAttemptId), session]));
  const rows = attempts.map((attempt) => {
    const acceptedCount = acceptedByAttempt.get(String(attempt._id))?.size || 0;
    const aptitude = aptitudeByAttempt.get(String(attempt._id));
    const scores = componentScore({ test, acceptedCount, aptitudeScore: aptitude?.results?.score ?? attempt.aptitudeScore });
    const completeDsa = !scores.dsaTotal || acceptedCount >= scores.dsaTotal;
    const completeAptitude = !scores.aptitudeTotal || Boolean(aptitude);
    const completed = completeDsa && completeAptitude && attempt.status !== "MISSED";
    return { ...attempt, ...scores, score: attempt.status === "MISSED" ? 0 : scores.score, acceptedCount, completed, completionTimeSeconds: completed ? attempt.completionTimeSeconds : null, categoryBreakdown: aptitude?.results?.categoryBreakdown || attempt.categoryBreakdown || {} };
  });
  const ranked = rankResults(rows);
  for (const row of ranked) {
    const finalStatus = resultStatus({ attemptStatus: row.status, completed: row.completed });
    await CompetitiveTestAttempt.updateOne({ _id: row._id, testId: test._id }, { $set: { status: finalStatus, score: row.score, dsaScore: row.dsa, aptitudeScore: row.aptitude, scoreBreakdown: { dsaAccepted: row.acceptedCount, dsaTotal: row.dsaTotal, aptitudeScore: row.aptitude, aptitudeTotal: row.aptitudeTotal }, categoryBreakdown: row.categoryBreakdown, rank: row.rank } });
  }
  const published = await CompetitiveTest.findOneAndUpdate({ _id: test._id, status: "ENDED" }, { $set: { status: "RESULTS_AVAILABLE" } }, { returnDocument: "after" });
  if (published) {
    await qualifyCompetitiveGroupTest(published._id);
    await notifyCompetitiveTest({ test: published, event: "results", io });
    io?.to(`study-group:${String(test.groupId)}`).emit("group:test", { testId: test._id, groupId: test.groupId, status: published.status });
  }
  return published || CompetitiveTest.findById(test._id);
}

module.exports = { normalizeScoring, componentScore, rankResults, resultStatus, finalizeCompetitiveTest };
