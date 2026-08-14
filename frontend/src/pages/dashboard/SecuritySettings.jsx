import { useEffect, useMemo, useState } from "react";
import api from "../../api/api";

function decodeJwt(token) {
  try {
    const payload = token?.split(".")[1];
    if (!payload) return null;
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decodeURIComponent(escape(json)));
  } catch {
    return null;
  }
}

function formatDate(value) {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function SessionCard({ session, isCurrent, onRevoke, revoking }) {
  const statusLabel = isCurrent ? "Current device" : "Active device";
  const badgeStyle = isCurrent
    ? { background: "rgba(54,211,153,0.12)", color: "var(--green)" }
    : { background: "rgba(124,108,240,0.12)", color: "var(--accent-strong)" };

  return (
    <div style={{ padding: 16, borderRadius: 16, background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", display: "grid", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>
              {session.userAgent || "Unknown device"}
            </div>
            <span style={{ padding: "4px 8px", borderRadius: 999, fontSize: 11.5, fontWeight: 700, ...badgeStyle }}>
              {statusLabel}
            </span>
          </div>
          <div style={{ fontSize: 12.5, color: "var(--text-tertiary)", marginTop: 6, lineHeight: 1.6 }}>
            <div>IP: {session.ipAddress || "Unknown"}</div>
            <div>Started: {formatDate(session.createdAt)}</div>
            <div>Last seen: {formatDate(session.lastSeenAt)}</div>
          </div>
        </div>
        {!isCurrent && (
          <button
            onClick={() => onRevoke(session.sessionId)}
            disabled={revoking}
            style={{
              padding: "8px 12px",
              borderRadius: 10,
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.2)",
              color: "#fca5a5",
              cursor: revoking ? "not-allowed" : "pointer",
              whiteSpace: "nowrap",
              opacity: revoking ? 0.7 : 1,
            }}
          >
            Revoke
          </button>
        )}
      </div>
    </div>
  );
}

export default function SecuritySettings() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [revokingId, setRevokingId] = useState("");

  const currentSessionId = useMemo(() => decodeJwt(localStorage.getItem("token"))?.sid || "", []);

  const loadSessions = async () => {
    setLoading(true);
    setMessage("");
    try {
      const res = await api.get("/api/auth/sessions");
      setSessions(res.data?.sessions || []);
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to load sessions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const revoke = async (sessionId) => {
    setMessage("");
    setRevokingId(sessionId);
    try {
      await api.post(`/api/auth/sessions/${sessionId}/revoke`);
      await loadSessions();
      setMessage("Session revoked.");
    } catch (error) {
      setMessage(error.response?.data?.message || "Failed to revoke session");
    } finally {
      setRevokingId("");
    }
  };

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div style={{ padding: 18, borderRadius: 18, background: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "var(--text-primary)" }}>Security Settings</h2>
        <p style={{ margin: "8px 0 0", color: "var(--text-tertiary)", fontSize: 13.5 }}>
          Review your active sessions, see which device you are on, and revoke any login you no longer trust.
        </p>
      </div>

      {message && (
        <div style={{ padding: 12, borderRadius: 14, background: "var(--accent-soft)", color: "var(--accent-strong)", border: "1px solid var(--border-default)" }}>
          {message}
        </div>
      )}

      <div style={{ padding: 18, borderRadius: 18, background: "var(--bg-elevated)", border: "1px solid var(--border-default)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>Active Sessions</h3>
            <p style={{ margin: "5px 0 0", color: "var(--text-tertiary)", fontSize: 12.5 }}>The current device is marked so you can spot it instantly.</p>
          </div>
          <button
            onClick={loadSessions}
            style={{
              padding: "8px 12px",
              borderRadius: 10,
              border: "1px solid var(--border-default)",
              background: "var(--bg-elevated-2)",
              color: "var(--text-primary)",
              cursor: "pointer",
            }}
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <p style={{ color: "var(--text-tertiary)" }}>Loading sessions...</p>
        ) : sessions.length === 0 ? (
          <p style={{ color: "var(--text-tertiary)" }}>No active sessions found.</p>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {sessions.map((session) => (
              <SessionCard
                key={session.sessionId}
                session={session}
                isCurrent={session.sessionId === currentSessionId}
                onRevoke={revoke}
                revoking={revokingId === session.sessionId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
