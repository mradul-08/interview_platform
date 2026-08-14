require("dotenv").config();
const mongoose = require("mongoose");
const AptitudeSession = require("../models/AptitudeSession");
const AptitudeAttempt = require("../models/AptitudeAttempt");

async function main() {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is missing");
  await mongoose.connect(process.env.MONGO_URI);

  const [activeSessions, duplicateQuestionAttempts, duplicateSubmissionIds] = await Promise.all([
    AptitudeSession.aggregate([
      { $match: { status: "ACTIVE" } },
      { $group: { _id: "$userId", count: { $sum: 1 }, sessionIds: { $push: "$_id" } } },
      { $match: { count: { $gt: 1 } } },
    ]),
    AptitudeAttempt.aggregate([
      { $match: { sessionId: { $type: "objectId" } } },
      { $group: { _id: { sessionId: "$sessionId", questionId: "$questionId" }, count: { $sum: 1 }, attemptIds: { $push: "$_id" } } },
      { $match: { count: { $gt: 1 } } },
    ]),
    AptitudeAttempt.aggregate([
      { $match: { submissionId: { $type: "string", $ne: "" } } },
      { $group: { _id: { userId: "$userId", submissionId: "$submissionId" }, count: { $sum: 1 }, attemptIds: { $push: "$_id" } } },
      { $match: { count: { $gt: 1 } } },
    ]),
  ]);

  const report = {
    ok: activeSessions.length === 0 && duplicateQuestionAttempts.length === 0 && duplicateSubmissionIds.length === 0,
    activeSessionConflicts: activeSessions,
    duplicateQuestionAttempts,
    duplicateSubmissionIds,
  };
  console.log(JSON.stringify(report, null, 2));
  await mongoose.disconnect();
  if (!report.ok) process.exitCode = 2;
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => {});
  process.exitCode = 1;
});
