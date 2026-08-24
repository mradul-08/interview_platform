const CompetitiveTestAttempt = require("../models/CompetitiveTestAttempt");
const Submission = require("../models/submission");
const AptitudeAttempt = require("../models/AptitudeAttempt");

function buildCompetitiveProgress({ test, attempts = [], acceptedByAttempt = new Map(), answeredByAttempt = new Map(), now = new Date() }) {
  const dsaTotal = test?.problemIds?.length || 0;
  const aptitudeTotal = test?.aptitudeQuestionIds?.length || 0;
  const participants = attempts.map((attempt) => {
    const attemptId = String(attempt._id);
    const dsaSolved = Math.min(dsaTotal, new Set((acceptedByAttempt.get(attemptId) || []).map(String)).size);
    const aptitudeAnswered = Math.min(aptitudeTotal, new Set((answeredByAttempt.get(attemptId) || []).map(String)).size);
    const remainingSeconds = attempt.status === "STARTED" && attempt.endsAt
      ? Math.max(0, Math.ceil((new Date(attempt.endsAt).getTime() - now.getTime()) / 1000))
      : 0;
    return {
      participant: {
        _id: attempt.participantId?._id || attempt.participantId,
        name: attempt.participantId?.name || "Member",
        username: attempt.participantId?.username || "",
        avatarUrl: attempt.participantId?.avatarUrl || "",
      },
      status: attempt.status,
      startedAt: attempt.startedAt || null,
      completedAt: attempt.completedAt || null,
      remainingSeconds,
      dsa: { solved: dsaSolved, total: dsaTotal },
      aptitude: { answered: aptitudeAnswered, total: aptitudeTotal },
    };
  });
  const summary = participants.reduce((result, participant) => {
    const key = String(participant.status || "").toLowerCase();
    if (key === "invited") result.invited += 1;
    if (key === "joined") result.joined += 1;
    if (key === "started") result.started += 1;
    if (key === "completed") result.completed += 1;
    if (key === "missed") result.missed += 1;
    return result;
  }, { invited: 0, joined: 0, started: 0, completed: 0, missed: 0 });
  return { participants, summary, totals: { dsa: dsaTotal, aptitude: aptitudeTotal } };
}

async function getCompetitiveProgress({ test, now = new Date() }) {
  const attempts = await CompetitiveTestAttempt.find({ testId: test._id })
    .populate("participantId", "name username avatarUrl")
    .select("participantId status startedAt completedAt endsAt aptitudeSessionId")
    .lean();
  const attemptIds = attempts.map((attempt) => attempt._id);
  const sessionIds = attempts.map((attempt) => attempt.aptitudeSessionId).filter(Boolean);
  const [acceptedSubmissions, aptitudeAnswers] = await Promise.all([
    attemptIds.length && test.problemIds?.length
      ? Submission.find({ competitiveTestAttemptId: { $in: attemptIds }, verdict: "Accepted", problem: { $in: test.problemIds } }).select("competitiveTestAttemptId problem").lean()
      : [],
    sessionIds.length && test.aptitudeQuestionIds?.length
      ? AptitudeAttempt.find({ sessionId: { $in: sessionIds }, isSkipped: false }).select("sessionId questionId").lean()
      : [],
  ]);
  const acceptedByAttempt = new Map();
  acceptedSubmissions.forEach((submission) => {
    const key = String(submission.competitiveTestAttemptId);
    const values = acceptedByAttempt.get(key) || [];
    values.push(submission.problem);
    acceptedByAttempt.set(key, values);
  });
  const sessionToAttempt = new Map(attempts.filter((attempt) => attempt.aptitudeSessionId).map((attempt) => [String(attempt.aptitudeSessionId), String(attempt._id)]));
  const answeredByAttempt = new Map();
  aptitudeAnswers.forEach((answer) => {
    const key = sessionToAttempt.get(String(answer.sessionId));
    if (!key) return;
    const values = answeredByAttempt.get(key) || [];
    values.push(answer.questionId);
    answeredByAttempt.set(key, values);
  });
  return buildCompetitiveProgress({ test, attempts, acceptedByAttempt, answeredByAttempt, now });
}

async function emitCompetitiveProgress({ test, io, now = new Date() }) {
  if (!test || !io) return null;
  const progress = await getCompetitiveProgress({ test, now });
  io.to(`study-group:${String(test.groupId)}`).emit("group:test-progress", { testId: String(test._id), groupId: String(test.groupId), ...progress });
  return progress;
}

module.exports = { buildCompetitiveProgress, getCompetitiveProgress, emitCompetitiveProgress };
