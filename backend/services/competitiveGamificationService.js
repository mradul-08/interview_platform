const CompetitiveTest = require("../models/CompetitiveTest");
const CompetitiveTestAttempt = require("../models/CompetitiveTestAttempt");
const GroupCompetitiveStreak = require("../models/GroupCompetitiveStreak");
const { awardPoints } = require("./gamificationService");
const { toUtcDateKey, addDays } = require("../utils/streakDates");
const { PARTICIPANT_COMPLETION_POINTS } = require("../config/competitiveTestGamification");

function nextGroupStreak(previous, qualifiedDate) {
  if (!previous?.lastQualifiedDate) return 1;
  if (previous.lastQualifiedDate === qualifiedDate) return previous.currentStreak || 1;
  return previous.lastQualifiedDate === addDays(qualifiedDate, -1) ? (previous.currentStreak || 0) + 1 : 1;
}

function qualifyingParticipantIds(attempts = []) {
  return new Set(attempts.filter((attempt) => ["COMPLETED", "PARTIAL"].includes(attempt.status)).map((attempt) => String(attempt.participantId)));
}

async function qualifyCompetitiveGroupTest(testId) {
  const test = await CompetitiveTest.findOne({ _id: testId, status: "RESULTS_AVAILABLE" }).lean();
  if (!test || !test.participantIds?.length) return { qualified: false, reason: "test-not-eligible" };
  const attempts = await CompetitiveTestAttempt.find({ testId: test._id, participantId: { $in: test.participantIds } }).select("participantId status").lean();
  const pointEligible = qualifyingParticipantIds(attempts);
  const fullyCompleted = new Set(attempts.filter((attempt) => attempt.status === "COMPLETED").map((attempt) => String(attempt.participantId)));
  await Promise.all([...pointEligible].map((participantId) => awardPoints({
    userId: participantId,
    amount: PARTICIPANT_COMPLETION_POINTS,
    type: "COMPETITIVE_TEST_COMPLETION",
    reason: `${fullyCompleted.has(participantId) ? "Completed" : "Participated in"} study group test: ${test.title}`,
    sourceId: test._id,
    idempotencyKey: `competitive-test-completion:${String(test._id)}:${participantId}`,
    metadata: { groupId: String(test.groupId), fullyCompleted: fullyCompleted.has(participantId) },
  })));
  if (fullyCompleted.size !== test.participantIds.length) return { qualified: false, reason: "not-all-participants-completed", pointsAwardedTo: [...pointEligible] };

  const qualifiedDate = toUtcDateKey(test.endsAt || test.scheduledAt || new Date());
  const streak = await GroupCompetitiveStreak.findOne({ groupId: test.groupId }).lean();
  const currentStreak = nextGroupStreak(streak, qualifiedDate);
  const recorded = await GroupCompetitiveStreak.updateOne(
    { groupId: test.groupId, qualifiedTestIds: { $ne: test._id } },
    { $setOnInsert: { groupId: test.groupId }, $set: { currentStreak, longestStreak: Math.max(streak?.longestStreak || 0, currentStreak), lastQualifiedDate: qualifiedDate }, $addToSet: { qualifiedTestIds: test._id } },
    { upsert: true },
  );
  if (recorded.modifiedCount !== 1 && recorded.upsertedCount !== 1) return { qualified: true, duplicate: true, currentStreak };

  return { qualified: true, duplicate: false, currentStreak };
}

module.exports = { nextGroupStreak, qualifyingParticipantIds, qualifyCompetitiveGroupTest };
