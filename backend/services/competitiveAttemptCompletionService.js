const CompetitiveTestAttempt = require("../models/CompetitiveTestAttempt");
const AptitudeSession = require("../models/AptitudeSession");
const Submission = require("../models/submission");

function hasCompletedComponents({ test, acceptedProblemIds = [], aptitudeCompleted = false }) {
  const assignedProblems = new Set((test?.problemIds || []).map((problemId) => String(problemId)));
  const acceptedProblems = new Set(acceptedProblemIds.map((problemId) => String(problemId)));
  const dsaComplete = assignedProblems.size === 0 || [...assignedProblems].every((problemId) => acceptedProblems.has(problemId));
  const aptitudeComplete = (test?.aptitudeQuestionIds || []).length === 0 || Boolean(aptitudeCompleted);
  return dsaComplete && aptitudeComplete;
}

function shouldCompleteCompetitiveAttempt({ test, status, acceptedProblemIds = [], aptitudeCompleted = false }) {
  return status === "STARTED" && hasCompletedComponents({ test, acceptedProblemIds, aptitudeCompleted });
}

async function completeCompetitiveAttemptIfReady({ test, attemptId, now = new Date() }) {
  if (!test || !attemptId) return null;

  const attempt = await CompetitiveTestAttempt.findOne({ _id: attemptId, testId: test._id }).lean();
  if (!attempt || attempt.status !== "STARTED") return attempt;

  const [acceptedSubmissions, aptitudeSession] = await Promise.all([
    Submission.find({ competitiveTestAttemptId: attempt._id, verdict: "Accepted", problem: { $in: test.problemIds || [] } }).select("problem").lean(),
    test.aptitudeQuestionIds?.length
      ? AptitudeSession.findOne({ _id: attempt.aptitudeSessionId, competitiveTestId: test._id, competitiveTestAttemptId: attempt._id, status: "COMPLETED" }).select("_id").lean()
      : null,
  ]);

  if (!shouldCompleteCompetitiveAttempt({
    status: attempt.status,
    test,
    acceptedProblemIds: acceptedSubmissions.map((submission) => submission.problem),
    aptitudeCompleted: Boolean(aptitudeSession),
  })) return attempt;

  const completedAt = new Date(now);
  return CompetitiveTestAttempt.findOneAndUpdate(
    { _id: attempt._id, testId: test._id, status: "STARTED" },
    {
      $set: {
        status: "COMPLETED",
        completedAt,
        completionTimeSeconds: Math.max(0, Math.round((completedAt.getTime() - new Date(attempt.startedAt).getTime()) / 1000)),
      },
    },
    { returnDocument: "after" },
  ).lean();
}

module.exports = { hasCompletedComponents, shouldCompleteCompetitiveAttempt, completeCompetitiveAttemptIfReady };
