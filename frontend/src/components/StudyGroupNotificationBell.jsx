import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, CheckCheck, MessageCircle, Trophy, UserPlus, Users, Video } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../api/api";
import { connectRealtimeSocket } from "../realtime/socket";
import "./studyGroupNotificationBell.css";
import "./studyGroupNotificationBellFixes.css";

const withGroupName = (item) => {
  if (item.groupName) return item;
  const match = String(item.body || "").match(/(?:joined|requested to join)\s+(.+?)(?:\. The group now|\.$)/i);
  return match ? { ...item, groupName: match[1].trim() } : item;
};

// One icon + accent tag per notification type so the list reads at a glance
// instead of every row looking identical behind a generic bell glyph.
function iconForType(type) {
  if (type === "direct_message") return { Icon: MessageCircle, tag: "MESSAGE" };
  if (type === "study_group_join") return { Icon: UserPlus, tag: "GROUP" };
  if (type === "study_group_message") return { Icon: Users, tag: "GROUP" };
  if (type === "leaderboard") return { Icon: Trophy, tag: "LEADERBOARD" };
  if (String(type || "").startsWith("competitive_test_")) return { Icon: Video, tag: "LIVE TEST" };
  return { Icon: Bell, tag: "" };
}

export default function StudyGroupNotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false); const [items, setItems] = useState([]); const [unread, setUnread] = useState(0);
  const [activeChatGroupId, setActiveChatGroupId] = useState(""); const [error, setError] = useState(""); const [markingAll, setMarkingAll] = useState(false);
  const cleanupTimer = useRef(null);
  const loadSequence = useRef(0);
  const load = useCallback(async () => { const sequence = ++loadSequence.current; setError(""); try { const response = await api.get("/api/notifications"); if (sequence !== loadSequence.current) return; const notifications = (response.data?.notifications || []).map(withGroupName); const effectiveActiveChat = window.__studyGroupActiveChat || activeChatGroupId; const hiddenActiveChat = (item) => !item.readAt && item.type === "study_group_message" && effectiveActiveChat && String(item.groupId) === String(effectiveActiveChat); const unreadNotifications = notifications.filter((item) => !item.readAt && !hiddenActiveChat(item)); const hiddenCount = notifications.filter(hiddenActiveChat).length; setItems(unreadNotifications); setUnread(Math.max(0, (Number(response.data?.unreadCount) || 0) - hiddenCount)); } catch (requestError) { if (sequence !== loadSequence.current) return; setItems([]); setUnread(0); setError(requestError.response?.data?.message || "Notifications could not be loaded."); } }, [activeChatGroupId]);
  useEffect(() => { load(); const socket = connectRealtimeSocket(); socket.on("notifications:updated", load); return () => { socket.off("notifications:updated", load); if (cleanupTimer.current) clearTimeout(cleanupTimer.current); }; }, [load]);
  useEffect(() => { const onChatActivity = (event) => setActiveChatGroupId(event.detail?.active ? String(event.detail.groupId || "") : ""); window.addEventListener("study-group-chat-activity", onChatActivity); return () => window.removeEventListener("study-group-chat-activity", onChatActivity); }, []);
  const scheduleCleanup = () => { if (cleanupTimer.current) clearTimeout(cleanupTimer.current); cleanupTimer.current = setTimeout(() => setItems([]), 5 * 60 * 1000); };
  const markRead = async (item) => {
    if (!item.readAt) { const now = new Date().toISOString(); setItems((current) => current.map((entry) => entry._id === item._id ? { ...entry, readAt: now } : entry)); setUnread((count) => Math.max(0, count - 1)); scheduleCleanup(); await api.post(`/api/notifications/${item._id}/read`).catch(load); }
    if (item.groupId) {
      const type = String(item.type || "");
      const targetTab = type.startsWith("competitive_test_") ? "Live Tests" : type === "study_group_join" ? "Members" : type === "study_group_message" ? "Chat" : "Members";
      navigate(`/dashboard/groups/${item.groupId}?tab=${encodeURIComponent(targetTab)}`);
    } else if (item.type === "direct_message" && item.fromUserId) {
      navigate(`/dashboard/messages?userId=${item.fromUserId}`);
    } else if (item.type === "leaderboard") {
      navigate("/dashboard/leaderboard");
    }
  };
  const markAll = async () => { if (!unread || markingAll) return; setMarkingAll(true); setError(""); const now = new Date().toISOString(); try { await api.post("/api/notifications/read-all"); setItems((current) => current.map((item) => ({ ...item, readAt: now }))); setUnread(0); scheduleCleanup(); } catch (requestError) { setError(requestError.response?.data?.message || "Notifications could not be marked as read."); } finally { setMarkingAll(false); } };
  const togglePanel = () => setOpen((current) => !current);
  return <div className="sg-notification-wrap"><button type="button" className="sg-notification-trigger" onClick={togglePanel} aria-label="Open notifications" aria-expanded={open}><Bell size={18} />{unread > 0 && <span>{unread > 9 ? "9+" : unread}</span>}</button>{open && <section className="sg-notification-panel" role="dialog" aria-label="Notifications"><header className="sg-notification-header"><div className="sg-notification-heading"><span className="sg-notification-kicker">ACTIVITY CENTER</span><strong><Bell size={15} /> Notifications</strong></div><button type="button" onClick={markAll} disabled={!unread || markingAll}><CheckCheck size={13} /> {markingAll ? "Marking..." : "Read all"}</button></header><div className="sg-notification-list">{error ? <div className="sg-notification-error" role="alert"><span>{error}</span><button type="button" onClick={load}>Try again</button></div> : items.length ? items.slice(0, 8).map((item) => { const { Icon, tag } = iconForType(item.type); return <article className={item.readAt ? "" : "unread"} key={item._id} role="button" tabIndex={0} onClick={() => markRead(item)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); markRead(item); } }}><span className={`sg-notification-icon sg-notification-icon--${item.type || "system"}`}><Icon size={14} /></span><div><div className="sg-notification-row"><strong>{item.title}</strong>{!item.readAt && <i>NEW</i>}</div>{(item.groupName || tag) && <span className="sg-notification-group"><small>{item.groupName ? "GROUP" : tag}</small>{item.groupName || ""}</span>}<p>{item.body}</p><time>{new Date(item.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</time></div></article>; }) : <small>No notifications yet.</small>}</div></section>}</div>;
}
