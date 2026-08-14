import { useEffect, useState } from "react";
import { Flame } from "lucide-react";
import aptitudeApi from "../lib/api";
import useRealtimeSocket from "../../../realtime/useRealtimeSocket";

export default function AptitudeStreakBadge() {
  const [dashboard, setDashboard] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    aptitudeApi.dashboard(controller.signal)
      .then((response) => setDashboard(response.data?.data || null))
      .catch(() => {});
    return () => controller.abort();
  }, [reloadKey]);

  useRealtimeSocket({
    "realtime:ready": () => setReloadKey((value) => value + 1),
    "aptitude:analytics-updated": () => setReloadKey((value) => value + 1),
    "gamification:updated": () => setReloadKey((value) => value + 1),
  });

  const streak = dashboard?.currentStreak || 0;
  const longest = dashboard?.longestStreak || 0;
  const xp = dashboard?.aptitudeXp || 0;
  const level = levelFor(xp);
  const mission = dashboard?.dailyMission?.completed || {};
  const missionDone = Object.values(mission).filter(Boolean).length;
  return (
    <div style={{ position: "relative", width: "fit-content" }}>
      <button type="button" title="Open Aptitude streak details" onClick={() => setOpen((value) => !value)} style={badgeStyle}>
      <Flame size={14} fill="currentColor" />
      <span>{streak} day{streak === 1 ? "" : "s"} streak</span>
      </button>
      {open && <div style={detailsStyle}>
        <strong>Aptitude progress</strong>
        <span>Current streak: <b>{streak} days</b></span>
        <span>Best streak: <b>{longest} days</b></span>
        <span>XP: <b>{xp}</b> · Level {level}</span>
        {Object.keys(mission).length > 0 && <span>Mission: <b>{missionDone}/{Object.keys(mission).length}</b></span>}
      </div>}
    </div>
  );
}

function levelFor(xp) { const thresholds = [0, 100, 250, 500, 1000, 2000, 4000]; let level = 1; thresholds.forEach((threshold, index) => { if (xp >= threshold) level = index + 1; }); return level; }
const badgeStyle = { display: "inline-flex", alignItems: "center", gap: 7, width: "fit-content", padding: "7px 11px", borderRadius: 9, background: "var(--amber-soft)", border: "1px solid var(--border-subtle)", color: "var(--amber)", fontSize: 12, fontWeight: 800, fontFamily: "var(--font-mono)", cursor: "pointer" };
const detailsStyle = { position: "absolute", top: "calc(100% + 8px)", left: 0, zIndex: 20, display: "grid", gap: 7, minWidth: 220, padding: 13, borderRadius: 10, background: "var(--bg-surface)", border: "1px solid var(--border-default)", boxShadow: "var(--shadow-lg)", color: "var(--text-secondary)", fontSize: 11.5 };
