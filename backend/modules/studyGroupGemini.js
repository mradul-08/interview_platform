const express = require("express");
const mongoose = require("mongoose");
const crypto = require("crypto");
const { protect } = require("../middleware/authMiddleware");
const StudyGroupTask = require("../StudyGroupTask");
const DeveloperProfile = require("../models/DeveloperProfile");
const Notification = require("../models/Notification");

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
const discussionSchema = new Schema({
  groupId: { type: Schema.Types.ObjectId, ref: "GeminiStudyGroup", required: true },
  authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true, trim: true },
  content: { type: String, required: true, trim: true },
}, { timestamps: true });
const messageSchema = new Schema({
  groupId: { type: Schema.Types.ObjectId, ref: "GeminiStudyGroup", required: true, index: true },
  authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  content: { type: String, required: true, trim: true, maxlength: 4000 },
  deliveredTo: [{ _id: false, userId: { type: Schema.Types.ObjectId, ref: "User" }, at: { type: Date } }],
  readBy: [{ _id: false, userId: { type: Schema.Types.ObjectId, ref: "User" }, at: { type: Date } }],
}, { timestamps: true });
const sessionSchema = new Schema({
  groupId: { type: Schema.Types.ObjectId, ref: "GeminiStudyGroup", required: true, index: true },
  hostId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true, trim: true, maxlength: 140 },
  topic: { type: String, trim: true, maxlength: 80 },
  scheduledTime: { type: Date, required: true },
  durationMinutes: { type: Number, min: 15, max: 240, default: 60 },
  status: { type: String, enum: ["scheduled", "active", "completed", "cancelled"], default: "scheduled" },
  startedAt: { type: Date, default: null },
  endedAt: { type: Date, default: null },
  participantIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
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
const Discussion = mongoose.models.GeminiStudyGroupDiscussion || mongoose.model("GeminiStudyGroupDiscussion", discussionSchema);
const Message = mongoose.models.GeminiStudyGroupMessage || mongoose.model("GeminiStudyGroupMessage", messageSchema);
const StudySession = mongoose.models.GeminiStudySession || mongoose.model("GeminiStudySession", sessionSchema);
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
  const [members, discussions, tasks] = await Promise.all([
    Member.find({ groupId: group._id, status: "APPROVED" }).populate("userId", "name email username avatarUrl").lean(),
    Discussion.find({ groupId: group._id }).populate("authorId", "name").sort({ createdAt: -1 }).lean(),
    StudyGroupTask.find({ groupId: group._id }).populate("assignedTo", "name avatarUrl").sort({ createdAt: -1 }).lean(),
  ]);
  const enrichedMembers = await enrichMemberAvatars(members);
  const activity = [
    ...enrichedMembers.map((member) => ({ type: "member_joined", label: `${member.userId?.name || "A member"} joined the group`, createdAt: member.createdAt })),
    ...discussions.map((discussion) => ({ type: "discussion_created", label: `${discussion.authorId?.name || "A member"} started “${discussion.title}”`, createdAt: discussion.createdAt })),
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 20);
  const upcomingSession = await StudySession.findOne({ groupId: group._id, status: "scheduled", scheduledTime: { $gte: new Date() } }).populate("hostId", "name avatarUrl").sort({ scheduledTime: 1 }).lean();
  res.json({ group, membership, members: enrichedMembers, discussions, activity, announcements: [], upcomingSession, tasks });
});
router.get("/:groupId/tasks", protect, async (req, res) => {
  if (!validId(req.params.groupId)) return badId(res);
  const member = await Member.exists({ groupId: req.params.groupId, userId: id(req), status: "APPROVED" });
  if (!member) return res.status(403).json({ message: "You must be an approved member to view tasks" });
  res.json(await StudyGroupTask.find({ groupId: req.params.groupId }).populate("assignedTo", "name avatarUrl").sort({ createdAt: -1 }).lean());
});
router.post("/:groupId/tasks", protect, async (req, res) => {
  if (!validId(req.params.groupId)) return badId(res);
  const member = await Member.exists({ groupId: req.params.groupId, userId: id(req), status: "APPROVED" });
  if (!member) return res.status(403).json({ message: "You must be an approved member to create tasks" });
  const title = String(req.body.title || "").trim();
  if (!title) return res.status(400).json({ message: "Task title is required" });
  const task = await StudyGroupTask.create({ groupId: req.params.groupId, title, description: String(req.body.description || "").trim(), priority: ["Low", "Medium", "High"].includes(req.body.priority) ? req.body.priority : "Medium", dueDate: req.body.dueDate || null, assignedTo: Array.isArray(req.body.assignedTo) ? req.body.assignedTo : [] });
  const payload = await task.populate("assignedTo", "name avatarUrl");
  req.app.locals.io?.to(`study-group:${req.params.groupId}`).emit("group:task", payload);
  res.status(201).json(payload);
});
router.patch("/:groupId/tasks/:taskId", protect, async (req, res) => {
  if (!validId(req.params.groupId) || !validId(req.params.taskId)) return badId(res);
  const member = await Member.exists({ groupId: req.params.groupId, userId: id(req), status: "APPROVED" });
  if (!member) return res.status(403).json({ message: "You must be an approved member to update tasks" });
  const updates = {};
  if (typeof req.body.title === "string" && req.body.title.trim()) updates.title = req.body.title.trim();
  if (["TODO", "IN_PROGRESS", "DONE"].includes(req.body.status)) updates.status = req.body.status;
  if (["Low", "Medium", "High"].includes(req.body.priority)) updates.priority = req.body.priority;
  if (req.body.dueDate !== undefined) updates.dueDate = req.body.dueDate || null;
  const task = await StudyGroupTask.findOneAndUpdate({ _id: req.params.taskId, groupId: req.params.groupId }, { $set: updates }, { returnDocument: "after", runValidators: true }).populate("assignedTo", "name avatarUrl");
  if (!task) return res.status(404).json({ message: "Task not found" });
  req.app.locals.io?.to(`study-group:${req.params.groupId}`).emit("group:task", task);
  res.json(task);
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
router.post("/:groupId/discussions", protect, async (req, res) => {
  if (!validId(req.params.groupId)) return badId(res);
  const { title, content } = req.body;
  if (!title || !content) return res.status(400).json({ message: "Title and content are required" });
  const discussion = await Discussion.create({ groupId: req.params.groupId, authorId: id(req), title, content });
  const payload = await discussion.populate("authorId", "name");
  req.app.locals.io?.to(`study-group:${req.params.groupId}`).emit("group:discussion", payload);
  res.status(201).json(payload);
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
router.get("/:groupId/sessions", protect, async (req, res) => {
  if (!validId(req.params.groupId)) return badId(res);
  const member = await Member.exists({ groupId: req.params.groupId, userId: id(req), status: "APPROVED" });
  if (!member) return res.status(403).json({ message: "Join the group to view sessions" });
  const sessions = await StudySession.find({ groupId: req.params.groupId }).populate("hostId", "name avatarUrl").populate("participantIds", "name avatarUrl").sort({ scheduledTime: 1 }).limit(50).lean();
  res.json(sessions);
});
router.post("/:groupId/sessions", protect, async (req, res) => {
  if (!validId(req.params.groupId)) return badId(res);
  const member = await Member.exists({ groupId: req.params.groupId, userId: id(req), status: "APPROVED" });
  if (!member) return res.status(403).json({ message: "Join the group to schedule a session" });
  const { title, topic, scheduledTime, durationMinutes = 60 } = req.body;
  if (!title || !scheduledTime || Number.isNaN(new Date(scheduledTime).getTime())) return res.status(400).json({ message: "Title and a valid scheduled time are required" });
  const session = await StudySession.create({ groupId: req.params.groupId, hostId: id(req), title, topic, scheduledTime, durationMinutes, participantIds: [id(req)] });
  const payload = await session.populate("hostId", "name avatarUrl");
  req.app.locals.io?.to(`study-group:${req.params.groupId}`).emit("session:updated", payload);
  res.status(201).json(payload);
});
router.post("/:groupId/sessions/:sessionId/join", protect, async (req, res) => {
  if (!validId(req.params.groupId) || !validId(req.params.sessionId)) return badId(res);
  const member = await Member.exists({ groupId: req.params.groupId, userId: id(req), status: "APPROVED" });
  if (!member) return res.status(403).json({ message: "Join the group to attend sessions" });
  const session = await StudySession.findOneAndUpdate({ _id: req.params.sessionId, groupId: req.params.groupId, status: { $in: ["scheduled", "active"] } }, { $addToSet: { participantIds: id(req) } }, { returnDocument: "after" }).populate("participantIds", "name avatarUrl");
  if (!session) return res.status(404).json({ message: "Joinable session not found" });
  req.app.locals.io?.to(`study-group:${req.params.groupId}`).emit("session:updated", session);
  res.json(session);
});
router.post("/:groupId/sessions/:sessionId/leave", protect, async (req, res) => {
  if (!validId(req.params.groupId) || !validId(req.params.sessionId)) return badId(res);
  const member = await Member.exists({ groupId: req.params.groupId, userId: id(req), status: "APPROVED" });
  if (!member) return res.status(403).json({ message: "Join the group to leave its sessions" });
  const session = await StudySession.findOneAndUpdate({ _id: req.params.sessionId, groupId: req.params.groupId, status: { $in: ["scheduled", "active"] } }, { $pull: { participantIds: id(req) } }, { returnDocument: "after" }).populate("participantIds", "name avatarUrl");
  if (!session) return res.status(404).json({ message: "Joinable session not found" });
  req.app.locals.io?.to(`study-group:${req.params.groupId}`).emit("session:updated", session);
  res.json(session);
});
router.post("/:groupId/sessions/:sessionId/start", protect, async (req, res) => {
  if (!validId(req.params.groupId) || !validId(req.params.sessionId)) return badId(res);
  const session = await StudySession.findOne({ _id: req.params.sessionId, groupId: req.params.groupId });
  if (!session) return res.status(404).json({ message: "Session not found" });
  if (String(session.hostId) !== String(id(req))) return res.status(403).json({ message: "Only the session host can start it" });
  if (session.status !== "scheduled") return res.status(409).json({ message: "Only scheduled sessions can be started" });
  session.status = "active";
  session.startedAt = new Date();
  await session.save();
  const payload = await session.populate(["hostId", "participantIds"]);
  req.app.locals.io?.to(`study-group:${req.params.groupId}`).emit("session:started", payload);
  res.json(payload);
});
router.post("/:groupId/sessions/:sessionId/end", protect, async (req, res) => {
  if (!validId(req.params.groupId) || !validId(req.params.sessionId)) return badId(res);
  const session = await StudySession.findOne({ _id: req.params.sessionId, groupId: req.params.groupId });
  if (!session) return res.status(404).json({ message: "Session not found" });
  if (String(session.hostId) !== String(id(req))) return res.status(403).json({ message: "Only the session host can end it" });
  if (session.status !== "active") return res.status(409).json({ message: "Only active sessions can be ended" });
  session.status = "completed";
  session.endedAt = new Date();
  await session.save();
  const payload = await session.populate(["hostId", "participantIds"]);
  req.app.locals.io?.to(`study-group:${req.params.groupId}`).emit("session:ended", payload);
  res.json(payload);
});

module.exports = router;
