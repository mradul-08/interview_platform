const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeScoring, componentScore, rankResults, resultStatus } = require("../services/competitiveResultsService");
const { hasCompletedComponents, shouldCompleteCompetitiveAttempt } = require("../services/competitiveAttemptCompletionService");
const { buildCompetitiveProgress } = require("../services/competitiveProgressService");

test("normalizes DSA, Aptitude, and mixed component scores", () => {
  assert.deepEqual(componentScore({ test: { problemIds: ["p1", "p2"], aptitudeQuestionIds: [] }, acceptedCount: 1 }), { score: 50, dsa: 50, aptitude: null, dsaTotal: 2, aptitudeTotal: 0 });
  assert.equal(componentScore({ test: { problemIds: [], aptitudeQuestionIds: ["q1", "q2"] }, aptitudeScore: 1 }).score, 50);
  assert.equal(componentScore({ test: { problemIds: ["p1"], aptitudeQuestionIds: ["q1"] }, acceptedCount: 1, aptitudeScore: 1 }).score, 100);
});

test("applies safe configurable scoring weights", () => {
  assert.deepEqual(normalizeScoring({}, true, true), { dsa: 50, aptitude: 50 });
  assert.deepEqual(normalizeScoring({ dsa: 70, aptitude: 30 }, true, true), { dsa: 70, aptitude: 30 });
  assert.equal(componentScore({ test: { problemIds: ["p1"], aptitudeQuestionIds: ["q1"], scoring: { dsa: 70, aptitude: 30 } }, acceptedCount: 1, aptitudeScore: 0 }).score, 70);
  assert.equal(componentScore({ test: { problemIds: ["p1"], aptitudeQuestionIds: ["q1"], scoring: { dsa: -1, aptitude: Infinity } }, acceptedCount: 1, aptitudeScore: 1 }).score, 100);
  assert.deepEqual(normalizeScoring({ dsa: 70, aptitude: 30 }, true, false), { dsa: 100, aptitude: 0 });
});

test("ranks deterministically by score, completion time, then participant ID", () => {
  const ranked = rankResults([{ participantId: "b", score: 90, completionTimeSeconds: 80 }, { participantId: "a", score: 90, completionTimeSeconds: 80 }, { participantId: "c", score: 80, completionTimeSeconds: 20 }]);
  assert.deepEqual(ranked.map((row) => [row.participantId, row.rank]), [["a", 1], ["b", 2], ["c", 3]]);
});

test("keeps no-shows, partial attempts, and completed attempts distinct", () => {
  assert.equal(resultStatus({ attemptStatus: "INVITED", completed: false }), "MISSED");
  assert.equal(resultStatus({ attemptStatus: "JOINED", completed: false }), "MISSED");
  assert.equal(resultStatus({ attemptStatus: "MISSED", completed: false }), "MISSED");
  assert.equal(resultStatus({ attemptStatus: "STARTED", completed: false }), "PARTIAL");
  assert.equal(resultStatus({ attemptStatus: "PARTIAL", completed: false }), "PARTIAL");
  assert.equal(resultStatus({ attemptStatus: "STARTED", completed: true }), "COMPLETED");
});

test("mixed attempts complete only after both persisted components are complete", () => {
  const testDefinition = { problemIds: ["p1", "p2"], aptitudeQuestionIds: ["q1", "q2"] };
  assert.equal(hasCompletedComponents({ test: testDefinition, acceptedProblemIds: ["p1", "p2"], aptitudeCompleted: false }), false);
  assert.equal(hasCompletedComponents({ test: testDefinition, acceptedProblemIds: ["p1"], aptitudeCompleted: true }), false);
  assert.equal(hasCompletedComponents({ test: testDefinition, acceptedProblemIds: ["p1", "p2"], aptitudeCompleted: true }), true);
});

test("single-component attempts remain compatible with shared completion rules", () => {
  assert.equal(hasCompletedComponents({ test: { problemIds: ["p1"], aptitudeQuestionIds: [] }, acceptedProblemIds: ["p1"], aptitudeCompleted: false }), true);
  assert.equal(hasCompletedComponents({ test: { problemIds: [], aptitudeQuestionIds: ["q1"] }, acceptedProblemIds: [], aptitudeCompleted: true }), true);
  assert.equal(hasCompletedComponents({ test: { problemIds: [], aptitudeQuestionIds: ["q1"] }, acceptedProblemIds: [], aptitudeCompleted: false }), false);
});

test("already completed attempts are not eligible for a second completion transition", () => {
  assert.equal(shouldCompleteCompetitiveAttempt({ status: "COMPLETED", test: { problemIds: ["p1"], aptitudeQuestionIds: [] }, acceptedProblemIds: ["p1"] }), false);
  assert.equal(shouldCompleteCompetitiveAttempt({ status: "STARTED", test: { problemIds: ["p1"], aptitudeQuestionIds: [] }, acceptedProblemIds: ["p1"] }), true);
});

test("competitive progress exposes safe aggregate state without private answers", () => {
  const progress = buildCompetitiveProgress({
    test: { problemIds: ["p1", "p2"], aptitudeQuestionIds: ["q1"] },
    attempts: [
      { _id: "a1", participantId: { _id: "u1", name: "Mayur" }, status: "STARTED", endsAt: "2026-08-20T10:10:00Z" },
      { _id: "a2", participantId: { _id: "u2", name: "Shikhar" }, status: "COMPLETED", completedAt: "2026-08-20T10:08:00Z" },
    ],
    acceptedByAttempt: new Map([["a1", ["p1"]]]),
    answeredByAttempt: new Map([["a1", ["q1"]]]),
    now: new Date("2026-08-20T10:05:00Z"),
  });
  assert.deepEqual(progress.summary, { invited: 0, joined: 0, started: 1, completed: 1, missed: 0 });
  assert.deepEqual(progress.participants[0].dsa, { solved: 1, total: 2 });
  assert.deepEqual(progress.participants[0].aptitude, { answered: 1, total: 1 });
  assert.equal("answers" in progress.participants[0], false);
});
