import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowLeft, Ban, Check, CheckCheck, MoreVertical, Paperclip, Phone, PhoneOff, Search, Send, Trash2, X } from "lucide-react";
import api from "../../api/api";
import useRealtimeSocket from "../../realtime/useRealtimeSocket";
import { getRealtimeSocket } from "../../realtime/socket";
import DirectCallModal from "./DirectCallModal";
import "../../styles/messages.css";

const initials = (name) => (name || "M").split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();

function lastSeenLabel(lastSeenAt) {
  if (!lastSeenAt) return "Offline";
  const diffMs = Date.now() - new Date(lastSeenAt).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "Active just now";
  if (minutes < 60) return `Active ${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Active ${hours}h ago`;
  return `Active ${Math.round(hours / 24)}d ago`;
}

const messageTime = (iso) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

function dedupeConversations(items) {
  const unique = new Map();
  for (const item of items || []) {
    const key = String(item.with?.id || item.id);
    if (!unique.has(key)) unique.set(key, item);
  }
  return [...unique.values()];
}

function daySeparatorLabel(iso) {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const sameDay = (a, b) => a.toDateString() === b.toDateString();
  if (sameDay(date, today)) return "Today";
  if (sameDay(date, yesterday)) return "Yesterday";
  return date.toLocaleDateString([], { month: "long", day: "numeric", year: date.getFullYear() === today.getFullYear() ? undefined : "numeric" });
}

// Groups: consecutive messages from the same sender within 5 minutes render
// tighter together (no repeated tail spacing), and a day separator is
// inserted whenever the calendar date changes between two messages.
function withMessageGrouping(messages) {
  return messages.map((message, index) => {
    const previous = messages[index - 1];
    const showDaySeparator = !previous || new Date(previous.createdAt).toDateString() !== new Date(message.createdAt).toDateString();
    const grouped = !showDaySeparator && previous && previous.senderId === message.senderId && (new Date(message.createdAt) - new Date(previous.createdAt)) < 5 * 60 * 1000;
    return { message, showDaySeparator, grouped };
  });
}

export default function MessagesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [conversationError, setConversationError] = useState("");
  const [messageError, setMessageError] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sendError, setSendError] = useState("");
  const [search, setSearch] = useState("");
  const [requestTarget, setRequestTarget] = useState(null);
  const [requestNoteDraft, setRequestNoteDraft] = useState("");
  const [readReceipts, setReadReceipts] = useState({});
  const [results, setResults] = useState([]);
  const [typing, setTyping] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  const [activeCall, setActiveCall] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [requestBusy, setRequestBusy] = useState(false);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const bottomRef = useRef(null);

  const active = useMemo(() => conversations.find((item) => item.id === activeId) || null, [conversations, activeId]);

  const loadConversations = useCallback(async () => {
    setConversationError("");
    try {
      const response = await api.get("/api/messages/conversations");
      setConversations(dedupeConversations(response.data?.conversations));
    } catch (error) { setConversationError(error.response?.data?.message || "Conversations could not be loaded."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // Deep-link support: /dashboard/messages?userId=X[&groupId=Y][&call=1]
  // Lets the group members page open a chat (or straight into a call) with one tap.
  useEffect(() => {
    const targetUserId = searchParams.get("userId");
    if (!targetUserId || loading) return;
    const shouldCall = searchParams.get("call") === "1";
    openConversation(targetUserId, shouldCall);
    setSearchParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, searchParams]);

  useEffect(() => {
    const handle = setTimeout(async () => {
      if (search.trim().length < 2) return setResults([]);
      try { const response = await api.get("/api/messages/search", { params: { query: search.trim() } }); setResults(response.data?.users || []); }
      catch { setResults([]); }
    }, 250);
    return () => clearTimeout(handle);
  }, [search]);

  const loadMessages = useCallback(async (conversationId, canMessage) => {
    if (!conversationId) return;
    setMessageError("");
    if (!canMessage) { setMessages([]); return; }
    try {
      const response = await api.get(`/api/messages/conversations/${conversationId}/messages`);
      setMessages(response.data?.messages || []);
      await api.post(`/api/messages/conversations/${conversationId}/read`);
      setConversations((current) => current.map((item) => item.id === conversationId ? { ...item, unreadCount: 0 } : item));
    } catch (error) { setMessages([]); setMessageError(error.response?.data?.message || "Messages could not be loaded."); }
  }, []);

  useEffect(() => {
    if (!activeId || !active) return undefined;
    setMenuOpen(false);
    loadMessages(activeId, active.canMessage);
    if (!active.canMessage) return undefined;
    const socket = getRealtimeSocket();
    socket.emit("dm:join", { conversationId: activeId });
    return () => socket.emit("dm:leave", { conversationId: activeId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, active?.canMessage]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ block: "end" }); }, [messages]);

  const mergeConversation = useCallback((incoming) => {
    if (!incoming?.id) return;
    setConversations((current) => {
      const incomingPersonId = String(incoming.with?.id || "");
      const index = current.findIndex((item) => item.id === incoming.id || (incomingPersonId && String(item.with?.id) === incomingPersonId));
      if (index === -1) return [incoming, ...current];
      const next = current.slice();
      next[index] = { ...next[index], ...incoming };
      return dedupeConversations(next);
    });
  }, []);

  // Patch just the affected conversation's preview/order/unread count instead
  // of refetching the whole inbox on every message (spec: no repeated full
  // inbox requests). Falls back to a single refetch only when the message
  // belongs to a conversation not yet present locally (e.g. very first
  // message right after acceptance, before dm:conversation-updated lands).
  const applyIncomingMessage = useCallback((payload) => {
    setConversations((current) => {
      const index = current.findIndex((item) => item.id === payload.conversationId);
      if (index === -1) { loadConversations(); return current; }
      const conversation = current[index];
      const isMine = String(payload.senderId) !== String(conversation.with.id);
      const patched = {
        ...conversation,
        lastMessagePreview: payload.deleted ? "" : (payload.content || (payload.attachments?.[0]?.name || "Sent an attachment")),
        lastMessageAt: payload.createdAt,
        lastMessageMine: isMine,
        unreadCount: !isMine && payload.conversationId !== activeId ? (conversation.unreadCount || 0) + 1 : conversation.unreadCount,
      };
      const next = current.slice();
      next.splice(index, 1);
      next.unshift(patched);
      return next;
    });
  }, [activeId, loadConversations]);

  useRealtimeSocket({
    "dm:message": (payload) => {
      if (payload.conversationId === activeId) {
        setMessages((current) => [...current, payload]);
        if (payload.senderId === active?.with?.id) {
          api.post(`/api/messages/conversations/${activeId}/read`).catch(() => {});
        }
      }
      applyIncomingMessage(payload);
    },
    "dm:message-updated": (payload) => setMessages((current) => current.map((item) => item.id === payload.id ? payload : item)),
    "dm:message-deleted": (payload) => setMessages((current) => current.map((item) => item.id === payload.messageId ? { ...item, deleted: true, content: "" } : item)),
    "dm:typing": (payload) => { if (payload.conversationId === activeId) { setTyping(payload.isTyping); if (payload.isTyping) setTimeout(() => setTyping(false), 3000); } },
    "dm:call-incoming": (payload) => setIncomingCall(payload),
    "dm:call-declined": () => setActiveCall(null),
    "dm:conversation-updated": (payload) => mergeConversation(payload),
    "dm:presence": (payload) => setConversations((current) => current.map((item) => item.with.id === payload.userId ? { ...item, with: { ...item.with, online: payload.online, lastSeenAt: payload.lastSeenAt } } : item)),
    "dm:read": (payload) => setConversations((current) => current.map((item) => item.id === payload.conversationId ? { ...item, unreadCount: 0 } : item)),
    "dm:read-by": (payload) => setReadReceipts((current) => ({ ...current, [payload.conversationId]: payload.readAt })),
  });

  const openConversation = async (userId, startCallAfter = false, note = "") => {
    try {
      const response = await api.post("/api/messages/conversations", { userId, note });
      const conversation = response.data?.conversation;
      mergeConversation(conversation);
      setActiveId(conversation.id);
      setSearch(""); setResults([]); setRequestTarget(null); setRequestNoteDraft("");
      if (startCallAfter && conversation.canMessage) {
        const callResponse = await api.post(`/api/messages/conversations/${conversation.id}/call-token`, { ring: true });
        setActiveCall({ conversationId: conversation.id, url: callResponse.data.url, token: callResponse.data.token, withName: conversation?.with?.name });
      }
    } catch (error) { setConversationError(error.response?.data?.message || "Could not start that conversation."); }
  };

  const sendRequest = async (event) => {
    event.preventDefault();
    if (!requestTarget) return;
    await openConversation(requestTarget.id, false, requestNoteDraft.trim());
  };

  const sendTyping = (isTyping) => {
    getRealtimeSocket().emit("dm:typing", { conversationId: activeId, isTyping });
  };

  const onDraftChange = (value) => {
    setDraft(value);
    sendTyping(true);
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => sendTyping(false), 1200);
  };

  const sendMessage = async (event) => {
    event.preventDefault();
    if (sending || !activeId || !active?.canMessage || (!draft.trim() && !attachment)) return;
    const content = draft.trim();
    const pendingAttachment = attachment;
    setSending(true); setSendError("");
    try {
      const response = await api.post(`/api/messages/conversations/${activeId}/messages`, { content: content || (pendingAttachment?.name || ""), attachments: pendingAttachment ? [pendingAttachment] : [] });
      setMessages((current) => current.some((item) => item.id === response.data.message.id) ? current : [...current, response.data.message]);
      setDraft(""); setAttachment(null);
    } catch (error) { setSendError(error.response?.data?.message || "Message could not be sent. Try again."); }
    finally { setSending(false); }
  };

  const uploadAttachment = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !activeId || !active?.canMessage) return;
    setUploading(true); setSendError("");
    const form = new FormData(); form.append("file", file);
    try { const response = await api.post(`/api/messages/conversations/${activeId}/attachments`, form, { headers: { "Content-Type": "multipart/form-data" } }); setAttachment(response.data?.attachment || null); }
    catch (error) { setSendError(error.response?.data?.message || "Attachment could not be uploaded. Try again."); }
    finally { setUploading(false); }
  };

  const deleteMessage = async (messageId) => {
    try { await api.delete(`/api/messages/conversations/${activeId}/messages/${messageId}`); } catch { /* socket keeps state in sync */ }
  };

  const startCall = async () => {
    if (!active?.canMessage) return;
    try {
      const response = await api.post(`/api/messages/conversations/${activeId}/call-token`, { ring: true });
      setActiveCall({ conversationId: activeId, url: response.data.url, token: response.data.token, withName: active?.with?.name });
    } catch { /* 503 when LiveKit isn't configured - button disables via API error toast elsewhere */ }
  };

  const acceptIncoming = async () => {
    const conversationId = incomingCall.conversationId;
    setIncomingCall(null); setActiveId(conversationId);
    try { const response = await api.post(`/api/messages/conversations/${conversationId}/call-token`); setActiveCall({ conversationId, url: response.data.url, token: response.data.token, withName: incomingCall.from?.name }); }
    catch { /* nothing to join if this fails */ }
  };

  const declineIncoming = async () => {
    if (incomingCall) await api.post(`/api/messages/conversations/${incomingCall.conversationId}/call-decline`).catch(() => {});
    setIncomingCall(null);
  };

  const respondToRequest = async (decision) => {
    if (!activeId || requestBusy) return;
    setRequestBusy(true);
    try {
      const response = await api.post(`/api/messages/conversations/${activeId}/${decision}`);
      mergeConversation(response.data.conversation);
    } catch (error) { setConversationError(error.response?.data?.message || "Could not update this request."); }
    finally { setRequestBusy(false); }
  };

  const blockActiveUser = async () => {
    if (!active?.with?.id || requestBusy) return;
    setRequestBusy(true); setMenuOpen(false);
    try {
      await api.post(`/api/messages/users/${active.with.id}/block`);
      await loadConversations();
    } catch (error) { setConversationError(error.response?.data?.message || "Could not block this member."); }
    finally { setRequestBusy(false); }
  };

  const unblockActiveUser = async () => {
    if (!active?.with?.id || requestBusy) return;
    setRequestBusy(true); setMenuOpen(false);
    try {
      await api.post(`/api/messages/users/${active.with.id}/unblock`);
      await loadConversations();
    } catch (error) { setConversationError(error.response?.data?.message || "Could not unblock this member."); }
    finally { setRequestBusy(false); }
  };

  const requestAgain = async () => { if (active?.with?.id) await openConversation(active.with.id); };

  const composerDisabled = sending || uploading || !active?.canMessage;

  return (
    <div className={active ? "dm-shell dm-shell--chat-open" : "dm-shell"}>
      <aside className="dm-sidebar" aria-label="Conversations">
        <div className="dm-search"><Search size={14} aria-hidden="true" /><input aria-label="Search members to message" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Message a member..." /></div>
        {results.length > 0 && <div className="dm-search-results" role="listbox" aria-label="Member search results">{results.map((user) => <button type="button" role="option" key={user.id} onClick={() => { setRequestTarget(user); setRequestNoteDraft(""); }}><span className="dm-avatar">{initials(user.name)}</span><span className="dm-search-result-meta"><strong>{user.name}</strong>{user.username && <small>@{user.username}</small>}</span>{user.online && <i className="dm-online-dot" aria-label="Online" />}</button>)}</div>}
        {requestTarget && (
          <form className="dm-request-composer" onSubmit={sendRequest} aria-label={`Send a chat request to ${requestTarget.name}`}>
            <div className="dm-request-composer-who"><span className="dm-avatar">{initials(requestTarget.name)}</span><span><strong>{requestTarget.name}</strong>{requestTarget.username && <small>@{requestTarget.username}</small>}</span></div>
            <textarea maxLength={200} rows={2} placeholder="Add a short note (optional) — e.g. why you'd like to connect" value={requestNoteDraft} onChange={(event) => setRequestNoteDraft(event.target.value)} />
            <div className="dm-request-composer-actions">
              <button type="button" onClick={() => { setRequestTarget(null); setRequestNoteDraft(""); }}>Cancel</button>
              <button type="submit" className="dm-accept">Send request</button>
            </div>
          </form>
        )}
        {loading ? <div className="dm-empty" role="status">Loading conversations...</div> : conversationError ? <div className="dm-empty dm-error" role="alert"><span>{conversationError}</span><button type="button" onClick={loadConversations}>Try again</button></div> : conversations.length ? conversations.map((conversation) => (
          <button type="button" key={conversation.id} aria-pressed={conversation.id === activeId} className={conversation.id === activeId ? "dm-conversation active" : "dm-conversation"} onClick={() => setActiveId(conversation.id)}>
            <span className="dm-avatar">{initials(conversation.with.name)}{conversation.with.online && <i className="dm-online-dot" aria-label="Online" />}</span>
            <span className="dm-conversation-meta">
              <strong>{conversation.with.name}</strong>
              <small>
                {conversation.status === "PENDING" ? (conversation.requestedByMe ? "Request sent - waiting for reply" : "Wants to chat with you") :
                 conversation.status === "DECLINED" ? "Request declined" :
                 conversation.blockedByMe ? "Blocked" :
                 `${conversation.lastMessageMine ? "You: " : ""}${conversation.lastMessagePreview || "Say hi Hi"}`}
              </small>
            </span>
            {conversation.unreadCount > 0 && <b className="dm-unread">{conversation.unreadCount}</b>}
            {conversation.status === "PENDING" && !conversation.requestedByMe && <b className="dm-unread dm-request-badge">New</b>}
          </button>
        )) : <div className="dm-empty">No conversations yet - search a member above to start a private chat.</div>}
      </aside>

      <section className="dm-panel" aria-label="Direct messages">
        {!active ? (
          <div className="dm-placeholder">Select a conversation, or search for someone to message privately.</div>
        ) : (
          <>
            <header className="dm-header">
              <button type="button" className="dm-back-btn" onClick={() => setActiveId(null)} aria-label="Back to conversations"><ArrowLeft size={16} /></button>
              <span className="dm-avatar">{initials(active.with.name)}</span>
              <div>
                <strong>{active.with.name}</strong>
                {active.with.username && <span className="dm-username">@{active.with.username}</span>}
                {typing ? <small className="dm-typing">typing...</small> : <small className="dm-presence">{active.with.online ? "Online" : lastSeenLabel(active.with.lastSeenAt)}</small>}
              </div>
              <button type="button" className="dm-call-btn" onClick={startCall} disabled={!active.canMessage} aria-label={`Call ${active.with.name}`}><Phone size={16} /></button>
              <div className="dm-menu-wrap">
                <button type="button" className="dm-call-btn" onClick={() => setMenuOpen((open) => !open)} aria-label="Conversation options" aria-expanded={menuOpen}><MoreVertical size={16} /></button>
                {menuOpen && (
                  <div className="dm-menu" role="menu">
                    {active.blockedByMe ? (
                      <button type="button" role="menuitem" onClick={unblockActiveUser} disabled={requestBusy}>Unblock</button>
                    ) : (
                      <button type="button" role="menuitem" className="dm-menu-danger" onClick={blockActiveUser} disabled={requestBusy}><Ban size={13} /> Block</button>
                    )}
                  </div>
                )}
              </div>
            </header>

            {active.status === "PENDING" && !active.requestedByMe && (
              <div className="dm-request-banner dm-request-banner--incoming" role="alertdialog" aria-label="New message request">
                <span className="dm-avatar dm-avatar-lg">{initials(active.with.name)}</span>
                <div className="dm-request-banner-body">
                  <span><strong>@{active.with.username || active.with.name}</strong> wants to message you</span>
                  {active.requestNote && <p className="dm-request-note">&ldquo;{active.requestNote}&rdquo;</p>}
                  {active.requestedAt && <small className="dm-request-sent-at">{lastSeenLabel(active.requestedAt).replace("Active ", "Sent ")}</small>}
                  <div className="dm-request-banner-actions">
                    <button type="button" className="dm-accept" onClick={() => respondToRequest("accept")} disabled={requestBusy}><Check size={14} /> Accept</button>
                    <button type="button" className="dm-decline" onClick={() => respondToRequest("decline")} disabled={requestBusy}><X size={14} /> Decline</button>
                    <button type="button" className="dm-decline" onClick={blockActiveUser} disabled={requestBusy}><Ban size={14} /> Block</button>
                  </div>
                </div>
              </div>
            )}
            {active.status === "PENDING" && active.requestedByMe && (
              <div className="dm-request-banner dm-request-waiting">
                <span>Chat request sent - you can message once they accept.{active.requestNote && <em className="dm-request-note-echo"> &ldquo;{active.requestNote}&rdquo;</em>}</span>
              </div>
            )}
            {active.status === "DECLINED" && (
              <div className="dm-request-banner dm-request-waiting"><span>This chat request was declined.</span><button type="button" className="dm-accept" onClick={requestAgain} disabled={requestBusy}>Request again</button></div>
            )}
            {active.blockedByMe && (
              <div className="dm-request-banner dm-request-waiting"><span>You blocked this member.</span><button type="button" className="dm-accept" onClick={unblockActiveUser} disabled={requestBusy}>Unblock</button></div>
            )}
            {active.blockedByThem && !active.blockedByMe && (
              <div className="dm-request-banner dm-request-waiting"><span>You can't message this member right now.</span></div>
            )}

            <div className="dm-messages" role="log" aria-live="polite" aria-label={`Messages with ${active.with.name}`}>
              {messageError && <div className="dm-inline-error" role="alert"><span>{messageError}</span><button type="button" onClick={() => loadMessages(activeId, active.canMessage)}>Try again</button></div>}
              {withMessageGrouping(messages).map(({ message, showDaySeparator, grouped }) => (
                <div key={message.id} className="dm-message-row">
                  {showDaySeparator && <div className="dm-day-separator" role="separator"><span>{daySeparatorLabel(message.createdAt)}</span></div>}
                  <div className={[message.deleted ? "dm-bubble deleted" : message.senderId === active.with.id ? "dm-bubble" : "dm-bubble mine", grouped ? "grouped" : ""].join(" ").trim()}>
                    {message.deleted ? <em>Message deleted</em> : (
                      <>
                        {message.content && <p>{message.content}</p>}
                        {message.attachments?.map((item) => item.type === "image" ? <img key={item.url} src={item.url} alt={item.name || "attachment"} /> : <a key={item.url} href={item.url} target="_blank" rel="noreferrer">{item.name || "Attachment"}</a>)}
                        <time className="dm-bubble-time" dateTime={message.createdAt}>
                          {messageTime(message.createdAt)}
                          {message.senderId !== active.with.id && (
                            readReceipts[activeId] && new Date(message.createdAt) <= new Date(readReceipts[activeId])
                              ? <CheckCheck size={12} className="dm-tick dm-tick-read" aria-label="Read" />
                              : <Check size={12} className="dm-tick" aria-label="Sent" />
                          )}
                        </time>
                        {message.senderId !== active.with.id && <button type="button" className="dm-delete" aria-label="Delete message" onClick={() => deleteMessage(message.id)}><Trash2 size={11} /></button>}
                      </>
                    )}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
            {attachment && <div className="dm-attachment-preview">{attachment.name}<button type="button" onClick={() => setAttachment(null)}><X size={12} /></button></div>}
            {sendError && <div className="dm-inline-error dm-send-error" role="alert"><span>{sendError}</span><button type="button" onClick={() => setSendError("")}>Dismiss</button></div>}
            <form className="dm-composer" onSubmit={sendMessage}>
              <button type="button" onClick={() => fileInputRef.current?.click()} aria-label="Attach a file" disabled={composerDisabled}><Paperclip size={16} /></button>
              <input type="file" ref={fileInputRef} hidden onChange={uploadAttachment} disabled={composerDisabled} />
              <input aria-label="Message text" value={draft} onChange={(event) => onDraftChange(event.target.value)} placeholder={!active.canMessage ? "You can't message here yet" : uploading ? "Uploading attachment..." : sending ? "Sending message..." : "Type a private message..."} disabled={composerDisabled} />
              <button type="submit" aria-label={sending ? "Sending message" : "Send"} disabled={composerDisabled || (!draft.trim() && !attachment)}><Send size={16} /></button>
            </form>
          </>
        )}
      </section>

      {incomingCall && (
        <div className="dm-incoming-call" role="alertdialog" aria-label="Incoming call">
          <span className="dm-avatar">{initials(incomingCall.from?.name)}</span>
          <strong>{incomingCall.from?.name} is calling...</strong>
          <div><button type="button" className="dm-accept" onClick={acceptIncoming}><Phone size={14} /> Accept</button><button type="button" className="dm-decline" onClick={declineIncoming}><PhoneOff size={14} /> Decline</button></div>
        </div>
      )}

      {activeCall && <DirectCallModal call={activeCall} withName={activeCall.withName} onClose={() => setActiveCall(null)} />}
    </div>
  );
}

