import { useCallback, useEffect, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import api from "../../api/api";
import useRealtimeSocket from "../../realtime/useRealtimeSocket";

export default function NotificationCenter() {
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const load = useCallback(async () => { try { const response = await api.get("/api/notifications"); setItems(response.data?.notifications || []); setUnread(response.data?.unreadCount || 0); } catch { setItems([]); } }, []);
  useEffect(() => { load(); }, [load]);
  useRealtimeSocket({ "notifications:updated": load, "realtime:ready": load });
  const markAll = async () => { await api.post("/api/notifications/read-all").catch(() => {}); setItems((current) => current.map((item) => ({ ...item, readAt: new Date().toISOString() }))); setUnread(0); };
  return <section className="study-notification-panel"><div className="study-side-heading"><h3><Bell size={15} /> Notifications {unread > 0 && <b className="study-notification-count">{unread}</b>}</h3><button type="button" onClick={markAll} disabled={!unread}><CheckCheck size={13} /> Read all</button></div><div className="study-notification-list">{items.length ? items.slice(0, 8).map((item) => <article className={item.readAt ? "read" : "unread"} key={item._id}><Bell size={13} /><div><strong>{item.title}</strong><p>{item.body}</p><time>{new Date(item.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</time></div></article>) : <small>No notifications yet.</small>}</div></section>;
}
