const test = require("node:test");
const assert = require("node:assert/strict");
const { remainingAttemptSeconds } = require("../services/competitiveTestService");

test("competitive Aptitude sessions use the participant attempt deadline", () => {
  const now = new Date("2026-08-20T10:05:00Z");
  assert.equal(remainingAttemptSeconds({ endsAt: "2026-08-20T10:10:00Z" }, now), 300);
});
