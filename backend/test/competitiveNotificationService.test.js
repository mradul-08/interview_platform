const test = require("node:test");
const assert = require("node:assert/strict");
const { buildCompetitiveNotification } = require("../services/competitiveNotificationService");

test("competitive notification keys are unique per test, participant, and event", () => {
  const testDefinition = { _id: "test-1", groupId: "group-1", title: "Sprint" };
  const scheduled = buildCompetitiveNotification({ test: testDefinition, participantId: "user-1", event: "scheduled" });
  const live = buildCompetitiveNotification({ test: testDefinition, participantId: "user-1", event: "live" });
  assert.equal(scheduled.type, "competitive_test_scheduled");
  assert.notEqual(scheduled.dedupeKey, live.dedupeKey);
  assert.match(scheduled.body, /Sprint/);
});
