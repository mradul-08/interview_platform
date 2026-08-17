const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const { Server } = require("socket.io");
const User = require("./models/User");
const Conversation = require("./models/Conversation");

const roomForUser = (userId) => `user:${String(userId)}`;
const roomForConversation = (conversationId) => `dm:${String(conversationId)}`;
const roomForGroup = (groupId) => `study-group:${String(groupId)}`;
const roomForGroupChat = (groupId) => `study-group-chat:${String(groupId)}`;

function readCookie(header, name) {
  const value = String(header || "").split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return value ? decodeURIComponent(value.slice(name.length + 1)) : null;
}

function tokenFromSocket(socket) {
  const authToken = socket.handshake.auth?.token;
  if (authToken) return authToken;
  const authorization = socket.handshake.headers?.authorization;
  if (authorization?.startsWith("Bearer ")) return authorization.slice(7);
  return readCookie(socket.handshake.headers?.cookie, "accessToken");
}

function initSocket(httpServer) {
  const configuredClientUrl = process.env.CLIENT_URL || "http://localhost:5173";
  const allowedOrigins = new Set([configuredClientUrl, "http://localhost:5173", "http://127.0.0.1:5173"]);
  const io = new Server(httpServer, { connectionStateRecovery: { maxDisconnectionDuration: 120000, skipMiddlewares: true }, cors: { origin: (origin, callback) => callback(null, !origin || allowedOrigins.has(origin)), credentials: true } });
  io.use(async (socket, next) => {
    try {
      const token = tokenFromSocket(socket);
      if (!token) return next(new Error("Authentication required"));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select("_id role name avatarUrl").lean();
      if (!user) return next(new Error("User not found"));
      socket.data.userId = String(user._id);
      socket.data.role = user.role;
      socket.data.name = user.name || "Member";
      socket.data.avatarUrl = user.avatarUrl || "";
      socket.data.conversations = new Set();
      next();
    } catch { next(new Error("Socket authentication failed")); }
  });
  io.on("connection", (socket) => {
    socket.join(roomForUser(socket.data.userId));
    socket.emit("realtime:ready", { userId: socket.data.userId });

    socket.on("group:join", async ({ groupId } = {}, acknowledge) => {
      try {
        if (!groupId) throw new Error("Group id is required");
        const GroupMember = require("mongoose").models.GeminiStudyGroupMember;
        const isMember = await GroupMember?.exists({ groupId, userId: socket.data.userId, status: "APPROVED" });
        if (!isMember) throw new Error("You are not a member of this group");
        const normalizedGroupId = String(groupId);
        const alreadyJoined = socket.data.groups?.has(normalizedGroupId);
        socket.join(roomForGroup(groupId));
        socket.data.groups = socket.data.groups || new Set();
        socket.data.groups.add(normalizedGroupId);
        const peers = await io.in(roomForGroup(groupId)).fetchSockets();
        const onlineUsers = [];
        for (const peer of peers) {
          onlineUsers.push({ id: peer.data.userId, name: peer.data.name });
          if (peer.id !== socket.id) socket.emit("group:presence", { groupId: normalizedGroupId, user: { id: peer.data.userId, name: peer.data.name }, state: "online" });
        }
        if (!alreadyJoined) socket.to(roomForGroup(groupId)).emit("group:presence", { groupId: normalizedGroupId, user: { id: socket.data.userId, name: socket.data.name }, state: "online" });
        acknowledge?.({ ok: true, onlineUsers });
      } catch (error) { acknowledge?.({ ok: false, message: error.message }); }
    });
    socket.on("group:leave", ({ groupId } = {}) => { if (!groupId) return; if (socket.data.groups?.has(String(groupId))) socket.to(roomForGroup(groupId)).emit("group:presence", { groupId: String(groupId), user: { id: socket.data.userId, name: socket.data.name }, state: "offline" }); socket.leave(roomForGroup(groupId)); socket.data.groups?.delete(String(groupId)); });
    socket.on("group:typing", ({ groupId, isTyping } = {}) => { if (!groupId || !socket.data.groups?.has(String(groupId))) return; socket.to(roomForGroup(groupId)).emit("group:typing", { groupId: String(groupId), user: { id: socket.data.userId, name: socket.data.name }, isTyping: Boolean(isTyping) }); });

    socket.on("group:chat-active", async ({ groupId } = {}, acknowledge) => {
      try {
        if (!groupId) throw new Error("Group id is required");
        const GroupMember = mongoose.models.GeminiStudyGroupMember;
        const member = await GroupMember?.exists({ groupId, userId: socket.data.userId, status: "APPROVED" });
        if (!member) throw new Error("You are not a member of this group");
        socket.join(roomForGroupChat(groupId));
        acknowledge?.({ ok: true });
      } catch (error) { acknowledge?.({ ok: false, message: error.message }); }
    });
    socket.on("group:chat-inactive", ({ groupId } = {}) => { if (groupId) socket.leave(roomForGroupChat(groupId)); });

    const updateMessageReceipt = async ({ groupId, messageId }, field, status) => {
      if (!groupId || !messageId || !socket.data.groups?.has(String(groupId)) || !mongoose.isValidObjectId(messageId)) return;
      const GroupMember = mongoose.models.GeminiStudyGroupMember;
      const Message = mongoose.models.GeminiStudyGroupMessage;
      const member = await GroupMember?.exists({ groupId, userId: socket.data.userId, status: "APPROVED" });
      if (!member || !Message) return;
      const message = await Message.findOne({ _id: messageId, groupId });
      if (!message || String(message.authorId) === String(socket.data.userId)) return;
      const alreadyRecorded = message[field].some((receipt) => String(receipt.userId) === String(socket.data.userId));
      if (alreadyRecorded) return;
      const at = new Date();
      message[field].push({ userId: socket.data.userId, at });
      if (field === "readBy" && !message.deliveredTo.some((receipt) => String(receipt.userId) === String(socket.data.userId))) message.deliveredTo.push({ userId: socket.data.userId, at });
      await message.save();
      io.to(roomForGroup(groupId)).emit("group:message-status", { groupId: String(groupId), messageId: String(message._id), status, userId: socket.data.userId, at: at.toISOString() });
    };
    socket.on("group:message-delivered", (payload = {}) => { updateMessageReceipt(payload, "deliveredTo", "delivered").catch(() => {}); });
    socket.on("group:message-read", (payload = {}) => { updateMessageReceipt(payload, "readBy", "read").catch(() => {}); });

    socket.on("disconnect", () => { for (const groupId of socket.data.groups || []) socket.to(roomForGroup(groupId)).emit("group:presence", { groupId: String(groupId), user: { id: socket.data.userId, name: socket.data.name }, state: "offline" }); });

    socket.on("dm:join", async ({ conversationId } = {}, acknowledge) => {
      try {
        if (!conversationId) throw new Error("Conversation id is required");
        const isParticipant = await Conversation.exists({ _id: conversationId, participantIds: socket.data.userId });
        if (!isParticipant) throw new Error("You are not part of this conversation");
        socket.join(roomForConversation(conversationId));
        socket.data.conversations.add(String(conversationId));
        acknowledge?.({ ok: true });
      } catch (error) { acknowledge?.({ ok: false, message: error.message }); }
    });

    socket.on("dm:leave", ({ conversationId } = {}) => {
      if (!conversationId) return;
      socket.leave(roomForConversation(conversationId));
      socket.data.conversations.delete(String(conversationId));
    });

    socket.on("dm:typing", ({ conversationId, isTyping } = {}) => {
      if (!conversationId || !socket.data.conversations.has(String(conversationId))) return;
      socket.to(roomForConversation(conversationId)).emit("dm:typing", { conversationId: String(conversationId), user: { id: socket.data.userId, name: socket.data.name }, isTyping: Boolean(isTyping) });
    });
  });
  return io;
}

function emitToUser(io, userId, event, payload = {}) {
  if (io && userId && event) io.to(roomForUser(userId)).emit(event, payload);
}

module.exports = { initSocket, emitToUser, roomForUser, roomForConversation, roomForGroup, roomForGroupChat };
