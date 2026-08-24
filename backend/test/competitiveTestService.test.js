const test = require("node:test");
const assert = require("node:assert/strict");
const { validateDefinition, transitionTest, assertAttemptTransition, remainingAttemptSeconds, participantDeadline, assertAttemptCanStart, competitiveTestVisibilityFilter } = require("../services/competitiveTestService");

test("validates the three supported competitive test shapes", () => {
  assert.doesNotThrow(() => validateDefinition({ type: "DSA", problemIds: ["p1"], durationSeconds: 600, scheduledAt: "2026-08-20T10:00:00Z" }));
  assert.doesNotThrow(() => validateDefinition({ type: "APTITUDE", aptitudeQuestionIds: ["q1"], durationSeconds: 600, scheduledAt: "2026-08-20T10:00:00Z" }));
  assert.doesNotThrow(() => validateDefinition({ type: "DSA_APTITUDE", problemIds: ["p1"], aptitudeQuestionIds: ["q1"], durationSeconds: 600, scheduledAt: "2026-08-20T10:00:00Z" }));
  assert.throws(() => validateDefinition({ type: "DSA", durationSeconds: 600, scheduledAt: "2026-08-20T10:00:00Z" }), /problem/);
});

test("transitions lifecycle from persisted server timestamps", () => {
  const scheduled = { status: "SCHEDULED", scheduledAt: "2026-08-20T10:00:00Z", durationSeconds: 600 };
  const live = transitionTest(scheduled, new Date("2026-08-20T10:00:01Z"));
  assert.equal(live.status, "LIVE");
  assert.equal(live.startedAt.toISOString(), "2026-08-20T10:00:01.000Z");
  assert.equal(live.endsAt, null);
  assert.equal(transitionTest({ ...scheduled, ...live }, new Date("2026-08-20T10:10:01Z")).status, "LIVE");
});

test("scheduled tests stay open until a participant starts", () => {
  const scheduled = { status: "SCHEDULED", scheduledAt: "2026-08-20T10:00:00Z", durationSeconds: 600 };
  const live = transitionTest(scheduled, new Date("2026-08-20T10:09:40Z"));
  assert.equal(live.startedAt.toISOString(), "2026-08-20T10:09:40.000Z");
  assert.equal(live.endsAt, null);
  const afterStart = { ...live, endsAt: participantDeadline(scheduled, new Date("2026-08-20T10:09:40Z")) };
  assert.equal(transitionTest({ ...afterStart, status: "LIVE" }, new Date("2026-08-20T10:19:40Z")).status, "ENDED");
});

test("allows only forward participant lifecycle transitions", () => {
  assert.doesNotThrow(() => assertAttemptTransition("INVITED", "JOINED"));
  assert.doesNotThrow(() => assertAttemptTransition("STARTED", "COMPLETED"));
  assert.throws(() => assertAttemptTransition("COMPLETED", "STARTED"), /Invalid attempt transition/);
});

test("enforces server-side participant start and deadline rules", () => {
  const now = new Date("2026-08-20T10:05:00Z");
  const testDefinition = { status: "LIVE", endsAt: "2026-08-20T10:10:00Z" };
  assert.doesNotThrow(() => assertAttemptCanStart(testDefinition, { status: "JOINED" }, now));
  assert.doesNotThrow(() => assertAttemptCanStart({ status: "LIVE", endsAt: null }, { status: "JOINED" }, now));
  assert.equal(remainingAttemptSeconds(testDefinition, now), 300);
  assert.throws(() => assertAttemptCanStart(testDefinition, { status: "INVITED" }, now), /join/);
  assert.throws(() => assertAttemptCanStart({ ...testDefinition, endsAt: "2026-08-20T10:00:00Z" }, { status: "JOINED" }, now), /ended/);
});

test("gives each participant the full configured duration from Start", () => {
  const deadline = participantDeadline({ durationSeconds: 600 }, new Date("2026-08-20T10:09:40Z"));
  assert.equal(deadline.toISOString(), "2026-08-20T10:19:40.000Z");
});

test("competitive visibility includes the creator and owner but does not widen participant actions", () => {
  assert.deepEqual(competitiveTestVisibilityFilter({ groupId: "g1", userId: "u1", isOwner: true }), { groupId: "g1" });
  assert.deepEqual(competitiveTestVisibilityFilter({ groupId: "g1", userId: "u1", isOwner: false }), { groupId: "g1", $or: [{ createdBy: "u1" }, { participantIds: "u1" }] });
});
