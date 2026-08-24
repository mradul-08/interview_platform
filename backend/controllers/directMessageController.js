const Conversation = require("../models/Conversation");
const DirectMessage = require("../models/DirectMessage");
const Notification = require("../models/Notification");
const Block = require("../models/Block");
const User = require("../models/User");
const { emitToUser, isUserOnline, isUserInConversation } = require("../socket");
const { AccessToken } = require("livekit-server-sdk");
const { isConfigured: cloudinaryConfigured, uploadBuffer } = require("../services/cloudinary");

const fail = (res, message, status = 500) => res.status(status).json({ success: false, message });
const clean = (value, fallback = "") => String(value || fallback).trim();
const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const pairKeyFor = (a, b) => [String(a), String(b)].sort().join("_");

async function conversationForMember(conversationId, userId) {
  return Conversation.findOne({ _id: conversationId, participantIds: userId });
}

// Every relationship fact a permission decision needs, computed fresh from
// the database (never trusted from the client): who the other participant
// is, the chat-request status, and the block state in both directions.
async function getRelationship(conversation, userId) {
  const otherId = conversation.participantIds.find((id) => String(id) !== String(userId));
  const [blockedByMe, blockedByThem] = await Promise.all([
    Block.exists({ blockerId: userId, blockedId: otherId }),
    Block.exists({ blockerId: otherId, blockedId: userId }),
  ]);
  const status = conversation.requestedBy ? (conversation.status || "ACCEPTED") : "ACCEPTED";
  return {
    otherId,
    status,
    requestedByMe: String(conversation.requestedBy) === String(userId),
    blockedByMe: Boolean(blockedByMe),
    blockedByThem: Boolean(blockedByThem),
  };
}

// Messaging, attachments, and calls are only permitted once the request has
// been accepted by both sides and neither side has blocked the other.
function canExchange(relationship) {
  return relationship.status === "ACCEPTED" && !relationship.blockedByMe && !relationship.blockedByThem;
}

function otherParticipant(conversation, userId, usersById) {
  const otherId = conversation.participantIds.find((id) => String(id) !== String(userId));
  const user = usersById.get(String(otherId));
  return {
    id: otherId,
    name: user?.name || "CodeVerse member",
    username: user?.username || "",
    avatarUrl: user?.avatarUrl || "",
    online: otherId ? isUserOnline(otherId) : false,
    lastSeenAt: user?.lastSeenAt || null,
  };
}

async function publicConversation(conversation, userId) {
  const users = await User.find({ _id: { $in: conversation.participantIds } }).select("name username avatarUrl lastSeenAt").lean();
  const usersById = new Map(users.map((user) => [String(user._id), user]));
  const mine = conversation.participants.find((item) => String(item.userId) === String(userId));
  const relationship = await getRelationship(conversation, userId);
  const unreadCount = relationship.status === "ACCEPTED" ? await DirectMessage.countDocuments({
    conversationId: conversation._id,
    deletedAt: null,
    senderId: { $ne: userId },
    createdAt: { $gt: mine?.lastReadAt || new Date(0) },
  }) : 0;
  return {
    id: conversation._id,
    with: otherParticipant(conversation, userId, usersById),
    status: relationship.status,
    requestedByMe: relationship.requestedByMe,
    requestNote: relationship.status === "PENDING" ? (conversation.requestNote || "") : "",
    requestedAt: conversation.createdAt,
    blockedByMe: relationship.blockedByMe,
    blockedByThem: relationship.blockedByThem,
    canMessage: canExchange(relationship),
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
    const [blockedByMe, blockedMe] = await Promise.all([
      Block.find({ blockerId: req.user._id }).select("blockedId").lean(),
      Block.find({ blockedId: req.user._id }).select("blockerId").lean(),
    ]);
    const excludeIds = [req.user._id, ...blockedByMe.map((b) => b.blockedId), ...blockedMe.map((b) => b.blockerId)];
    const users = await User.find({
      _id: { $nin: excludeIds },
      role: "student",
      $or: [{ name: { $regex: escapeRegExp(query), $options: "i" } }, { username: { $regex: escapeRegExp(query), $options: "i" } }],
    }).select("name username avatarUrl").limit(10).lean();
    res.json({ success: true, users: users.map((user) => ({ id: user._id, name: user.name, username: user.username || "", avatarUrl: user.avatarUrl || "", online: isUserOnline(user._id) })) });
  } catch (error) { console.error(error); fail(res, "Failed to search members"); }
};

exports.listConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({ participantIds: req.user._id }).sort({ lastMessageAt: -1, updatedAt: -1 }).limit(100);
    // Older data can contain more than one row for the same pair from before
    // the unique pairKey index was introduced. Collapse those rows at read
    // time so the inbox never renders duplicate people.
    const uniqueConversations = new Map();
    for (const conversation of conversations) {
      // Use participant IDs as the canonical key. Some legacy duplicate rows
      // have different/missing pairKey values, but they still represent the
      // same two people.
      const key = conversation.participantIds.map(String).sort().join("_");
      if (!uniqueConversations.has(key)) uniqueConversations.set(key, conversation);
    }
    const items = await Promise.all([...uniqueConversations.values()].map((conversation) => publicConversation(conversation, req.user._id)));
    res.json({ success: true, conversations: items });
  } catch (error) { console.error(error); fail(res, "Failed to load messages"); }
};

exports.startConversation = async (req, res) => {
  try {
    const targetUserId = clean(req.body?.userId);
    if (!targetUserId || targetUserId === String(req.user._id)) return fail(res, "Choose a valid member to message", 400);
    const target = await User.findById(targetUserId).select("_id").lean();
    if (!target) return fail(res, "That member could not be found", 404);
    const blocked = await Block.exists({
      $or: [
        { blockerId: req.user._id, blockedId: targetUserId },
        { blockerId: targetUserId, blockedId: req.user._id },
      ],
    });
    if (blocked) return fail(res, "You can't start a conversation with this member", 403);
    const note = clean(req.body?.note).slice(0, 200);
    const pairKey = pairKeyFor(req.user._id, targetUserId);
    const existing = await Conversation.findOne({ pairKey });
    if (existing) {
      // Re-requesting after a decline re-opens the request from whoever asks now.
      if (existing.status === "DECLINED") {
        existing.status = "PENDING";
        existing.requestedBy = req.user._id;
        existing.requestNote = note;
        existing.respondedAt = null;
        await existing.save();
        emitToUser(req.app.locals.io, targetUserId, "dm:conversation-updated", await publicConversation(existing, targetUserId));
        await Notification.create({ userId: targetUserId, type: "direct_message", fromUserId: req.user._id, title: `${req.user.name} wants to chat with you`, body: note || "New message request" }).catch(() => {});
        emitToUser(req.app.locals.io, targetUserId, "notifications:updated", { reason: "chat-request" });
      }
      return res.status(201).json({ success: true, conversation: await publicConversation(existing, req.user._id) });
    }
    const conversation = await Conversation.create({
      pairKey,
      participantIds: [req.user._id, targetUserId],
      participants: [{ userId: req.user._id }, { userId: targetUserId }],
      status: "PENDING",
      requestedBy: req.user._id,
      requestNote: note,
    });
    emitToUser(req.app.locals.io, targetUserId, "dm:conversation-updated", await publicConversation(conversation, targetUserId));
    await Notification.create({ userId: targetUserId, type: "direct_message", fromUserId: req.user._id, title: `${req.user.name} wants to chat with you`, body: note || "New message request" }).catch(() => {});
    emitToUser(req.app.locals.io, targetUserId, "notifications:updated", { reason: "chat-request" });
    res.status(201).json({ success: true, conversation: await publicConversation(conversation, req.user._id) });
  } catch (error) { console.error(error); fail(res, "Failed to start a conversation"); }
};

exports.respondToRequest = async (req, res) => {
  try {
    const decision = clean(req.params.decision);
    if (!["accept", "decline"].includes(decision)) return fail(res, "Unknown decision", 400);
    const conversation = await conversationForMember(req.params.conversationId, req.user._id);
    if (!conversation) return fail(res, "Conversation not found", 404);
    if (conversation.status !== "PENDING") return fail(res, "This request has already been resolved", 400);
    if (String(conversation.requestedBy) === String(req.user._id)) return fail(res, "You can't respond to your own request", 400);
    conversation.status = decision === "accept" ? "ACCEPTED" : "DECLINED";
    conversation.respondedAt = new Date();
    conversation.requestNote = "";
    await conversation.save();
    const io = req.app.locals.io;
    for (const participantId of conversation.participantIds) {
      emitToUser(io, participantId, "dm:conversation-updated", await publicConversation(conversation, participantId));
    }
    if (decision === "accept") {
      await Notification.create({ userId: conversation.requestedBy, type: "direct_message", fromUserId: req.user._id, title: `${req.user.name} accepted your chat request`, body: "You can now message each other" }).catch(() => {});
      emitToUser(io, conversation.requestedBy, "notifications:updated", { reason: "chat-request-accepted" });
    }
    res.json({ success: true, conversation: await publicConversation(conversation, req.user._id) });
  } catch (error) { console.error(error); fail(res, "Failed to update the chat request"); }
};

exports.blockUser = async (req, res) => {
  try {
    const targetUserId = clean(req.params.userId);
    if (!targetUserId || targetUserId === String(req.user._id)) return fail(res, "Choose a valid member to block", 400);
    const target = await User.findById(targetUserId).select("_id name").lean();
    if (!target) return fail(res, "That member could not be found", 404);
    await Block.updateOne({ blockerId: req.user._id, blockedId: targetUserId }, { $setOnInsert: { blockerId: req.user._id, blockedId: targetUserId } }, { upsert: true });
    const io = req.app.locals.io;
    const conversation = await Conversation.findOne({ pairKey: pairKeyFor(req.user._id, targetUserId) });
    if (conversation) {
      for (const participantId of conversation.participantIds) {
        emitToUser(io, participantId, "dm:conversation-updated", await publicConversation(conversation, participantId));
      }
    } else {
      emitToUser(io, targetUserId, "dm:blocked", { userId: String(req.user._id) });
    }
    res.json({ success: true });
  } catch (error) { console.error(error); fail(res, "Failed to block this member"); }
};

exports.unblockUser = async (req, res) => {
  try {
    const targetUserId = clean(req.params.userId);
    await Block.deleteOne({ blockerId: req.user._id, blockedId: targetUserId });
    const io = req.app.locals.io;
    const conversation = await Conversation.findOne({ pairKey: pairKeyFor(req.user._id, targetUserId) });
    if (conversation) {
      for (const participantId of conversation.participantIds) {
        emitToUser(io, participantId, "dm:conversation-updated", await publicConversation(conversation, participantId));
      }
    }
    res.json({ success: true });
  } catch (error) { console.error(error); fail(res, "Failed to unblock this member"); }
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
    const relationship = await getRelationship(conversation, req.user._id);
    if (relationship.blockedByMe || relationship.blockedByThem) return fail(res, "You can't message this member", 403);
    if (relationship.status === "PENDING") return fail(res, relationship.requestedByMe ? "Waiting for them to accept your chat request" : "Accept the chat request before replying", 403);
    if (relationship.status === "DECLINED") return fail(res, "This chat request was declined", 403);
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
    const otherId = relationship.otherId;
    const io = req.app.locals.io;
    emitToUser(io, otherId, "dm:message", payload);
    emitToUser(io, req.user._id, "dm:message", payload);
    // Skip the notification (and its badge event) when the recipient already
    // has this conversation open in realtime — they're looking at the
    // message as it arrives via dm:message, so a notification would just be
    // noise/spam. A notification failure must also never turn a
    // successfully persisted message into a client-visible 500 (which can
    // cause the sender to retry it).
    if (!isUserInConversation(io, otherId, conversation._id)) {
      await Notification.create({ userId: otherId, type: "direct_message", fromUserId: req.user._id, title: `${req.user.name} sent you a message`, body: (content || "Sent an attachment").slice(0, 280) })
        .catch((error) => console.error("Failed to create direct-message notification:", error.message));
      emitToUser(io, otherId, "notifications:updated", { reason: "direct-message" });
    }
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
    const now = new Date();
    const mine = conversation.participants.find((item) => String(item.userId) === String(req.user._id));

    // Use targeted updates here so legacy conversations without the newer
    // request fields can still record a read receipt without full validation.
    if (mine) {
      await Conversation.updateOne(
        { _id: conversation._id, "participants.userId": req.user._id },
        { $set: { "participants.$.lastReadAt": now } }
      );
    } else {
      await Conversation.updateOne(
        { _id: conversation._id },
        { $push: { participants: { userId: req.user._id, lastReadAt: now } } }
      );
    }
    // Sync unread badges across every other open tab of this same account.
    emitToUser(req.app.locals.io, req.user._id, "dm:read", { conversationId: String(conversation._id) });
    // Tell the other participant this conversation was read up to `now`, so
    // their sent messages before this point can show a "Read" state.
    const otherId = conversation.participantIds.find((id) => String(id) !== String(req.user._id));
    if (otherId) emitToUser(req.app.locals.io, otherId, "dm:read-by", { conversationId: String(conversation._id), readAt: now.toISOString() });
    res.json({ success: true });
  } catch (error) { console.error(error); fail(res, "Failed to mark conversation as read"); }
};

exports.uploadAttachment = async (req, res) => {
  try {
    const conversation = await conversationForMember(req.params.conversationId, req.user._id);
    if (!conversation) return fail(res, "Conversation not found", 404);
    const relationship = await getRelationship(conversation, req.user._id);
    if (!canExchange(relationship)) return fail(res, "You can't send attachments in this conversation", 403);
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
    const relationship = await getRelationship(conversation, req.user._id);
    if (!canExchange(relationship)) return fail(res, "You can't call this member", 403);
    const roomName = `dm-${conversation._id}`;
    const token = new AccessToken(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET, {
      identity: String(req.user._id),
      name: req.user.name || "Member",
      ttl: "1h",
    });
    token.addGrant({ roomJoin: true, room: roomName, canPublish: true, canSubscribe: true, canPublishData: true });
    const otherId = relationship.otherId;
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
