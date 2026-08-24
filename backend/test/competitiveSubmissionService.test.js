const test = require("node:test");
const assert = require("node:assert/strict");
const { assertCompetitiveSubmissionWindow } = require("../services/competitiveSubmissionService");

const baseTest = { status: "LIVE", problemIds: ["problem-1"], participantIds: ["user-1"] };
const baseAttempt = { status: "STARTED", participantId: "user-1", endsAt: "2026-08-20T10:10:00Z" };

test("accepts only an assigned active competitive DSA submission", () => {
  assert.doesNotThrow(() => assertCompetitiveSubmissionWindow({ test: baseTest, attempt: baseAttempt, problemId: "problem-1", now: new Date("2026-08-20T10:05:00Z") }));
  assert.throws(() => assertCompetitiveSubmissionWindow({ test: baseTest, attempt: baseAttempt, problemId: "problem-2", now: new Date("2026-08-20T10:05:00Z") }), /assigned/);
});

test("rejects non-live, non-started, and expired competitive submissions", () => {
  const now = new Date("2026-08-20T10:05:00Z");
  assert.throws(() => assertCompetitiveSubmissionWindow({ test: { ...baseTest, status: "ENDED" }, attempt: baseAttempt, problemId: "problem-1", now }), /not live/);
  assert.throws(() => assertCompetitiveSubmissionWindow({ test: baseTest, attempt: { ...baseAttempt, status: "JOINED" }, problemId: "problem-1", now }), /not active/);
  assert.throws(() => assertCompetitiveSubmissionWindow({ test: baseTest, attempt: { ...baseAttempt, endsAt: "2026-08-20T10:05:00Z" }, problemId: "problem-1", now }), /deadline/);
});
