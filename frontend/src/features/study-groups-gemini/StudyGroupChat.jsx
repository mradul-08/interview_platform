import { useCallback, useEffect, useRef, useState } from "react";
import { getMessages, markGroupMessageNotificationsRead, sendMessage } from "./api";
import { connectRealtimeSocket } from "../../realtime/socket";
import "./studyGroupChat.css";
import "./studyGroupChatFixes.css";

function getCurrentUserPresence() {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const id = user._id || user.id || user.userId;
    return id ? { [String(id)]: user.name || "You" } : {};
  } catch {
    return {};
  }
}

function getCurrentUserId() {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return user._id || user.id || user.userId || "";
  } catch {
    return "";
  }
}

function getCurrentUserProfile() {
  try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; }
}

function presenceMap(users = []) {
  return users.reduce((current, user) => {
    if (user?.id) current[String(user.id)] = user.name || "Member";
    return current;
  }, {});
}

function formatMessageTime(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date);
}

export default function StudyGroupChat({ groupId }) {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [typingUser, setTypingUser] = useState("");
  const [onlineUsers, setOnlineUsers] = useState(getCurrentUserPresence);
  const [sending, setSending] = useState(false);
  const [newMessages, setNewMessages] = useState(0);
  const [retryingId, setRetryingId] = useState("");
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasOlderMessages, setHasOlderMessages] = useState(true);
  const typingTimer = useRef(null);
  const listRef = useRef(null);
  const loadingRef = useRef(false);
  const atBottomRef = useRef(true);
  const currentUserId = String(getCurrentUserId());

  const scrollToBottom = useCallback(() => {
    const list = listRef.current;
    if (!list) return;
    list.scrollTop = list.scrollHeight;
    atBottomRef.current = true;
    setNewMessages(0);
  }, []);

  const appendMessage = useCallback((message) => {
    setMessages((items) => {
      if (items.some((item) => String(item._id) === String(message._id))) return items;
      const pendingIndex = items.findIndex((item) => item.deliveryStatus === "sending" && item.content === message.content);
      if (pendingIndex >= 0) return items.map((item, index) => index === pendingIndex ? { ...message, deliveryStatus: message.deliveryStatus || "sent" } : item);
      return [...items, { ...message, deliveryStatus: message.deliveryStatus || "delivered" }];
    });
    if (atBottomRef.current) window.requestAnimationFrame(scrollToBottom);
    else setNewMessages((count) => count + 1);
  }, [scrollToBottom]);

  const load = useCallback(async ({ background = false } = {}) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    if (!background) setLoading(true);
    try {
      const loaded = await getMessages(groupId);
      const decorated = loaded.map((message) => {
        const isOwn = String(message.authorId?._id || message.authorId) === currentUserId;
        const hasRead = message.readBy?.some((receipt) => String(receipt.userId) !== currentUserId);
        const hasDelivered = message.deliveredTo?.some((receipt) => String(receipt.userId) !== currentUserId);
        return { ...message, deliveryStatus: isOwn ? (hasRead ? "read" : hasDelivered ? "delivered" : "sent") : "delivered" };
      });
      setMessages((current) => {
        const serverIds = new Set(decorated.map((message) => String(message._id)));
        const transient = current.filter((message) => (String(message._id).startsWith("sending-") || String(message._id).startsWith("failed-")) && !serverIds.has(String(message._id)));
        return [...decorated, ...transient];
      });
      setHasOlderMessages(loaded.length === 50);
      setError("");
      if (!background) window.requestAnimationFrame(scrollToBottom);
    }
    catch (err) { if (!background) setError(err.response?.data?.message || "Chat could not be loaded."); }
    finally {
      loadingRef.current = false;
      if (!background) setLoading(false);
    }
  }, [currentUserId, groupId, scrollToBottom]);

  const loadOlderMessages = useCallback(async () => {
    if (loadingOlder || !hasOlderMessages || !messages.length) return;
    const oldest = messages.find((message) => !String(message._id).startsWith("sending-") && !String(message._id).startsWith("failed-"));
    if (!oldest?.createdAt) { setHasOlderMessages(false); return; }
    const list = listRef.current;
    const previousHeight = list?.scrollHeight || 0;
    const previousTop = list?.scrollTop || 0;
    setLoadingOlder(true);
    try {
      const older = await getMessages(groupId, oldest.createdAt);
      const decorated = older.map((message) => {
        const isOwn = String(message.authorId?._id || message.authorId) === currentUserId;
        const hasRead = message.readBy?.some((receipt) => String(receipt.userId) !== currentUserId);
        const hasDelivered = message.deliveredTo?.some((receipt) => String(receipt.userId) !== currentUserId);
        return { ...message, deliveryStatus: isOwn ? (hasRead ? "read" : hasDelivered ? "delivered" : "sent") : "delivered" };
      });
      setMessages((items) => {
        const existing = new Set(items.map((item) => String(item._id)));
        return [...decorated.filter((message) => !existing.has(String(message._id))), ...items];
      });
      setHasOlderMessages(older.length === 50);
      window.requestAnimationFrame(() => { if (list) list.scrollTop = previousTop + ((list.scrollHeight || 0) - previousHeight); });
    } catch (err) { setError(err.response?.data?.message || "Older messages could not be loaded."); }
    finally { setLoadingOlder(false); }
  }, [currentUserId, groupId, hasOlderMessages, loadingOlder, messages]);

  const submit = async (event) => {
    event.preventDefault();
    const content = draft.trim();
    if (!content) return;
    const clientId = `sending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const user = getCurrentUserProfile();
    const optimisticMessage = { _id: clientId, groupId, content, createdAt: new Date().toISOString(), authorId: { _id: currentUserId, name: user.name || "You", avatarUrl: user.avatarUrl || "" }, deliveryStatus: "sending" };
    setMessages((items) => [...items, optimisticMessage]);
    setDraft("");
    window.requestAnimationFrame(scrollToBottom);
    try {
      setSending(true);
      const message = await sendMessage(groupId, content);
      setMessages((items) => {
        if (items.some((item) => String(item._id) === String(message._id))) return items;
        return items.map((item) => String(item._id) === clientId ? { ...message, deliveryStatus: "sent" } : item);
      });
      setError("");
    } catch (err) {
      setMessages((items) => items.map((item) => String(item._id) === clientId ? { ...item, deliveryStatus: "failed" } : item));
      setError(err.response?.data?.message || "Message could not be sent. You can retry it.");
    }
    finally { setSending(false); }
  };

  const retryMessage = async (failedMessage) => {
    if (retryingId) return;
    setRetryingId(String(failedMessage._id));
    try {
      const message = await sendMessage(groupId, failedMessage.content);
      setMessages((items) => items.map((item) => String(item._id) === String(failedMessage._id) ? { ...message, deliveryStatus: "sent" } : item));
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Retry failed. Please try again.");
    } finally { setRetryingId(""); }
  };

  useEffect(() => {
    load();
    const socket = connectRealtimeSocket();
    const chatActiveRef = { current: false };
    const isChatVisible = () => document.visibilityState === "visible" && document.hasFocus();
    const updateChatActivity = () => {
      const active = isChatVisible() && socket.connected;
      if (active === chatActiveRef.current) return;
      chatActiveRef.current = active;
      window.__studyGroupActiveChat = active ? String(groupId) : "";
      window.dispatchEvent(new CustomEvent("study-group-chat-activity", { detail: { groupId, active } }));
      socket.emit(active ? "group:chat-active" : "group:chat-inactive", { groupId });
      if (active) markGroupMessageNotificationsRead(groupId).catch(() => {});
    };
    const joinGroup = () => {
      socket.emit("group:join", { groupId }, (response) => {
        if (!response?.ok) return;
        setOnlineUsers({ ...getCurrentUserPresence(), ...presenceMap(response.onlineUsers) });
        updateChatActivity();
      });
    };
    const onConnect = () => {
      setConnected(true);
      setOnlineUsers(getCurrentUserPresence());
      load({ background: true });
      joinGroup();
    };
    const onDisconnect = () => {
      setConnected(false);
      setOnlineUsers({});
      chatActiveRef.current = false;
    };
    const onMessage = (message) => {
      if (String(message.groupId) !== String(groupId)) return;
      const authorId = String(message.authorId?._id || message.authorId);
      if (authorId !== currentUserId) socket.emit("group:message-delivered", { groupId, messageId: message._id });
      appendMessage({ ...message, deliveryStatus: authorId === currentUserId ? "sent" : "delivered" });
    };
    const onMessageStatus = (event) => {
      if (String(event.groupId) !== String(groupId)) return;
      setMessages((items) => items.map((message) => String(message._id) === String(event.messageId) ? { ...message, deliveryStatus: event.status } : message));
    };
    const onTyping = (event) => {
      if (String(event.groupId) !== String(groupId)) return;
      setTypingUser(event.isTyping ? (event.user?.name || "A member") : "");
    };
    const onPresence = (event) => {
      if (String(event.groupId) !== String(groupId) || !event.user?.id) return;
      setOnlineUsers((current) => {
        const next = { ...current };
        if (event.state === "offline") delete next[event.user.id];
        else next[event.user.id] = event.user.name || "Member";
        return next;
      });
    };
    const onProfileUpdated = (event) => {
      if (String(event.groupId) !== String(groupId)) return;
      setMessages((items) => items.map((message) => String(message.authorId?._id) === String(event.userId)
        ? { ...message, authorId: { ...message.authorId, avatarUrl: event.avatarUrl || "" } }
        : message));
    };
    socket.on("connect", onConnect); socket.on("disconnect", onDisconnect); socket.on("group:message", onMessage); socket.on("group:message-status", onMessageStatus); socket.on("group:typing", onTyping); socket.on("group:presence", onPresence); socket.on("group:profile-updated", onProfileUpdated);
    document.addEventListener("visibilitychange", updateChatActivity); window.addEventListener("focus", updateChatActivity); window.addEventListener("blur", updateChatActivity);
    setConnected(socket.connected);
    if (socket.connected) joinGroup();
    return () => { socket.off("connect", onConnect); socket.off("disconnect", onDisconnect); socket.off("group:message", onMessage); socket.off("group:message-status", onMessageStatus); socket.off("group:typing", onTyping); socket.off("group:presence", onPresence); socket.off("group:profile-updated", onProfileUpdated); document.removeEventListener("visibilitychange", updateChatActivity); window.removeEventListener("focus", updateChatActivity); window.removeEventListener("blur", updateChatActivity); if (window.__studyGroupActiveChat === String(groupId)) window.__studyGroupActiveChat = ""; window.dispatchEvent(new CustomEvent("study-group-chat-activity", { detail: { groupId, active: false } })); if (typingTimer.current) clearTimeout(typingTimer.current); if (socket.connected) { socket.emit("group:chat-inactive", { groupId }); socket.emit("group:typing", { groupId, isTyping: false }); } };
  }, [appendMessage, currentUserId, groupId, load]);

  useEffect(() => {
    if (!connected || loading) return;
    const socket = connectRealtimeSocket();
    messages.forEach((message) => {
      const authorId = String(message.authorId?._id || message.authorId);
      if (authorId && authorId !== currentUserId) socket.emit("group:message-read", { groupId, messageId: message._id });
    });
  }, [connected, currentUserId, groupId, loading, messages]);

  const onListScroll = (event) => {
    const list = event.currentTarget;
    atBottomRef.current = list.scrollHeight - list.scrollTop - list.clientHeight < 24;
    if (atBottomRef.current) setNewMessages(0);
    if (list.scrollTop <= 20) loadOlderMessages();
  };

  const onDraftChange = (event) => {
    const value = event.target.value;
    setDraft(value);
    const socket = connectRealtimeSocket();
    socket.emit("group:typing", { groupId, isTyping: Boolean(value.trim()) });
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => socket.emit("group:typing", { groupId, isTyping: false }), 900);
  };

  return <section className="sg-card sg-chat-panel"><div className="sg-section-head"><div><h2>Group chat</h2><span className={connected ? "sg-chat-connection online" : "sg-chat-connection"} role="status"><i />{connected ? (Object.keys(onlineUsers).length ? `${Object.keys(onlineUsers).length} online` : "Connected") : "Reconnecting..."}</span></div><span className="sg-chip">{messages.length} messages</span></div>{error && <p className="sg-error-text" role="alert">{error} <button type="button" className="sg-btn" onClick={load}>Retry</button></p>}{typingUser && <p className="sg-chat-typing" role="status">{typingUser} is typing...</p>}<div ref={listRef} className="sg-chat-list" role="log" aria-live="polite" aria-label="Group messages" onScroll={onListScroll}>{loading ? <div className="sg-chat-skeleton" aria-label="Loading messages"><span /><span /><span /><span /></div> : <>{loadingOlder && <div className="sg-chat-older-loading">Loading older messages...</div>}{messages.map((message, index) => { const isOwn = String(message.authorId?._id || message.authorId) === currentUserId; const previous = messages[index - 1]; const isContinuation = previous && String(previous.authorId?._id || previous.authorId) === String(message.authorId?._id || message.authorId) && formatMessageTime(previous.createdAt || previous.updatedAt) === formatMessageTime(message.createdAt || message.updatedAt); const timestamp = message.createdAt || message.updatedAt; return <div className={`sg-row ${isOwn ? "is-own" : ""} ${isContinuation ? "is-continuation" : ""}`} key={message._id}><div className="sg-dot">{message.authorId?.avatarUrl ? <img src={message.authorId.avatarUrl} alt="" /> : (message.authorId?.name?.[0] || "M")}</div><div><div className="sg-message-meta">{!isContinuation && <strong>{message.authorId?.name || "Member"}</strong>}{formatMessageTime(timestamp) && <time dateTime={timestamp}>{formatMessageTime(timestamp)}</time>}</div><p>{message.content}</p>{isOwn && <small className={`sg-message-status ${message.deliveryStatus || "sent"}`}>{message.deliveryStatus || "sent"}</small>}{isOwn && message.deliveryStatus === "failed" && <button type="button" className="sg-message-retry" onClick={() => retryMessage(message)} disabled={retryingId === String(message._id)}>{retryingId === String(message._id) ? "Retrying..." : "Retry"}</button>}</div></div>; })}</>}{!loading && !messages.length && <div className="sg-chat-empty"><strong>No messages yet</strong><p>Start the conversation with your study group.</p></div>}</div>{newMessages > 0 && <button type="button" className="sg-chat-new" onClick={scrollToBottom}>{newMessages} new {newMessages === 1 ? "message" : "messages"}</button>}<form className="sg-actions sg-chat-composer" onSubmit={submit}><input className="sg-search" aria-label="Chat message" maxLength="4000" value={draft} onChange={onDraftChange} placeholder="Write a message..." disabled={sending} /><button type="submit" className="sg-btn accent" disabled={sending || !draft.trim()}>{sending ? "Sending..." : "Send"}</button></form></section>;
}
