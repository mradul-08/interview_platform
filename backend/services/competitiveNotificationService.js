const Notification = require("../models/Notification");

const EVENT_CONFIG = {
  scheduled: { type: "competitive_test_scheduled", title: "Competitive test scheduled", body: (test) => `${test.title} has been scheduled for your Study Group.` },
  live: { type: "competitive_test_live", title: "Competitive test is live", body: (test) => `${test.title} is now live. Open the test to begin.` },
  ended: { type: "competitive_test_ended", title: "Competitive test ended", body: (test) => `${test.title} has ended. Results will be available after evaluation.` },
  results: { type: "competitive_test_results", title: "Competitive test results available", body: (test) => `Results for ${test.title} are now available.` },
};

function buildCompetitiveNotification({ test, participantId, event }) {
  const config = EVENT_CONFIG[event];
  if (!config) throw new Error("Unsupported competitive notification event");
  return {
    userId: participantId,
    groupId: test.groupId,
    competitiveTestId: test._id,
    type: config.type,
    title: config.title,
    body: config.body(test),
    dedupeKey: `competitive-test:${String(test._id)}:${String(participantId)}:${event}`,
  };
}

async function notifyCompetitiveTest({ test, event, participantIds = test.participantIds, io }) {
  const notifications = [];
  for (const participantId of participantIds || []) {
    try {
      const payload = buildCompetitiveNotification({ test, participantId, event });
      const result = await Notification.updateOne({ dedupeKey: payload.dedupeKey }, { $setOnInsert: payload }, { upsert: true });
      if (result.upsertedCount !== 1) continue;
      const notification = await Notification.findOne({ dedupeKey: payload.dedupeKey }).lean();
      notifications.push(notification);
      io?.to(`user:${String(participantId)}`).emit("notifications:updated", { reason: payload.type, notification });
    } catch (error) {
      if (error?.code !== 11000) console.error("Competitive notification failed:", error.message);
    }
  }
  return notifications;
}

module.exports = { EVENT_CONFIG, buildCompetitiveNotification, notifyCompetitiveTest };
