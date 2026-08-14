const Conversation = require("../models/Conversation");
const DirectMessage = require("../models/DirectMessage");
const Notification = require("../models/Notification");
const User = require("../models/User");
const { emitToUser } = require("../socket");
const { AccessToken } = require("livekit-server-sdk");
const { isConfigured: cloudinaryConfigured, uploadBuffer } = require("../services/cloudinary");

const fail = (res, message, status = 500) => res.status(status).json({ success: false, message });
const clean = (value, fallback = "") => String(value || fallback).trim();
const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const pairKeyFor = (a, b) => [String(a), String(b)].sort().join("_");

async function conversationForMember(conversationId, userId) {
  return Conversation.findOne({ _id: conversationId, participantIds: userId });
}

function otherParticipant(conversation, userId, usersById) {
  const otherId = conversation.participantIds.find((id) => String(id) !== String(userId));
  const user = usersById.get(String(otherId));
  return { id: otherId, name: user?.name || "CodeVerse member", avatarUrl: user?.avatarUrl || "" };
}

async function publicConversation(conversation, userId) {
  const users = await User.find({ _id: { $in: conversation.participantIds } }).select("name avatarUrl").lean();
  const usersById = new Map(users.map((user) => [String(user._id), user]));
  const mine = conversation.participants.find((item) => String(item.userId) === String(userId));
  const unreadCount = await DirectMessage.countDocuments({
    conversationId: conversation._id,
    deletedAt: null,
    senderId: { $ne: userId },
    createdAt: { $gt: mine?.lastReadAt || new Date(0) },
  });
  return {
    id: conversation._id,
    with: otherParticipant(conversation, userId, usersById),
    lastMessagePreview: conversation.lastMessagePreview,
    lastMessageAt: conversation.lastMessageAt,
    lastMessageMine: conversation.lastMessageSenderId ? String(conversation.lastMessageSenderId) === String(userId) : false,
    unreadCount,
  };
}

function publicMessage(message) {
  return {
    id: message._id,
    conversationId: message.conversationId,
    senderId: message.senderId?._id || message.senderId,
    content: message.deletedAt ? "" : message.content,
    deleted: Boolean(message.deletedAt),
    edited: Boolean(message.editedAt),
    attachments: message.deletedAt ? [] : (message.attachments || []),
    createdAt: message.createdAt,
  };
}

exports.searchUsers = async (req, res) => {
  try {
    const query = clean(req.query.query);
    if (query.length < 2) return res.json({ success: true, users: [] });
    const users = await User.find({
      _id: { $ne: req.user._id },
      role: "student",
      $or: [{ name: { $regex: escapeRegExp(query), $options: "i" } }, { username: { $regex: escapeRegExp(query), $options: "i" } }],
    }).select("name username avatarUrl").limit(10).lean();
    res.json({ success: true, users: users.map((user) => ({ id: user._id, name: user.name, username: user.username || "", avatarUrl: user.avatarUrl || "" })) });
  } catch (error) { console.error(error); fail(res, "Failed to search members"); }
};

exports.listConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({ participantIds: req.user._id }).sort({ lastMessageAt: -1 }).limit(100);
    const items = await Promise.all(conversations.map((conversation) => publicConversation(conversation, req.user._id)));
    res.json({ success: true, conversations: items });
  } catch (error) { console.error(error); fail(res, "Failed to load messages"); }
};

exports.startConversation = async (req, res) => {
  try {
    const targetUserId = clean(req.body?.userId);
    if (!targetUserId || targetUserId === String(req.user._id)) return fail(res, "Choose a valid member to message", 400);
    const target = await User.findById(targetUserId).select("_id").lean();
    if (!target) return fail(res, "That member could not be found", 404);
    const pairKey = pairKeyFor(req.user._id, targetUserId);
    const conversation = await Conversation.findOneAndUpdate(
      { pairKey },
      {
        $setOnInsert: {
          pairKey,
          participantIds: [req.user._id, targetUserId],
          participants: [{ userId: req.user._id }, { userId: targetUserId }],
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    res.status(201).json({ success: true, conversation: await publicConversation(conversation, req.user._id) });
  } catch (error) { console.error(error); fail(res, "Failed to start a conversation"); }
};

exports.listMessages = async (req, res) => {
  try {
    const conversation = await conversationForMember(req.params.conversationId, req.user._id);
    if (!conversation) return fail(res, "Conversation not found", 404);
    const query = { conversationId: conversation._id, deletedAt: null };
    const before = req.query.before ? new Date(req.query.before) : null;
    if (before && !Number.isNaN(before.getTime())) query.createdAt = { $lt: before };
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    const messages = await DirectMessage.find(query).sort({ createdAt: -1 }).limit(limit).lean();
    res.json({ success: true, messages: messages.reverse().map(publicMessage), hasMore: messages.length === limit });
  } catch (error) { console.error(error); fail(res, "Failed to load conversation"); }
};

exports.sendMessage = async (req, res) => {
  try {
    const conversation = await conversationForMember(req.params.conversationId, req.user._id);
    if (!conversation) return fail(res, "Conversation not found", 404);
    const content = clean(req.body?.content);
    const attachments = Array.isArray(req.body?.attachments) ? req.body.attachments.filter((item) => item?.url && ["image", "file", "link"].includes(item?.type)).map((item) => ({ type: item.type, url: clean(item.url).slice(0, 2000), name: clean(item.name).slice(0, 200) })).slice(0, 5) : [];
    if (!content && !attachments.length) return fail(res, "Message cannot be empty", 400);
    if (content.length > 2000) return fail(res, "Message must be under 2000 characters", 400);
    const message = await DirectMessage.create({ conversationId: conversation._id, senderId: req.user._id, content, attachments });
    conversation.lastMessageAt = message.createdAt;
    conversation.lastMessagePreview = content || (attachments[0]?.name || "Sent an attachment");
    conversation.lastMessageSenderId = req.user._id;
    await conversation.save();

    const payload = publicMessage(message);
    const otherId = conversation.participantIds.find((id) => String(id) !== String(req.user._id));
    const io = req.app.locals.io;
    emitToUser(io, otherId, "dm:message", payload);
    emitToUser(io, req.user._id, "dm:message", payload);
    await Notification.create({ userId: otherId, type: "direct_message", title: `${req.user.name} sent you a message`, body: (content || "Sent an attachment").slice(0, 280) });
    emitToUser(io, otherId, "notifications:updated", { reason: "direct-message" });
    res.status(201).json({ success: true, message: payload });
  } catch (error) { console.error(error); fail(res, "Failed to send message"); }
};

exports.editMessage = async (req, res) => {
  try {
    const conversation = await conversationForMember(req.params.conversationId, req.user._id);
    if (!conversation) return fail(res, "Conversation not found", 404);
    const content = clean(req.body?.content);
    if (!content || content.length > 2000) return fail(res, "Message must be between 1 and 2000 characters", 400);
    const message = await DirectMessage.findOne({ _id: req.params.messageId, conversationId: conversation._id, deletedAt: null });
    if (!message) return fail(res, "Message not found", 404);
    if (String(message.senderId) !== String(req.user._id)) return fail(res, "You can only edit your own messages", 403);
    message.content = content; message.editedAt = new Date(); await message.save();
    const payload = publicMessage(message);
    const io = req.app.locals.io;
    conversation.participantIds.forEach((id) => emitToUser(io, id, "dm:message-updated", payload));
    res.json({ success: true, message: payload });
  } catch (error) { console.error(error); fail(res, "Failed to edit message"); }
};

exports.deleteMessage = async (req, res) => {
  try {
    const conversation = await conversationForMember(req.params.conversationId, req.user._id);
    if (!conversation) return fail(res, "Conversation not found", 404);
    const message = await DirectMessage.findOne({ _id: req.params.messageId, conversationId: conversation._id, deletedAt: null });
    if (!message) return fail(res, "Message not found", 404);
    if (String(message.senderId) !== String(req.user._id)) return fail(res, "You can only delete your own messages", 403);
    message.deletedAt = new Date(); message.content = ""; message.attachments = []; await message.save();
    const io = req.app.locals.io;
    conversation.participantIds.forEach((id) => emitToUser(io, id, "dm:message-deleted", { conversationId: String(conversation._id), messageId: String(message._id) }));
    res.json({ success: true });
  } catch (error) { console.error(error); fail(res, "Failed to delete message"); }
};

exports.markRead = async (req, res) => {
  try {
    const conversation = await conversationForMember(req.params.conversationId, req.user._id);
    if (!conversation) return fail(res, "Conversation not found", 404);
    const mine = conversation.participants.find((item) => String(item.userId) === String(req.user._id));
    if (mine) mine.lastReadAt = new Date(); else conversation.participants.push({ userId: req.user._id, lastReadAt: new Date() });
    await conversation.save();
    res.json({ success: true });
  } catch (error) { console.error(error); fail(res, "Failed to mark conversation as read"); }
};

exports.uploadAttachment = async (req, res) => {
  try {
    const conversation = await conversationForMember(req.params.conversationId, req.user._id);
    if (!conversation) return fail(res, "Conversation not found", 404);
    if (!req.file) return fail(res, "No file provided", 400);
    if (!cloudinaryConfigured()) return fail(res, "File uploads are not configured on this server", 503);
    const result = await uploadBuffer(req.file.buffer, { public_id: `dm-${conversation._id}-${Date.now()}` });
    res.json({ success: true, attachment: { type: req.file.mimetype.startsWith("image/") ? "image" : "file", url: result.secure_url, name: req.file.originalname } });
  } catch (error) { console.error(error); fail(res, "Failed to upload attachment"); }
};

// Private 1:1 video/audio call â€” a LiveKit room scoped to only the two
// participants of this conversation, never visible to anyone else.
exports.createCallToken = async (req, res) => {
  try {
    if (!process.env.LIVEKIT_URL || !process.env.LIVEKIT_API_KEY || !process.env.LIVEKIT_API_SECRET) {
      return fail(res, "Calling is not configured on the server", 503);
    }
    const conversation = await conversationForMember(req.params.conversationId, req.user._id);
    if (!conversation) return fail(res, "Conversation not found", 404);
    const roomName = `dm-${conversation._id}`;
    const token = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET, {
      identity: String(req.user._id),
      name: req.user.name || "Member",
      ttl: "1h",
    });
    token.addGrant({ roomJoin: true, room: roomName, canPublish: true, canSubscribe: true, canPublishData: true });
    const otherId = conversation.participantIds.find((id) => String(id) !== String(req.user._id));
    if (req.body?.ring) {
      emitToUser(req.app.locals.io, otherId, "dm:call-incoming", { conversationId: String(conversation._id), from: { id: req.user._id, name: req.user.name, avatarUrl: req.user.avatarUrl || "" } });
    }
    res.json({ success: true, token: await token.toJwt(), url: process.env.LIVEKIT_URL, roomName });
  } catch (error) { console.error(error); fail(res, "Failed to create the call access token"); }
};

exports.declineCall = async (req, res) => {
  try {
    const conversation = await conversationForMember(req.params.conversationId, req.user._id);
    if (!conversation) return fail(res, "Conversation not found", 404);
    const otherId = conversation.participantIds.find((id) => String(id) !== String(req.user._id));
    emitToUser(req.app.locals.io, otherId, "dm:call-declined", { conversationId: String(conversation._id) });
    res.json({ success: true });
  } catch (error) { console.error(error); fail(res, "Failed to decline call"); }
};

