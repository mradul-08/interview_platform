const { AccessToken } = require("livekit-server-sdk");
const MockInterview = require("../models/MockInterview");
const User = require("../models/User");
const { emitToUser } = require("../socket");

const MAX_PARTICIPANTS = 8;
const MAX_INVITED_PARTICIPANTS = MAX_PARTICIPANTS - 1;
const START_NOW_GRACE_MS = 10 * 60 * 1000;
const fail = (res, message, status = 500) => res.status(status).json({ success: false, message });

async function generateUniqueJoinCode() {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = MockInterview.generateJoinCode();
    // eslint-disable-next-line no-await-in-loop
    if (!(await MockInterview.exists({ joinCode: code }))) return code;
  }
  throw new Error("Could not generate a unique join code");
}

function endTime(interview) {
  const start = interview.startedAt || interview.scheduledAt;
  return new Date(start).getTime() + Number(interview.durationMinutes) * 60000;
}

function isExpired(interview) {
  return interview.status !== "LIVE" && endTime(interview) <= Date.now();
}

function summarize(interview, userId) {
  return {
    id: String(interview._id),
    title: interview.title,
    hostId: String(interview.hostId),
    isHost: String(interview.hostId) === String(userId),
    participantIds: (interview.participantIds || []).map(String),
    scheduledAt: interview.scheduledAt,
    durationMinutes: interview.durationMinutes,
    status: interview.status,
    joinCode: interview.joinCode,
    startedAt: interview.startedAt,
    endedAt: interview.endedAt,
    endsAt: endTime(interview),
    isPast: interview.status === "ENDED" || interview.status === "CANCELLED" || isExpired(interview),
  };
}

function notifyMembers(io, interview, event, payload) {
  [interview.hostId, ...(interview.participantIds || [])].forEach((userId) => emitToUser(io, userId, event, payload));
}

function validObjectId(value) {
  return /^[a-f\d]{24}$/i.test(String(value));
}

exports.createInterview = async (req, res) => {
  try {
    const title = String(req.body?.title || "").trim();
    const scheduledAt = req.body?.scheduledAt ? new Date(req.body.scheduledAt) : null;
    const durationMinutes = Number(req.body?.durationMinutes);
    if (!title) return fail(res, "Give the interview a title", 400);
    if (!scheduledAt || Number.isNaN(scheduledAt.getTime())) return fail(res, "A valid scheduled time is required", 400);
    if (scheduledAt.getTime() < Date.now() - START_NOW_GRACE_MS) return fail(res, "Choose a time within the last 10 minutes or in the future", 400);
    if (!Number.isInteger(durationMinutes) || durationMinutes < 10 || durationMinutes > 180) return fail(res, "Duration must be between 10 and 180 minutes", 400);

    const requested = Array.isArray(req.body?.participantIds) ? req.body.participantIds.filter(Boolean).map(String) : [];
    const participantIds = [...new Set(requested)].filter((id) => id !== String(req.user._id));
    if (participantIds.length > MAX_INVITED_PARTICIPANTS || participantIds.some((id) => !validObjectId(id))) return fail(res, "You can invite up to 7 valid participants", 400);
    if (participantIds.length) {
      const validUsers = await User.find({ _id: { $in: participantIds } }).select("_id").lean();
      if (validUsers.length !== participantIds.length) return fail(res, "One or more invited users could not be found", 400);
    }

    const interview = await MockInterview.create({ title, hostId: req.user._id, participantIds, scheduledAt, durationMinutes, joinCode: await generateUniqueJoinCode() });
    const payload = { interviewId: String(interview._id), title, scheduledAt, from: { id: String(req.user._id), name: req.user.name || "CodeVerse user" } };
    participantIds.forEach((participantId) => emitToUser(req.app.locals.io, participantId, "mock-interview:invited", payload));
    res.status(201).json({ success: true, interview: summarize(interview, req.user._id) });
  } catch (error) { console.error(error); fail(res, "Failed to schedule the mock interview"); }
};

exports.listInterviews = async (req, res) => {
  try {
    const interviews = await MockInterview.find({ $or: [{ hostId: req.user._id }, { participantIds: req.user._id }] }).sort({ scheduledAt: 1 }).lean();
    res.json({ success: true, interviews: interviews.map((interview) => summarize(interview, req.user._id)) });
  } catch (error) { console.error(error); fail(res, "Failed to load your mock interviews"); }
};

exports.getInterview = async (req, res) => {
  try {
    if (!validObjectId(req.params.interviewId)) return fail(res, "Mock interview not found", 404);
    const interview = await MockInterview.findById(req.params.interviewId);
    if (!interview) return fail(res, "Mock interview not found", 404);
    if (!interview.isMember(req.user._id)) return fail(res, "You are not part of this interview", 403);
    res.json({ success: true, interview: summarize(interview, req.user._id) });
  } catch (error) { console.error(error); fail(res, "Failed to load the mock interview"); }
};

exports.resolveJoinCode = async (req, res) => {
  try {
    const interview = await MockInterview.findOne({ joinCode: String(req.params.joinCode || "").trim().toLowerCase() });
    if (!interview) return fail(res, "This interview link is invalid or has expired", 404);
    if (interview.status === "ENDED" || interview.status === "CANCELLED" || isExpired(interview)) return fail(res, "This interview has already ended", 410);
    if (!interview.isMember(req.user._id)) return fail(res, "You haven't been invited to this interview", 403);
    res.json({ success: true, interview: summarize(interview, req.user._id) });
  } catch (error) { console.error(error); fail(res, "Failed to join via this link"); }
};

exports.createRoomToken = async (req, res) => {
  try {
    if (!process.env.LIVEKIT_URL || !process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET) return fail(res, "Video calling is not configured on the server", 503);
    const interview = await MockInterview.findById(req.params.interviewId);
    if (!interview) return fail(res, "Mock interview not found", 404);
    if (!interview.isMember(req.user._id)) return fail(res, "You are not part of this interview", 403);
    if (interview.status === "ENDED" || interview.status === "CANCELLED") return fail(res, "This interview has already ended", 410);
    if (interview.status === "LIVE" && endTime(interview) <= Date.now()) {
      interview.status = "ENDED"; interview.endedAt = new Date(); await interview.save();
      notifyMembers(req.app.locals.io, interview, "mock-interview:ended", { interviewId: String(interview._id) });
      return fail(res, "This interview time has ended", 410);
    }
    if (interview.status === "SCHEDULED" && endTime(interview) <= Date.now()) return fail(res, "This interview time has expired", 410);

    if (interview.status === "SCHEDULED") {
      const updated = await MockInterview.findOneAndUpdate({ _id: interview._id, status: "SCHEDULED" }, { $set: { status: "LIVE", startedAt: new Date() } }, { new: true });
      if (updated) interview.set(updated.toObject());
    }
    await MockInterview.updateOne({ _id: interview._id }, { $addToSet: { attendedByIds: req.user._id } });
    const remainingMinutes = Math.max(1, Math.ceil((endTime(interview) - Date.now()) / 60000));
    const token = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET, { identity: String(req.user._id), name: req.user.name || "Participant", ttl: `${remainingMinutes}m` });
    token.addGrant({ roomJoin: true, room: `mock-${interview._id}`, canPublish: true, canSubscribe: true, canPublishData: true });
    notifyMembers(req.app.locals.io, interview, "mock-interview:status-updated", { interviewId: String(interview._id), status: interview.status, startedAt: interview.startedAt });
    res.json({ success: true, token: await token.toJwt(), url: process.env.LIVEKIT_URL, roomName: `mock-${interview._id}`, interview: summarize(interview, req.user._id) });
  } catch (error) { console.error(error); fail(res, "Failed to create the room access token"); }
};

exports.endInterview = async (req, res) => {
  try {
    const interview = await MockInterview.findById(req.params.interviewId);
    if (!interview) return fail(res, "Mock interview not found", 404);
    if (String(interview.hostId) !== String(req.user._id)) return fail(res, "Only the host can end this interview", 403);
    if (interview.status === "ENDED" || interview.status === "CANCELLED") return res.json({ success: true, interview: summarize(interview, req.user._id) });
    interview.status = "ENDED"; interview.endedAt = new Date(); await interview.save();
    notifyMembers(req.app.locals.io, interview, "mock-interview:ended", { interviewId: String(interview._id) });
    res.json({ success: true, interview: summarize(interview, req.user._id) });
  } catch (error) { console.error(error); fail(res, "Failed to end the mock interview"); }
};

exports.cancelInterview = async (req, res) => {
  try {
    const interview = await MockInterview.findById(req.params.interviewId);
    if (!interview) return fail(res, "Mock interview not found", 404);
    if (String(interview.hostId) !== String(req.user._id)) return fail(res, "Only the host can cancel this interview", 403);
    if (interview.status === "LIVE") return fail(res, "Cannot cancel an interview that is already live — end it instead", 409);
    if (interview.status === "ENDED" || interview.status === "CANCELLED") return res.json({ success: true, interview: summarize(interview, req.user._id) });
    interview.status = "CANCELLED"; await interview.save();
    notifyMembers(req.app.locals.io, interview, "mock-interview:cancelled", { interviewId: String(interview._id) });
    res.json({ success: true, interview: summarize(interview, req.user._id) });
  } catch (error) { console.error(error); fail(res, "Failed to cancel the mock interview"); }
};
