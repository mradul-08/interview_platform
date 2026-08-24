function assertCompetitiveSubmissionWindow({ test, attempt, problemId, now = new Date() }) {
  if (!test || test.status !== "LIVE") throw Object.assign(new Error("Competitive test is not live"), { status: 409 });
  if (!attempt || attempt.status !== "STARTED") throw Object.assign(new Error("Participant attempt is not active"), { status: 409 });
  if (!Array.from(test.problemIds || []).some((id) => String(id) === String(problemId))) throw Object.assign(new Error("Problem is not assigned to this competitive test"), { status: 403 });
  if (!Array.from(test.participantIds || []).some((id) => String(id) === String(attempt.participantId))) throw Object.assign(new Error("Participant is not assigned to this competitive test"), { status: 403 });
  if (!attempt.endsAt || new Date(attempt.endsAt).getTime() <= now.getTime()) throw Object.assign(new Error("Competitive test deadline has passed"), { status: 409 });
}

module.exports = { assertCompetitiveSubmissionWindow };
