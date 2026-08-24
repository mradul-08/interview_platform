const CompetitiveTest = require("../models/CompetitiveTest");
const CompetitiveTestAttempt = require("../models/CompetitiveTestAttempt");
const { nextLifecycleStatus } = require("./competitiveTestService");
const { finalizeCompetitiveTest } = require("./competitiveResultsService");
const { notifyCompetitiveTest } = require("./competitiveNotificationService");

const timers = new Map();

function emitLifecycle(io, test) {
  io?.to(`study-group:${String(test.groupId)}`).emit("group:test", {
    testId: String(test._id),
    groupId: String(test.groupId),
    status: test.status,
    scheduledAt: test.scheduledAt,
    startedAt: test.startedAt,
    endsAt: test.endsAt,
  });
}

async function reconcileCompetitiveTest(testId, io, now = new Date()) {
  const test = await CompetitiveTest.findById(testId);
  if (!test) return null;
  if (test.status === "LIVE" && test.endsAt && new Date(test.endsAt) <= now) {
    const activeAttempts = await CompetitiveTestAttempt.find({ testId: test._id, status: "STARTED", endsAt: { $gt: now } }).select("endsAt").lean();
    if (activeAttempts.length) {
      const latestDeadline = activeAttempts.reduce((latest, attempt) => (new Date(attempt.endsAt) > latest ? new Date(attempt.endsAt) : latest), new Date(test.endsAt));
      const extended = await CompetitiveTest.findOneAndUpdate(
        { _id: test._id, status: "LIVE" },
        { $set: { endsAt: latestDeadline } },
        { returnDocument: "after" },
      );
      if (extended) {
        emitLifecycle(io, extended);
        return extended;
      }
    }
  }
  const transition = nextLifecycleStatus(test, now);
  if (!transition) return test;
  const update = { status: transition.status };
  if (transition.startedAt) update.startedAt = transition.startedAt;
  if (transition.endsAt) update.endsAt = transition.endsAt;
  const updated = await CompetitiveTest.findOneAndUpdate(
    { _id: test._id, status: test.status },
    { $set: update },
    { returnDocument: "after" },
  );
  if (!updated) return CompetitiveTest.findById(test._id);
  if (updated.status === "LIVE") await notifyCompetitiveTest({ test: updated, event: "live", io });
  if (updated.status === "ENDED") {
    // Completed participants must remain completed. Active attempts are
    // finalized below so scoring can inspect their persisted submissions.
    await CompetitiveTestAttempt.updateMany(
      { testId: updated._id, status: { $in: ["INVITED", "JOINED"] } },
      { $set: { status: "MISSED" } },
    );
    await notifyCompetitiveTest({ test: updated, event: "ended", io });
    return finalizeCompetitiveTest(updated._id, io);
  }
  emitLifecycle(io, updated);
  return updated;
}

function clearLifecycleTimer(testId) {
  const timer = timers.get(String(testId));
  if (timer) clearTimeout(timer);
  timers.delete(String(testId));
}

function scheduleCompetitiveTest(test, io) {
  clearLifecycleTimer(test._id);
  if (test.status === "LIVE" && !test.endsAt) return;
  const target = test.status === "SCHEDULED" ? new Date(test.scheduledAt) : new Date(test.endsAt || 0);
  const delay = Math.max(0, target.getTime() - Date.now());
  const timer = setTimeout(async () => {
    timers.delete(String(test._id));
    try {
      const updated = await reconcileCompetitiveTest(test._id, io);
      if (updated && ["SCHEDULED", "LIVE"].includes(updated.status)) scheduleCompetitiveTest(updated, io);
    } catch (error) {
      console.error("Competitive test lifecycle transition failed:", error.message);
      scheduleCompetitiveTest(test, io);
    }
  }, Math.min(delay, 2_147_000_000));
  timers.set(String(test._id), timer);
}

async function startCompetitiveTestLifecycle(io) {
  const tests = await CompetitiveTest.find({ status: { $in: ["SCHEDULED", "LIVE"] } });
  for (const test of tests) {
    const updated = await reconcileCompetitiveTest(test._id, io);
    if (updated && ["SCHEDULED", "LIVE"].includes(updated.status)) scheduleCompetitiveTest(updated, io);
  }
}

module.exports = { reconcileCompetitiveTest, scheduleCompetitiveTest, startCompetitiveTestLifecycle, clearLifecycleTimer };
