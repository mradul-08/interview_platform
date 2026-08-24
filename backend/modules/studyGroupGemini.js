const express = require("express");
const mongoose = require("mongoose");
const crypto = require("crypto");
const { protect } = require("../middleware/authMiddleware");
const DeveloperProfile = require("../models/DeveloperProfile");
const Notification = require("../models/Notification");
const Problem = require("../models/Problem");
const AptitudeQuestion = require("../models/AptitudeQuestion");
const CompetitiveTest = require("../models/CompetitiveTest");
const CompetitiveTestAttempt = require("../models/CompetitiveTestAttempt");
const Submission = require("../models/submission");
const AptitudeSession = require("../models/AptitudeSession");
const AptitudeAttempt = require("../models/AptitudeAttempt");
const { validateDefinition, assertAttemptCanStart, remainingAttemptSeconds, participantDeadline, competitiveTestVisibilityFilter } = require("../services/competitiveTestService");
const { VISIBLE_QUESTION_STATUSES } = require("../services/aptitudeService");
const { reconcileCompetitiveTest, scheduleCompetitiveTest } = require("../services/competitiveTestLifecycle");
const { finalizeCompetitiveTest } = require("../services/competitiveResultsService");
const { notifyCompetitiveTest } = require("../services/competitiveNotificationService");
const { getCompetitiveProgress, emitCompetitiveProgress } = require("../services/competitiveProgressService");

const { Schema } = mongoose;
const groupSchema = new Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  description: { type: String, trim: true, maxlength: 500 },
  topic: { type: String, trim: true },
  isPublic: { type: Boolean, default: true },
  ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  bannerUrl: { type: String, trim: true, maxlength: 2000, default: "" },
  accentColor: { type: String, trim: true, match: /^#[0-9a-fA-F]{6}$/, default: "#f5a623" },
  avatarText: { type: String, trim: true, maxlength: 30, default: "" },
  bannerZoom: { type: Number, min: 0.6, max: 1.6, default: 1 },
}, { timestamps: true });
const memberSchema = new Schema({
  groupId: { type: Schema.Types.ObjectId, ref: "GeminiStudyGroup", required: true },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  role: { type: String, enum: ["OWNER", "MEMBER"], default: "MEMBER" },
  status: { type: String, enum: ["PENDING", "APPROVED"], default: "PENDING" },
}, { timestamps: true });
const messageSchema = new Schema({
  groupId: { type: Schema.Types.ObjectId, ref: "GeminiStudyGroup", required: true, index: true },
  authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  content: { type: String, required: true, trim: true, maxlength: 4000 },
  deliveredTo: [{ _id: false, userId: { type: Schema.Types.ObjectId, ref: "User" }, at: { type: Date } }],
  readBy: [{ _id: false, userId: { type: Schema.Types.ObjectId, ref: "User" }, at: { type: Date } }],
}, { timestamps: true });
const inviteSchema = new Schema({
  groupId: { type: Schema.Types.ObjectId, ref: "GeminiStudyGroup", required: true, index: true },
  createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  token: { type: String, required: true, unique: true, index: true },
  expiresAt: { type: Date, required: true, index: true },
  acceptedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  acceptedAt: { type: Date, default: null },
}, { timestamps: true });

memberSchema.index({ groupId: 1, userId: 1 }, { unique: true });
memberSchema.index({ userId: 1, status: 1 });
groupSchema.index({ isPublic: 1, createdAt: -1 });

const Group = mongoose.models.GeminiStudyGroup || mongoose.model("GeminiStudyGroup", groupSchema);
const Member = mongoose.models.GeminiStudyGroupMember || mongoose.model("GeminiStudyGroupMember", memberSchema);
const Message = mongoose.models.GeminiStudyGroupMessage || mongoose.model("GeminiStudyGroupMessage", messageSchema);
const Invite = mongoose.models.GeminiStudyGroupInvite || mongoose.model("GeminiStudyGroupInvite", inviteSchema);

function activeChatUsers(io, groupId) {
  const room = io?.sockets?.adapter?.rooms?.get(`study-group-chat:${String(groupId)}`);
  if (!room) return new Set();
  return new Set([...room].map((socketId) => io.sockets.sockets.get(socketId)?.data.userId).filter(Boolean).map(String));
}

const groupNotificationQueues = new Map();

async function upsertGroupMessageNotification({ recipientId, group, senderId, preview }) {
  const aggregationCutoff = new Date(Date.now() - 3000);
  let notification = await Notification.findOneAndUpdate(
    { userId: recipientId, groupId: group._id, type: "study_group_message", readAt: null, updatedAt: { $gte: aggregationCutoff } },
    { $inc: { groupMessageCount: 1 }, $addToSet: { groupMessageSenderIds: senderId } },
    { returnDocument: "after", sort: { updatedAt: -1 } },
  );
  if (!notification) {
    notification = await Notification.create({ userId: recipientId, groupId: group._id, type: "study_group_message", groupName: group.name, groupMessageCount: 1, groupMessageSenderIds: [senderId], title: `${group.name} — 1 new message`, body: preview });
  } else {
    const messageCount = notification.groupMessageCount || 1;
    const senderCount = notification.groupMessageSenderIds?.length || 1;
    notification = await Notification.findOneAndUpdate({ _id: notification._id }, { $set: { title: `${group.name} — ${messageCount} new message${messageCount === 1 ? "" : "s"} from ${senderCount} member${senderCount === 1 ? "" : "s"}`, body: "New messages in the group chat" } }, { returnDocument: "after" });
  }
  return notification;
}

function queueGroupMessageNotification(options) {
  const key = `${String(options.recipientId)}:${String(options.group._id)}`;
  const previous = groupNotificationQueues.get(key) || Promise.resolve();
  const current = previous.catch(() => {}).then(() => upsertGroupMessageNotification(options));
  groupNotificationQueues.set(key, current);
  return current.finally(() => { if (groupNotificationQueues.get(key) === current) groupNotificationQueues.delete(key); });
}

function id(req) { return req.user._id; }

async function approvedGroupMember(groupId, userId) {
  return Member.exists({ groupId, userId, status: "APPROVED" });
}

function uniqueIds(values) {
  return [...new Set((Array.isArray(values) ? values : []).map((value) => String(value)).filter(Boolean))];
}

async function validateCompetitiveReferences({ type, problemIds, aptitudeQuestionIds }) {
  const [problems, questions] = await Promise.all([
    problemIds.length ? Problem.find({ _id: { $in: problemIds } }).select("_id").lean() : [],
    aptitudeQuestionIds.length ? AptitudeQuestion.find({ _id: { $in: aptitudeQuestionIds }, qualityStatus: { $in: VISIBLE_QUESTION_STATUSES } }).select("_id").lean() : [],
  ]);
  if (problems.length !== problemIds.length) throw Object.assign(new Error("One or more selected DSA problems are unavailable"), { status: 400 });
  if (questions.length !== aptitudeQuestionIds.length) throw Object.assign(new Error("One or more selected Aptitude questions are unavailable"), { status: 400 });
  if (type === "DSA" && aptitudeQuestionIds.length) throw Object.assign(new Error("DSA tests cannot include Aptitude questions"), { status: 400 });
  if (type === "APTITUDE" && problemIds.length) throw Object.assign(new Error("Aptitude tests cannot include DSA problems"), { status: 400 });
}
async function enrichMemberAvatars(members) {
  const userIds = members.map((member) => member.userId?._id || member.userId).filter(Boolean);
  if (!userIds.length) return members;
  const profiles = await DeveloperProfile.find({ userId: { $in: userIds } }).select("userId username avatar").lean();
  const profileByUser = new Map(profiles.map((profile) => [String(profile.userId), profile]));
  return members.map((member) => {
    if (!member.userId) return member;
    const profile = profileByUser.get(String(member.userId._id));
    const avatarUrl = profile?.avatar?.url || member.userId.avatarUrl || "";
    const username = member.userId.username || profile?.username || "";
    return { ...member, userId: { ...member.userId, username, avatarUrl } };
  });
}
async function enrichMessageAvatars(messages) {
  const list = Array.isArray(messages) ? messages : [messages];
  const userIds = list.map((message) => message?.authorId?._id || message?.authorId).filter(Boolean);
  if (!userIds.length) return messages;
  const profiles = await DeveloperProfile.find({ userId: { $in: userIds } }).select("userId avatar").lean();
  const avatarByUser = new Map(profiles.map((profile) => [String(profile.userId), profile.avatar?.url || ""]));
  const enriched = list.map((message) => {
    const plain = typeof message?.toObject === "function" ? message.toObject() : message;
    if (!plain?.authorId) return plain;
    const avatarUrl = avatarByUser.get(String(plain.authorId._id || plain.authorId));
    if (avatarUrl === undefined) return plain;
    return { ...plain, authorId: { ...plain.authorId, avatarUrl } };
  });
  return Array.isArray(messages) ? enriched : enriched[0];
}
function validId(value) { return mongoose.isValidObjectId(value); }
function badId(res) { return res.status(400).json({ message: "Invalid study group id" }); }

const router = express.Router();
router.get("/", async (req, res) => {
  const { q = "", topic = "" } = req.query;
  const query = { isPublic: true };
  if (q.trim()) query.$or = [{ name: { $regex: q.trim(), $options: "i" } }, { description: { $regex: q.trim(), $options: "i" } }];
  if (topic.trim()) query.topic = { $regex: `^${topic.trim()}$`, $options: "i" };
  const groups = await Group.find(query).sort({ createdAt: -1 }).lean();
  const counts = await Member.aggregate([
    { $match: { groupId: { $in: groups.map((group) => group._id) }, status: "APPROVED" } },
    { $group: { _id: "$groupId", count: { $sum: 1 } } },
  ]);
  const countByGroup = new Map(counts.map((item) => [String(item._id), item.count]));
  res.json(groups.map((group) => ({ ...group, memberCount: countByGroup.get(String(group._id)) || 0 })));
});
router.get("/my", protect, async (req, res) => {
  const memberships = await Member.find({ userId: id(req) }).sort({ updatedAt: -1 }).lean();
  const groups = await Group.find({ _id: { $in: memberships.map((item) => item.groupId) } }).lean();
  const groupById = new Map(groups.map((group) => [String(group._id), group]));
  res.json(memberships.map((membership) => ({ ...membership, group: groupById.get(String(membership.groupId)) || null })).filter((item) => item.group));
});
router.post("/", protect, async (req, res) => {
  const { name, description, topic, isPublic = true } = req.body;
  if (!name || name.trim().length < 3) return res.status(400).json({ message: "Name must be at least 3 characters" });
  const group = await Group.create({ name, description, topic, isPublic, ownerId: id(req) });
  await Member.create({ groupId: group._id, userId: id(req), role: "OWNER", status: "APPROVED" });
  res.status(201).json(group);
});
router.get("/invite/:token", async (req, res) => {
  const invite = await Invite.findOne({ token: req.params.token, expiresAt: { $gt: new Date() }, acceptedBy: null }).populate("groupId", "name description topic isPublic").lean();
  if (!invite?.groupId) return res.status(404).json({ message: "This invite link is invalid or expired" });
  res.json({ group: invite.groupId, expiresAt: invite.expiresAt });
});
router.patch("/:groupId", protect, async (req, res) => {
  if (!validId(req.params.groupId)) return badId(res);
  const owner = await Member.exists({ groupId: req.params.groupId, userId: id(req), role: "OWNER", status: "APPROVED" });
  if (!owner) return res.status(403).json({ message: "Only the group owner can update group appearance" });
  const updates = {};
  if (typeof req.body.bannerUrl === "string" && req.body.bannerUrl.length <= 2000) updates.bannerUrl = req.body.bannerUrl.trim();
  if (typeof req.body.accentColor === "string" && /^#[0-9a-fA-F]{6}$/.test(req.body.accentColor)) updates.accentColor = req.body.accentColor;
  if (typeof req.body.avatarText === "string" && req.body.avatarText.trim().length <= 30) updates.avatarText = req.body.avatarText.trim().toUpperCase();
  if (Number.isFinite(Number(req.body.bannerZoom)) && Number(req.body.bannerZoom) >= 0.6 && Number(req.body.bannerZoom) <= 1.6) updates.bannerZoom = Number(req.body.bannerZoom);
  if (!Object.keys(updates).length) return res.status(400).json({ message: "Provide a valid banner URL, color, or avatar text" });
  const group = await Group.findByIdAndUpdate(req.params.groupId, { $set: updates }, { returnDocument: "after", runValidators: true }).lean();
  if (!group) return res.status(404).json({ message: "Group not found" });
  req.app.locals.io?.to(`study-group:${req.params.groupId}`).emit("group:appearance", group);
  res.json(group);
});
router.post("/:groupId/invite-link", protect, async (req, res) => {
  if (!validId(req.params.groupId)) return badId(res);
  const owner = await Member.exists({ groupId: req.params.groupId, userId: id(req), role: "OWNER", status: "APPROVED" });
  if (!owner) return res.status(403).json({ message: "Only the group owner can create invite links" });
  await Invite.updateMany({ groupId: req.params.groupId, createdBy: id(req), acceptedBy: null, expiresAt: { $gt: new Date() } }, { $set: { expiresAt: new Date() } });
  const token = crypto.randomBytes(24).toString("hex");
  const invite = await Invite.create({ groupId: req.params.groupId, createdBy: id(req), token, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) });
  const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
  res.status(201).json({ token: invite.token, expiresAt: invite.expiresAt, inviteUrl: `${clientUrl}/dashboard/groups/invite/${invite.token}` });
});
router.post("/invite/:token/accept", protect, async (req, res) => {
  const invite = await Invite.findOne({ token: req.params.token, expiresAt: { $gt: new Date() }, acceptedBy: null });
  if (!invite) return res.status(404).json({ message: "This invite link is invalid or expired" });
  const group = await Group.findById(invite.groupId).lean();
  if (!group) return res.status(404).json({ message: "Group not found" });
  const membership = await Member.findOneAndUpdate({ groupId: group._id, userId: id(req) }, { $set: { status: "APPROVED" }, $setOnInsert: { role: "MEMBER" } }, { upsert: true, returnDocument: "after" });
  invite.acceptedBy = id(req); invite.acceptedAt = new Date(); await invite.save();
  const membershipEvent = { groupId: String(group._id), userId: String(id(req)), membership, status: "APPROVED" };
  const approvedCount = await Member.countDocuments({ groupId: group._id, status: "APPROVED" });
  const notification = await Notification.create({ userId: group.ownerId, groupId: group._id, type: "study_group_join", groupName: group.name, title: "New member joined your group", body: `${req.user.name || "A member"} joined ${group.name}. The group now has ${approvedCount} approved member${approvedCount === 1 ? "" : "s"}.` });
  req.app.locals.io?.to(`user:${group.ownerId}`).emit("notifications:updated", { reason: "study-group-membership", notification });
  req.app.locals.io?.to(`study-group:${group._id}`).emit("group:membership", membershipEvent);
  req.app.locals.io?.to(`user:${id(req)}`).emit("group:membership", membershipEvent);
  res.json({ group, membership });
});
router.get("/:groupId", protect, async (req, res) => {
  if (!validId(req.params.groupId)) return badId(res);
  const group = await Group.findById(req.params.groupId).lean();
  if (!group) return res.status(404).json({ message: "Group not found" });
  if (!group.isPublic) {
    const member = await Member.exists({ groupId: group._id, userId: id(req), status: "APPROVED" });
    if (!member) return res.status(403).json({ message: "Join the private group to view it" });
  }
  res.json(group);
});
router.get("/:groupId/dashboard", protect, async (req, res) => {
  if (!validId(req.params.groupId)) return badId(res);
  const group = await Group.findById(req.params.groupId).lean();
  if (!group) return res.status(404).json({ message: "Group not found" });
  const membership = await Member.findOne({ groupId: group._id, userId: id(req), status: "APPROVED" }).lean();
  if (!membership) return res.status(403).json({ code: "GROUP_MEMBERSHIP_REQUIRED", message: "Join the group to view its workspace" });
  const members = await Member.find({ groupId: group._id, status: "APPROVED" }).populate("userId", "name email username avatarUrl").lean();
  const enrichedMembers = await enrichMemberAvatars(members);
  const activity = enrichedMembers.map((member) => ({ type: "member_joined", label: `${member.userId?.name || "A member"} joined the group`, createdAt: member.createdAt })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 20);
  res.json({ group, membership, members: enrichedMembers, activity, announcements: [] });
});
router.post("/:groupId/competitive-tests", protect, async (req, res) => {
  if (!validId(req.params.groupId)) return badId(res);
  if (!await approvedGroupMember(req.params.groupId, id(req))) return res.status(403).json({ message: "You must be an approved member to create a competitive test" });
  const group = await Group.findById(req.params.groupId).select("ownerId").lean();
  if (!group) return res.status(404).json({ message: "Group not found" });

  const problemIds = uniqueIds(req.body.problemIds);
  const aptitudeQuestionIds = uniqueIds(req.body.aptitudeQuestionIds);
  const title = String(req.body.title || "").trim();
  if (!title) return res.status(400).json({ message: "Competitive test title is required" });
  if ([...problemIds, ...aptitudeQuestionIds].some((value) => !validId(value))) return res.status(400).json({ message: "Selected question and problem IDs must be valid" });
  let definition;
  try {
    definition = validateDefinition({ ...req.body, problemIds, aptitudeQuestionIds });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
  // The creator is also a valid participant. Keep manager permissions separate
  // from participation, but guarantee the owner can complete the test they
  // created even when the form did not include the owner checkbox.
  const participantIds = uniqueIds([id(req), String(group.ownerId), ...(Array.isArray(req.body.participantIds) ? req.body.participantIds : [])]);
  if (!participantIds.length) return res.status(400).json({ message: "At least one participant is required" });
  if (participantIds.some((value) => !validId(value))) return res.status(400).json({ message: "Participant IDs must be valid" });
  const approvedMembers = await Member.find({ groupId: req.params.groupId, userId: { $in: participantIds }, status: "APPROVED" }).select("userId").lean();
  if (approvedMembers.length !== participantIds.length) return res.status(400).json({ message: "All participants must be approved group members" });
  try {
    await validateCompetitiveReferences(definition);
  } catch (error) {
    return res.status(error.status || 400).json({ message: error.message });
  }

  const test = await CompetitiveTest.create({
    groupId: req.params.groupId,
    createdBy: id(req),
    title,
    description: String(req.body.description || "").trim(),
    type: definition.type,
    problemIds: definition.problemIds,
    aptitudeQuestionIds: definition.aptitudeQuestionIds,
    participantIds,
    scheduledAt: definition.scheduledAt,
    durationSeconds: definition.durationSeconds,
    scoring: req.body.scoring && typeof req.body.scoring === "object" ? req.body.scoring : {},
  });
  await CompetitiveTestAttempt.insertMany(participantIds.map((participantId) => ({ testId: test._id, groupId: req.params.groupId, participantId, status: "INVITED" })));
  scheduleCompetitiveTest(test, req.app.locals.io);
  await notifyCompetitiveTest({ test, event: "scheduled", io: req.app.locals.io });
  req.app.locals.io?.to(`study-group:${req.params.groupId}`).emit("group:test", { testId: test._id, groupId: req.params.groupId, status: test.status });
  res.status(201).json(test);
});

router.get("/:groupId/competitive-tests", protect, async (req, res) => {
  if (!validId(req.params.groupId)) return badId(res);
  if (!await approvedGroupMember(req.params.groupId, id(req))) return res.status(403).json({ message: "You must be an approved member to view competitive tests" });
  const isOwner = Boolean(await Member.exists({ groupId: req.params.groupId, userId: id(req), role: "OWNER", status: "APPROVED" }));
  // Results are a group-shared resource. Approved members can see the test
  // card even when they were not selected as participants.
  const visibility = { groupId: req.params.groupId };
  const requestedPage = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 10));
  const total = await CompetitiveTest.countDocuments(visibility);
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const page = Math.min(requestedPage, totalPages);
  const tests = await CompetitiveTest.find(visibility).sort({ scheduledAt: 1, _id: 1 }).skip((page - 1) * limit).limit(limit).select("title description type scheduledAt durationSeconds startedAt endsAt status createdBy participantIds problemIds aptitudeQuestionIds scoring").lean();
  await Promise.all(tests.map(async (test) => {
    const current = await reconcileCompetitiveTest(test._id, req.app.locals.io);
    if (current?.status === "ENDED") await finalizeCompetitiveTest(current._id, req.app.locals.io);
  }));
  const currentTests = await CompetitiveTest.find({ _id: { $in: tests.map((test) => test._id) } }).sort({ scheduledAt: 1 }).select("title description type scheduledAt durationSeconds startedAt endsAt status createdBy participantIds problemIds aptitudeQuestionIds scoring").lean();
  const attempts = await CompetitiveTestAttempt.find({ groupId: req.params.groupId, participantId: id(req), testId: { $in: currentTests.map((test) => test._id) } }).select("testId status startedAt endsAt completedAt score rank").lean();
  const attemptByTest = new Map(attempts.map((attempt) => [String(attempt.testId), attempt]));
  res.json({ tests: currentTests.map((test) => ({ ...test, attempt: attemptByTest.get(String(test._id)) || null, canManage: isOwner || String(test.createdBy) === String(id(req)) })), pagination: { page, limit, total, totalPages } });
});

router.get("/:groupId/competitive-tests/:testId", protect, async (req, res) => {
  if (!validId(req.params.groupId) || !validId(req.params.testId)) return badId(res);
  if (!await approvedGroupMember(req.params.groupId, id(req))) return res.status(403).json({ message: "You must be an approved member to view this competitive test" });
  const isOwner = Boolean(await Member.exists({ groupId: req.params.groupId, userId: id(req), role: "OWNER", status: "APPROVED" }));
  const test = await CompetitiveTest.findOne({ _id: req.params.testId, ...competitiveTestVisibilityFilter({ groupId: req.params.groupId, userId: id(req), isOwner }) }).select("title description type scheduledAt durationSeconds startedAt endsAt status createdBy participantIds problemIds aptitudeQuestionIds scoring").lean();
  if (!test) return res.status(404).json({ message: "Competitive test not found" });
  let currentTest = await reconcileCompetitiveTest(test._id, req.app.locals.io);
  if (currentTest?.status === "ENDED") currentTest = await finalizeCompetitiveTest(currentTest._id, req.app.locals.io);
  const attempt = await CompetitiveTestAttempt.findOne({ testId: test._id, participantId: id(req) }).select("status startedAt endsAt completedAt score rank categoryBreakdown aptitudeSessionId dsaSubmissionIds").lean();
  const progress = await getCompetitiveProgress({ test: currentTest || test });
  res.json({ serverNow: new Date().toISOString(), test: currentTest || test, attempt: attempt || null, canManage: isOwner || String(test.createdBy) === String(id(req)), ...progress });
});

router.post("/:groupId/competitive-tests/:testId/join", protect, async (req, res) => {
  if (!validId(req.params.groupId) || !validId(req.params.testId)) return badId(res);
  if (!await approvedGroupMember(req.params.groupId, id(req))) return res.status(403).json({ message: "You must be an approved member to join this competitive test" });
  const test = await CompetitiveTest.findOne({ _id: req.params.testId, groupId: req.params.groupId, participantIds: id(req) }).lean();
  if (!test) return res.status(404).json({ message: "Competitive test not found" });
  const currentTest = await reconcileCompetitiveTest(test._id, req.app.locals.io);
  if (!currentTest || !["SCHEDULED", "LIVE"].includes(currentTest.status)) return res.status(409).json({ message: "This competitive test is no longer joinable" });
  const attempt = await CompetitiveTestAttempt.findOneAndUpdate({ testId: currentTest._id, participantId: id(req), status: "INVITED" }, { $set: { status: "JOINED" } }, { returnDocument: "after" }).lean();
  if (!attempt) return res.status(409).json({ message: "This participant attempt is already joined or closed" });
  req.app.locals.io?.to(`study-group:${req.params.groupId}`).emit("group:test-participant", { testId: test._id, groupId: req.params.groupId, participantId: id(req), status: attempt.status });
  await emitCompetitiveProgress({ test: currentTest, io: req.app.locals.io });
  res.json(attempt);
});

router.post("/:groupId/competitive-tests/:testId/start", protect, async (req, res) => {
  if (!validId(req.params.groupId) || !validId(req.params.testId)) return badId(res);
  if (!await approvedGroupMember(req.params.groupId, id(req))) return res.status(403).json({ message: "You must be an approved member to start this competitive test" });
  const test = await CompetitiveTest.findOne({ _id: req.params.testId, groupId: req.params.groupId, participantIds: id(req) });
  if (!test) return res.status(404).json({ message: "Competitive test not found" });
  const currentTest = await reconcileCompetitiveTest(test._id, req.app.locals.io);
  const attempt = await CompetitiveTestAttempt.findOne({ testId: test._id, participantId: id(req) });
  try {
    assertAttemptCanStart(currentTest, attempt);
  } catch (error) {
    return res.status(409).json({ message: error.message });
  }
  const now = new Date();
  const endsAt = participantDeadline(currentTest, now);
  const started = await CompetitiveTestAttempt.findOneAndUpdate(
    { _id: attempt._id, testId: test._id, participantId: id(req), status: "JOINED" },
    { $set: { status: "STARTED", startedAt: now, endsAt } },
    { returnDocument: "after" },
  ).lean();
  if (!started) return res.status(409).json({ message: "Participant attempt has already started or closed" });
  const extendedTest = await CompetitiveTest.findOneAndUpdate(
    { _id: test._id, status: "LIVE" },
    { $max: { endsAt } },
    { returnDocument: "after" },
  );
  if (!extendedTest) return res.status(409).json({ message: "Competitive test is no longer live" });
  scheduleCompetitiveTest(extendedTest, req.app.locals.io);
  const payload = { testId: test._id, groupId: req.params.groupId, participantId: id(req), status: started.status, startedAt: started.startedAt, endsAt: started.endsAt, remainingSeconds: remainingAttemptSeconds(started, now) };
  req.app.locals.io?.to(`study-group:${req.params.groupId}`).emit("group:test-participant", payload);
  await emitCompetitiveProgress({ test: extendedTest, io: req.app.locals.io });
  res.json({ attempt: started, remainingSeconds: payload.remainingSeconds });
});

router.post("/:groupId/competitive-tests/:testId/aptitude-session", protect, async (req, res) => {
  if (!validId(req.params.groupId) || !validId(req.params.testId)) return badId(res);
  if (!await approvedGroupMember(req.params.groupId, id(req))) return res.status(403).json({ message: "You must be an approved member to access this competitive test" });
  const test = await CompetitiveTest.findOne({ _id: req.params.testId, groupId: req.params.groupId, participantIds: id(req) });
  if (!test) return res.status(404).json({ message: "Competitive test not found" });
  const currentTest = await reconcileCompetitiveTest(test._id, req.app.locals.io);
  if (!currentTest || !["APTITUDE", "DSA_APTITUDE"].includes(currentTest.type)) return res.status(409).json({ message: "This competitive test has no Aptitude component" });
  const attempt = await CompetitiveTestAttempt.findOne({ testId: currentTest._id, participantId: id(req), status: "STARTED" });
  if (!attempt) return res.status(409).json({ message: "Start the participant attempt before opening Aptitude" });
  if (!attempt.endsAt || new Date() >= new Date(attempt.endsAt)) return res.status(409).json({ message: "Competitive test deadline has passed" });
  if (attempt.aptitudeSessionId) {
    const existing = await AptitudeSession.findOne({ _id: attempt.aptitudeSessionId, userId: id(req), competitiveTestId: currentTest._id });
    if (existing) return res.json(existing);
  }
  const session = await AptitudeSession.create({
    userId: id(req),
    mode: "EXAM_SIMULATION",
    config: { totalQuestions: currentTest.aptitudeQuestionIds.length, timeLimitSeconds: Math.max(1, Math.ceil((new Date(attempt.endsAt) - new Date(attempt.startedAt)) / 1000)) },
    questions: currentTest.aptitudeQuestionIds.map((questionId, order) => ({ questionId, order })),
    startedAt: attempt.startedAt,
    expiresAt: attempt.endsAt,
    competitiveTestId: currentTest._id,
    competitiveTestAttemptId: attempt._id,
  });
  const linkedAttempt = await CompetitiveTestAttempt.findOneAndUpdate(
    { _id: attempt._id, status: "STARTED", aptitudeSessionId: null },
    { $set: { aptitudeSessionId: session._id } },
    { returnDocument: "after" },
  ).lean();
  if (!linkedAttempt || String(linkedAttempt.aptitudeSessionId) !== String(session._id)) {
    await AptitudeSession.deleteOne({ _id: session._id, competitiveTestAttemptId: attempt._id });
    const existing = await AptitudeSession.findOne({ competitiveTestAttemptId: attempt._id, userId: id(req), competitiveTestId: currentTest._id });
    if (existing) return res.json(existing);
    return res.status(409).json({ message: "Could not create the Aptitude attempt safely" });
  }
  res.status(201).json(session);
});
router.get("/:groupId/competitive-tests/:testId/results", protect, async (req, res) => {
  if (!validId(req.params.groupId) || !validId(req.params.testId)) return badId(res);
  if (!await approvedGroupMember(req.params.groupId, id(req))) return res.status(403).json({ message: "You must be an approved member to view results" });
  const isOwner = Boolean(await Member.exists({ groupId: req.params.groupId, userId: id(req), role: "OWNER", status: "APPROVED" }));
  // Approved group membership is the authorization boundary for published results.
  let test = await CompetitiveTest.findOne({ _id: req.params.testId, groupId: req.params.groupId }).lean();
  if (!test) return res.status(404).json({ message: "Competitive test not found" });
  test = await reconcileCompetitiveTest(test._id, req.app.locals.io);
  if (test?.status === "ENDED") test = await finalizeCompetitiveTest(test._id, req.app.locals.io);
  if (!test || test.status !== "RESULTS_AVAILABLE") return res.status(409).json({ message: "Results are not available yet" });
  const attempts = await CompetitiveTestAttempt.find({ testId: test._id }).populate("participantId", "name username avatarUrl").sort({ rank: 1, _id: 1 }).lean();
  res.json({ test, results: attempts.map((attempt) => ({ attemptId: attempt._id, participant: attempt.participantId, status: attempt.status, score: attempt.score, dsaScore: attempt.dsaScore, aptitudeScore: attempt.aptitudeScore, scoreBreakdown: attempt.scoreBreakdown, categoryBreakdown: attempt.categoryBreakdown, completionTimeSeconds: attempt.completionTimeSeconds, rank: attempt.rank })) });
});
router.get("/:groupId/competitive-tests/:testId/attempts/:attemptId/submissions", protect, async (req, res) => {
  if (![req.params.groupId, req.params.testId, req.params.attemptId].every(validId)) return badId(res);
  if (!await approvedGroupMember(req.params.groupId, id(req))) return res.status(403).json({ message: "You must be an approved member to view submissions" });
  const isOwner = Boolean(await Member.exists({ groupId: req.params.groupId, userId: id(req), role: "OWNER", status: "APPROVED" }));
  // Every approved member may inspect every participant report for this group test.
  const test = await CompetitiveTest.findOne({ _id: req.params.testId, groupId: req.params.groupId }).select("_id createdBy problemIds aptitudeQuestionIds").lean();
  if (!test) return res.status(404).json({ message: "Competitive test not found" });
  const attempt = await CompetitiveTestAttempt.findOne({ _id: req.params.attemptId, testId: test._id, groupId: req.params.groupId }).select("_id participantId aptitudeSessionId").lean();
  if (!attempt) return res.status(404).json({ message: "Competitive test attempt not found" });
  const canView = true; // approvedGroupMember above already authorized this request
  if (!canView) return res.status(403).json({ message: "You cannot view this participant's submissions" });
  const [submissions, assignedProblems, aptitudeSession, aptitudeAttempts] = await Promise.all([
    Submission.find({ competitiveTestAttemptId: attempt._id }).select("_id problem verdict runtime memory language code createdAt").populate("problem", "_id title slug").sort({ createdAt: 1 }).lean(),
    Problem.find({ _id: { $in: test.problemIds || [] } }).select("_id title slug").lean(),
    attempt.aptitudeSessionId ? AptitudeSession.findOne({ _id: attempt.aptitudeSessionId, competitiveTestId: test._id, competitiveTestAttemptId: attempt._id }).select("results").lean() : null,
    attempt.aptitudeSessionId ? AptitudeAttempt.find({ sessionId: attempt.aptitudeSessionId }).select("questionId isCorrect isSkipped").lean() : [],
  ]);
  const acceptedProblems = new Set(submissions.filter((submission) => submission.verdict === "Accepted").map((submission) => String(submission.problem?._id || submission.problem)));
  const dsaProblems = (test.problemIds || []).map((problemId) => {
    const problem = assignedProblems.find((item) => String(item._id) === String(problemId));
    return { _id: problemId, title: problem?.title || "Problem", slug: problem?.slug || "", solved: acceptedProblems.has(String(problemId)) };
  });
  const persistedResults = aptitudeSession?.results || {};
  const answered = Number.isFinite(Number(persistedResults.totalAnswered)) ? Number(persistedResults.totalAnswered) : aptitudeAttempts.filter((item) => !item.isSkipped).length;
  const correct = Number.isFinite(Number(persistedResults.totalCorrect)) ? Number(persistedResults.totalCorrect) : aptitudeAttempts.filter((item) => !item.isSkipped && item.isCorrect).length;
  const aptitudeSummary = {
    total: (test.aptitudeQuestionIds || []).length,
    answered: Math.min((test.aptitudeQuestionIds || []).length, answered),
    correct: Math.min((test.aptitudeQuestionIds || []).length, correct),
    incorrect: Math.max(0, Math.min((test.aptitudeQuestionIds || []).length, answered) - Math.min((test.aptitudeQuestionIds || []).length, correct)),
  };
  res.json({ submissions, dsaProblems, aptitudeSummary });
});
router.get("/:groupId/members", protect, async (req, res) => {
  if (!validId(req.params.groupId)) return badId(res);
  const member = await Member.exists({ groupId: req.params.groupId, userId: id(req), status: "APPROVED" });
  if (!member) return res.status(403).json({ message: "Join the group to view its members" });
  const members = await Member.find({ groupId: req.params.groupId, status: "APPROVED" }).populate("userId", "name email username avatarUrl").sort({ createdAt: 1 }).lean();
  res.json(await enrichMemberAvatars(members));
});
router.get("/:groupId/requests", protect, async (req, res) => {
  if (!validId(req.params.groupId)) return badId(res);
  const owner = await Member.exists({ groupId: req.params.groupId, userId: id(req), role: "OWNER", status: "APPROVED" });
  if (!owner) return res.status(403).json({ message: "Only the group owner can view join requests" });
  const requests = await Member.find({ groupId: req.params.groupId, status: "PENDING" }).populate("userId", "name email username avatarUrl").sort({ createdAt: 1 }).lean();
  res.json(await enrichMemberAvatars(requests));
});
router.patch("/:groupId/members/:memberId/approve", protect, async (req, res) => {
  if (!validId(req.params.groupId) || !validId(req.params.memberId)) return badId(res);
  const owner = await Member.exists({ groupId: req.params.groupId, userId: id(req), role: "OWNER", status: "APPROVED" });
  if (!owner) return res.status(403).json({ message: "Only the group owner can approve members" });
  const membership = await Member.findOneAndUpdate({ _id: req.params.memberId, groupId: req.params.groupId, status: "PENDING" }, { $set: { status: "APPROVED" } }, { returnDocument: "after" }).populate("userId", "name email username avatarUrl");
  if (!membership) return res.status(404).json({ message: "Join request not found" });
  const event = { groupId: String(req.params.groupId), userId: String(membership.userId._id), membership, status: "APPROVED" };
  req.app.locals.io?.to(`study-group:${req.params.groupId}`).emit("group:membership", event);
  req.app.locals.io?.to(`user:${membership.userId._id}`).emit("group:membership", event);
  res.json({ membership });
});
router.delete("/:groupId/members/:memberId", protect, async (req, res) => {
  if (!validId(req.params.groupId) || !validId(req.params.memberId)) return badId(res);
  const owner = await Member.exists({ groupId: req.params.groupId, userId: id(req), role: "OWNER", status: "APPROVED" });
  if (!owner) return res.status(403).json({ message: "Only the group owner can remove members" });
  const membership = await Member.findOne({ _id: req.params.memberId, groupId: req.params.groupId });
  if (!membership) return res.status(404).json({ message: "Member not found" });
  if (membership.role === "OWNER") return res.status(400).json({ message: "The group owner cannot be removed" });
  await membership.deleteOne();
  const event = { groupId: String(req.params.groupId), userId: String(membership.userId), status: "REMOVED" };
  req.app.locals.io?.to(`study-group:${req.params.groupId}`).emit("group:membership", event);
  req.app.locals.io?.to(`user:${membership.userId}`).emit("group:membership", event);
  req.app.locals.io?.to(`user:${membership.userId}`).emit("group:access-revoked", { groupId: String(req.params.groupId), reason: "removed" });
  res.json({ message: "Member removed" });
});
router.post("/:groupId/join", protect, async (req, res) => {
  if (!validId(req.params.groupId)) return badId(res);
  const group = await Group.findById(req.params.groupId);
  if (!group) return res.status(404).json({ message: "Group not found" });
  const existing = await Member.findOne({ groupId: group._id, userId: id(req) });
  if (existing) return res.status(409).json({ message: "Membership already exists", membership: existing });
  const membership = await Member.create({ groupId: group._id, userId: id(req), status: "PENDING" });
  const membershipEvent = { groupId: String(req.params.groupId), userId: String(id(req)), membership, status: membership.status };
  const approvedCount = await Member.countDocuments({ groupId: group._id, status: "APPROVED" });
  const notification = await Notification.create({ userId: group.ownerId, groupId: group._id, type: "study_group_join", groupName: group.name, title: membership.status === "APPROVED" ? "New member joined your group" : "New join request", body: `${req.user.name || "A member"} ${membership.status === "APPROVED" ? "joined" : "requested to join"} ${group.name}. The group now has ${approvedCount} approved member${approvedCount === 1 ? "" : "s"}.` });
  req.app.locals.io?.to(`user:${group.ownerId}`).emit("notifications:updated", { reason: "study-group-membership", notification });
  req.app.locals.io?.to(`study-group:${req.params.groupId}`).emit("group:membership", membershipEvent);
  req.app.locals.io?.to(`user:${id(req)}`).emit("group:membership", membershipEvent);
  res.status(201).json({ membership });
});
router.post("/:groupId/leave", protect, async (req, res) => {
  if (!validId(req.params.groupId)) return badId(res);
  const membership = await Member.findOne({ groupId: req.params.groupId, userId: id(req) });
  if (!membership) return res.status(404).json({ message: "Membership not found" });
  if (membership.role === "OWNER") return res.status(400).json({ message: "Owner cannot leave the group" });
  await membership.deleteOne();
  const membershipEvent = { groupId: String(req.params.groupId), userId: String(id(req)), status: "LEFT" };
  req.app.locals.io?.to(`study-group:${req.params.groupId}`).emit("group:membership", membershipEvent);
  req.app.locals.io?.to(`user:${id(req)}`).emit("group:membership", membershipEvent);
  res.json({ message: "You left the group" });
});
router.get("/:groupId/messages", protect, async (req, res) => {
  if (!validId(req.params.groupId)) return badId(res);
  const member = await Member.exists({ groupId: req.params.groupId, userId: id(req), status: "APPROVED" });
  if (!member) return res.status(403).json({ message: "Join the group to view its chat" });
  const before = req.query.before ? new Date(req.query.before) : null;
  if (before && Number.isNaN(before.getTime())) return res.status(400).json({ message: "Invalid message cursor" });
  const query = { groupId: req.params.groupId };
  if (before) query.createdAt = { $lt: before };
  const messages = await Message.find(query).populate("authorId", "name avatarUrl").sort({ createdAt: -1 }).limit(50).lean();
  res.json((await enrichMessageAvatars(messages)).reverse());
});
router.post("/:groupId/messages", protect, async (req, res) => {
  if (!validId(req.params.groupId)) return badId(res);
  const member = await Member.exists({ groupId: req.params.groupId, userId: id(req), status: "APPROVED" });
  if (!member) return res.status(403).json({ message: "Join the group to send messages" });
  const content = String(req.body.content || "").trim();
  if (!content) return res.status(400).json({ message: "Message content is required" });
  const message = await Message.create({ groupId: req.params.groupId, authorId: id(req), content });
  const payload = await enrichMessageAvatars(await message.populate("authorId", "name avatarUrl"));
  const group = await Group.findById(req.params.groupId).select("name").lean();
  const recipients = await Member.find({ groupId: req.params.groupId, status: "APPROVED", userId: { $ne: id(req) } }).select("userId").lean();
  const activeUsers = activeChatUsers(req.app.locals.io, req.params.groupId);
  const notificationRecipients = recipients.filter((recipient) => !activeUsers.has(String(recipient.userId)));
  if (group && notificationRecipients.length) {
    await Promise.all(notificationRecipients.map(async (recipient) => {
      const notification = await queueGroupMessageNotification({ recipientId: recipient.userId, group, senderId: id(req), preview: content.slice(0, 280) });
      req.app.locals.io?.to(`user:${notification.userId}`).emit("notifications:updated", { reason: "study-group-message", notification });
    }));
  }
  req.app.locals.io?.to(`study-group:${req.params.groupId}`).emit("group:message", payload);
  res.status(201).json(payload);
});
module.exports = router;
