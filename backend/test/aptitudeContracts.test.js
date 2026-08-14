const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeSubmissionId, validateSelectedAnswer, validateSubmissionReuse, authoritativeTimeSeconds } = require("../services/aptitudeContracts");

test("normalizes and validates idempotency keys", () => {
  assert.equal(normalizeSubmissionId("  abc-123  "), "abc-123");
  assert.equal(normalizeSubmissionId(undefined), null);
  assert.throws(() => normalizeSubmissionId(" "), /non-empty/);
  assert.throws(() => normalizeSubmissionId("x".repeat(101)), /at most 100/);
});

test("accepts only aptitude answer values", () => {
  for (const answer of ["A", "B", "C", "D", null, undefined]) assert.doesNotThrow(() => validateSelectedAnswer(answer));
  assert.throws(() => validateSelectedAnswer("E"), /selectedAnswer/);
});

test("binds idempotency keys to the original question and session", () => {
  assert.doesNotThrow(() => validateSubmissionReuse({ questionId: "q1", sessionId: "s1" }, { questionId: "q1", sessionId: "s1" }));
  assert.throws(() => validateSubmissionReuse({ questionId: "q1", sessionId: "s1" }, { questionId: "q2", sessionId: "s1" }), /bound/);
  assert.throws(() => validateSubmissionReuse({ questionId: "q1", sessionId: "s1" }, { questionId: "q1", sessionId: "s2" }), /bound/);
});

test("calculates elapsed time from the server clock and clamps it", () => {
  const now = new Date("2026-08-06T12:00:20.000Z");
  assert.equal(authoritativeTimeSeconds({ now, startedAt: new Date("2026-08-06T12:00:00.000Z") }), 20);
  assert.equal(authoritativeTimeSeconds({ now, startedAt: new Date("2026-08-06T12:00:30.000Z") }), 0);
  assert.equal(authoritativeTimeSeconds({ now, startedAt: new Date("2026-08-06T00:00:00.000Z") }), 3600);
});
