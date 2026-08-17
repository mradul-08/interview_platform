import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Paperclip, Phone, PhoneOff, Search, Send, Trash2, X } from "lucide-react";
import api from "../../api/api";
import useRealtimeSocket from "../../realtime/useRealtimeSocket";
import { getRealtimeSocket } from "../../realtime/socket";
import DirectCallModal from "./DirectCallModal";
import "../../styles/messages.css";

const initials = (name) => (name || "M").split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();

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
  const [results, setResults] = useState([]);
  const [typing, setTyping] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  const [activeCall, setActiveCall] = useState(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const bottomRef = useRef(null);

  const active = useMemo(() => conversations.find((item) => item.id === activeId) || null, [conversations, activeId]);

  const loadConversations = useCallback(async () => {
    setConversationError("");
    try {
      const response = await api.get("/api/messages/conversations");
      setConversations(response.data?.conversations || []);
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

  const loadMessages = useCallback(async (conversationId) => {
    if (!conversationId) return;
    setMessageError("");
    try {
      const response = await api.get(`/api/messages/conversations/${conversationId}/messages`);
      setMessages(response.data?.messages || []);
      await api.post(`/api/messages/conversations/${conversationId}/read`);
      setConversations((current) => current.map((item) => item.id === conversationId ? { ...item, unreadCount: 0 } : item));
    } catch (error) { setMessages([]); setMessageError(error.response?.data?.message || "Messages could not be loaded."); }
  }, []);

  useEffect(() => {
    if (!activeId) return undefined;
    loadMessages(activeId);
    const socket = getRealtimeSocket();
    socket.emit("dm:join", { conversationId: activeId });
    return () => socket.emit("dm:leave", { conversationId: activeId });
  }, [activeId, loadMessages]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ block: "end" }); }, [messages]);

  useRealtimeSocket({
    "dm:message": (payload) => {
      if (payload.conversationId === activeId) setMessages((current) => [...current, payload]);
      loadConversations();
    },
    "dm:message-updated": (payload) => setMessages((current) => current.map((item) => item.id === payload.id ? payload : item)),
    "dm:message-deleted": (payload) => setMessages((current) => current.map((item) => item.id === payload.messageId ? { ...item, deleted: true, content: "" } : item)),
    "dm:typing": (payload) => { if (payload.conversationId === activeId) { setTyping(payload.isTyping); if (payload.isTyping) setTimeout(() => setTyping(false), 3000); } },
    "dm:call-incoming": (payload) => setIncomingCall(payload),
    "dm:call-declined": () => setActiveCall(null),
  });

  const openConversation = async (userId, startCallAfter = false) => {
    try {
      const response = await api.post("/api/messages/conversations", { userId });
      const conversation = response.data?.conversation;
      setConversations((current) => current.some((item) => item.id === conversation.id) ? current : [conversation, ...current]);
      setActiveId(conversation.id);
      setSearch(""); setResults([]);
      if (startCallAfter) {
        const callResponse = await api.post(`/api/messages/conversations/${conversation.id}/call-token`, { ring: true });
        setActiveCall({ conversationId: conversation.id, url: callResponse.data.url, token: callResponse.data.token, withName: conversation?.with?.name });
      }
    } catch { /* toast not critical for this flow */ }
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
    if (sending || !activeId || (!draft.trim() && !attachment)) return;
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
    if (!file || !activeId) return;
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
    try {
      const response = await api.post(`/api/messages/conversations/${activeId}/call-token`, { ring: true });
      setActiveCall({ conversationId: activeId, url: response.data.url, token: response.data.token, withName: active?.with?.name });
    } catch { /* 503 when LiveKit isn't configured — button disables via API error toast elsewhere */ }
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

  return (
    <div className="dm-shell">
      <aside className="dm-sidebar" aria-label="Conversations">
        <div className="dm-search"><Search size={14} aria-hidden="true" /><input aria-label="Search members to message" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Message a member…" /></div>
        {results.length > 0 && <div className="dm-search-results" role="listbox" aria-label="Member search results">{results.map((user) => <button type="button" role="option" key={user.id} onClick={() => openConversation(user.id)}><span className="dm-avatar">{initials(user.name)}</span><span>{user.name}</span></button>)}</div>}
        {loading ? <div className="dm-empty" role="status">Loading conversations…</div> : conversationError ? <div className="dm-empty dm-error" role="alert"><span>{conversationError}</span><button type="button" onClick={loadConversations}>Try again</button></div> : conversations.length ? conversations.map((conversation) => (
          <button type="button" key={conversation.id} aria-pressed={conversation.id === activeId} className={conversation.id === activeId ? "dm-conversation active" : "dm-conversation"} onClick={() => setActiveId(conversation.id)}>
            <span className="dm-avatar">{initials(conversation.with.name)}</span>
            <span className="dm-conversation-meta">
              <strong>{conversation.with.name}</strong>
              <small>{conversation.lastMessageMine ? "You: " : ""}{conversation.lastMessagePreview || "Say hi 👋"}</small>
            </span>
            {conversation.unreadCount > 0 && <b className="dm-unread">{conversation.unreadCount}</b>}
          </button>
        )) : <div className="dm-empty">No conversations yet — search a member above to start a private chat.</div>}
      </aside>

      <section className="dm-panel" aria-label="Direct messages">
        {!active ? (
          <div className="dm-placeholder">Select a conversation, or search for someone to message privately.</div>
        ) : (
          <>
            <header className="dm-header">
              <span className="dm-avatar">{initials(active.with.name)}</span>
              <div><strong>{active.with.name}</strong>{typing && <small className="dm-typing">typing…</small>}</div>
              <button type="button" className="dm-call-btn" onClick={startCall} aria-label={`Call ${active.with.name}`}><Phone size={16} /></button>
            </header>
            <div className="dm-messages" role="log" aria-live="polite" aria-label={`Messages with ${active.with.name}`}>
              {messageError && <div className="dm-inline-error" role="alert"><span>{messageError}</span><button type="button" onClick={() => loadMessages(activeId)}>Try again</button></div>}
              {messages.map((message) => (
                <div key={message.id} className={message.deleted ? "dm-bubble deleted" : message.senderId === active.with.id ? "dm-bubble" : "dm-bubble mine"}>
                  {message.deleted ? <em>Message deleted</em> : (
                    <>
                      {message.content && <p>{message.content}</p>}
                      {message.attachments?.map((item) => item.type === "image" ? <img key={item.url} src={item.url} alt={item.name || "attachment"} /> : <a key={item.url} href={item.url} target="_blank" rel="noreferrer">{item.name || "Attachment"}</a>)}
                      {message.senderId !== active.with.id && <button type="button" className="dm-delete" aria-label="Delete message" onClick={() => deleteMessage(message.id)}><Trash2 size={11} /></button>}
                    </>
                  )}
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
            {attachment && <div className="dm-attachment-preview">{attachment.name}<button type="button" onClick={() => setAttachment(null)}><X size={12} /></button></div>}
            {sendError && <div className="dm-inline-error dm-send-error" role="alert"><span>{sendError}</span><button type="button" onClick={() => setSendError("")}>Dismiss</button></div>}
            <form className="dm-composer" onSubmit={sendMessage}>
              <button type="button" onClick={() => fileInputRef.current?.click()} aria-label="Attach a file" disabled={sending || uploading}><Paperclip size={16} /></button>
              <input type="file" ref={fileInputRef} hidden onChange={uploadAttachment} disabled={sending || uploading} />
              <input aria-label="Message text" value={draft} onChange={(event) => onDraftChange(event.target.value)} placeholder={uploading ? "Uploading attachment…" : sending ? "Sending message…" : "Type a private message…"} disabled={sending || uploading} />
              <button type="submit" aria-label={sending ? "Sending message" : "Send"} disabled={sending || uploading || (!draft.trim() && !attachment)}><Send size={16} /></button>
            </form>
          </>
        )}
      </section>

      {incomingCall && (
        <div className="dm-incoming-call" role="alertdialog" aria-label="Incoming call">
          <span className="dm-avatar">{initials(incomingCall.from?.name)}</span>
          <strong>{incomingCall.from?.name} is calling…</strong>
          <div><button type="button" className="dm-accept" onClick={acceptIncoming}><Phone size={14} /> Accept</button><button type="button" className="dm-decline" onClick={declineIncoming}><PhoneOff size={14} /> Decline</button></div>
        </div>
      )}

      {activeCall && <DirectCallModal call={activeCall} withName={activeCall.withName} onClose={() => setActiveCall(null)} />}
    </div>
  );
}
