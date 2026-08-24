const test = require("node:test");
const assert = require("node:assert/strict");
const { nextGroupStreak, qualifyingParticipantIds } = require("../services/competitiveGamificationService");

test("group streak starts, continues on the next day, and does not duplicate same-day activity", () => {
  assert.equal(nextGroupStreak(null, "2026-08-20"), 1);
  assert.equal(nextGroupStreak({ currentStreak: 2, lastQualifiedDate: "2026-08-19" }, "2026-08-20"), 3);
  assert.equal(nextGroupStreak({ currentStreak: 2, lastQualifiedDate: "2026-08-20" }, "2026-08-20"), 2);
  assert.equal(nextGroupStreak({ currentStreak: 8, lastQualifiedDate: "2026-08-10" }, "2026-08-20"), 1);
});

test("completed and partial attempts qualify for individual completion points", () => {
  const qualified = qualifyingParticipantIds([
    { participantId: "u1", status: "COMPLETED" },
    { participantId: "u2", status: "PARTIAL" },
    { participantId: "u3", status: "MISSED" },
    { participantId: "u4", status: "COMPLETED" },
  ]);
  assert.deepEqual([...qualified].sort(), ["u1", "u2", "u4"]);
});
