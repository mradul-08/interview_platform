const TEST_TYPES = new Set(["DSA", "APTITUDE", "DSA_APTITUDE"]);
const TEST_STATUSES = new Set(["SCHEDULED", "LIVE", "ENDED", "RESULTS_AVAILABLE"]);
const ATTEMPT_STATUSES = new Set(["INVITED", "JOINED", "STARTED", "COMPLETED", "PARTIAL", "MISSED"]);

function validateDefinition(input) {
  const type = String(input?.type || "");
  if (!TEST_TYPES.has(type)) throw new Error("Unsupported competitive test type");
  const problemIds = Array.isArray(input?.problemIds) ? input.problemIds.filter(Boolean) : [];
  const aptitudeQuestionIds = Array.isArray(input?.aptitudeQuestionIds) ? input.aptitudeQuestionIds.filter(Boolean) : [];
  if (type !== "APTITUDE" && problemIds.length === 0) throw new Error("At least one DSA problem is required");
  if (type !== "DSA" && aptitudeQuestionIds.length === 0) throw new Error("At least one Aptitude question is required");
  if (type === "DSA" && aptitudeQuestionIds.length) throw new Error("DSA tests cannot include Aptitude questions");
  if (type === "APTITUDE" && problemIds.length) throw new Error("Aptitude tests cannot include DSA problems");
  const durationSeconds = Number(input?.durationSeconds);
  if (!Number.isInteger(durationSeconds) || durationSeconds < 60 || durationSeconds > 86400) throw new Error("Duration must be between 60 and 86400 seconds");
  const scheduledAt = new Date(input?.scheduledAt);
  if (Number.isNaN(scheduledAt.getTime())) throw new Error("A valid scheduled time is required");
  return { type, problemIds, aptitudeQuestionIds, durationSeconds, scheduledAt };
}

function transitionTest(test, now = new Date()) {
  const current = String(test?.status || "");
  if (!TEST_STATUSES.has(current)) throw new Error("Invalid competitive test status");
  const scheduledAt = new Date(test.scheduledAt);
  // A test that is reconciled after its scheduled time must receive the full
  // configured duration. Using scheduledAt here made a restarted/late server
  // inherit an already-expired portion of the test window.
  const startedAt = test.startedAt ? new Date(test.startedAt) : (current === "SCHEDULED" ? new Date(now) : scheduledAt);
  // scheduledAt opens the test for joining. The real duration starts when a
  // participant presses Start, so a delayed join cannot consume their time.
  const endsAt = test.endsAt ? new Date(test.endsAt) : null;
  if (current === "SCHEDULED" && now >= scheduledAt) return { status: "LIVE", startedAt, endsAt };
  if (current === "LIVE" && endsAt && now >= endsAt) return { status: "ENDED", startedAt, endsAt };
  return { status: current, startedAt: test.startedAt || null, endsAt: test.endsAt || null };
}

function assertAttemptTransition(from, to) {
  if (!ATTEMPT_STATUSES.has(from) || !ATTEMPT_STATUSES.has(to)) throw new Error("Invalid participant attempt status");
  const allowed = { INVITED: ["JOINED", "MISSED"], JOINED: ["STARTED", "MISSED"], STARTED: ["COMPLETED", "PARTIAL", "MISSED"], COMPLETED: [], PARTIAL: [], MISSED: [] };
  if (!allowed[from].includes(to)) throw new Error(`Invalid attempt transition: ${from} to ${to}`);
}

function nextLifecycleStatus(test, now = new Date()) {
  const transition = transitionTest(test, now);
  return transition.status === test.status ? null : transition;
}

function remainingAttemptSeconds(attempt, now = new Date()) {
  if (!attempt?.endsAt) return 0;
  return Math.max(0, Math.ceil((new Date(attempt.endsAt).getTime() - now.getTime()) / 1000));
}

function participantDeadline(test, startedAt = new Date()) {
  return new Date(new Date(startedAt).getTime() + Number(test?.durationSeconds || 0) * 1000);
}

function assertAttemptCanStart(test, attempt, now = new Date()) {
  if (test?.status !== "LIVE") throw new Error("Competitive test is not live");
  if (attempt?.status !== "JOINED") throw new Error("Participant must join before starting");
  if (test?.endsAt && remainingAttemptSeconds({ endsAt: test.endsAt }, now) <= 0) throw new Error("Competitive test has ended");
}

function competitiveTestVisibilityFilter({ groupId, userId, isOwner = false }) {
  if (isOwner) return { groupId };
  return { groupId, $or: [{ createdBy: userId }, { participantIds: userId }] };
}

module.exports = { TEST_TYPES, TEST_STATUSES, ATTEMPT_STATUSES, validateDefinition, transitionTest, nextLifecycleStatus, assertAttemptTransition, remainingAttemptSeconds, participantDeadline, assertAttemptCanStart, competitiveTestVisibilityFilter };
