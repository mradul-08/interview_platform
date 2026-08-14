const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");
const User = require("./models/User");
const Conversation = require("./models/Conversation");

const roomForUser = (userId) => `user:${String(userId)}`;
const roomForConversation = (conversationId) => `dm:${String(conversationId)}`;

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

module.exports = { initSocket, emitToUser, roomForUser, roomForConversation };