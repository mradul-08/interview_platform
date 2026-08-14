import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/api";

const currentYear = new Date().getUTCFullYear();

export default function DashboardStreakCard() {
  const navigate = useNavigate();
  const [streak, setStreak] = useState(null);
  const [calendar, setCalendar] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([
      api.get("/api/streak"),
      api.get(`/api/streak/calendar?year=${currentYear}`),
      api.get("/api/streak/achievements"),
    ]).then(([streakResponse, calendarResponse, achievementResponse]) => {
      if (!active) return;
      setStreak(streakResponse.data);
      setCalendar(calendarResponse.data.days || []);
      setAchievements(achievementResponse.data.achievements || []);
    }).catch(() => active && setError("Unable to load streak data."));
    return () => { active = false; };
  }, []);

  const recentDays = useMemo(() => {
    const byDate = new Map(calendar.map((day) => [day.date, day]));
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setUTCDate(date.getUTCDate() - (6 - index));
      const key = date.toISOString().slice(0, 10);
      return { key, day: byDate.get(key) };
    });
  }, [calendar]);

  if (error) return <div style={errorStyle}>{error}</div>;
  if (!streak) return <div style={loadingStyle}>Loading streak…</div>;

  const unlocked = achievements.filter((badge) => badge.unlocked);
  const progress = streak.nextMilestone ? Math.min(100, (streak.currentStreak / streak.nextMilestone) * 100) : 100;

  return (
    <section style={cardStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <div style={eyebrow}>Coding consistency</div>
          <h3 style={titleStyle}>🔥 {streak.currentStreak} Day Streak</h3>
          <p style={{ color: streak.todayCompleted ? "var(--green)" : "var(--amber)", fontSize: 12, margin: "7px 0 0" }}>
            {streak.todayCompleted ? "🔥 Streak secured! Today's coding activity is complete." : "⚠️ Streak at risk — solve at least one problem today."}
          </p>
        </div>
        <button onClick={() => navigate("/dashboard/problems")} style={solveButton}>Solve a problem →</button>
      </div>
      <div style={statsRow}><MiniStat label="Current" value={`${streak.currentStreak}d`} /><MiniStat label="Longest" value={`${streak.longestStreak}d`} /><MiniStat label="Active days" value={streak.activeDays} /><MiniStat label="Accepted" value={streak.totalAcceptedSubmissions} /></div>
      {streak.nextMilestone && <div style={{ marginTop: 16 }}><div style={progressLabels}><span>Next milestone: {streak.nextMilestone} days</span><span>{streak.daysToNextMilestone} to go</span></div><div style={track}><div style={{ ...bar, width: `${progress}%` }} /></div></div>}
      <div style={{ marginTop: 17 }}><div style={label}>Last 7 days</div><div style={weekRow}>{recentDays.map(({ key, day }) => <div key={key} title={`${key}: ${day?.acceptedCount || 0} accepted`} style={dayStyle(day?.isActive)}>{day?.isActive ? "🔥" : "○"}</div>)}</div></div>
      <div style={{ marginTop: 17 }}><div style={label}>Achievements</div><div style={badgeRow}>{achievements.slice(0, 5).map((badge) => <span key={badge.id} style={{ ...badgeStyle, opacity: badge.unlocked ? 1 : .45 }}>{badge.unlocked ? badge.icon : "🔒"} {badge.name}</span>)}{unlocked.length === 0 && <span style={muted}>No badges unlocked yet.</span>}</div></div>
    </section>
  );
}

function MiniStat({ label, value }) { return <div><div style={labelStyle}>{label}</div><div style={valueStyle}>{value}</div></div>; }
const cardStyle = { background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: "20px 22px", position: "relative", overflow: "hidden" };
const eyebrow = { color: "var(--accent-strong)", fontSize: 10, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase" };
const titleStyle = { color: "var(--text-primary)", fontSize: 21, margin: "7px 0 0", letterSpacing: "-.03em" };
const solveButton = { border: "1px solid var(--border-default)", background: "var(--accent-soft)", color: "var(--accent-strong)", borderRadius: 8, padding: "8px 12px", cursor: "pointer", fontSize: 12, fontWeight: 700, alignSelf: "center" };
const statsRow = { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, borderTop: "1px solid var(--border-subtle)", marginTop: 18, paddingTop: 15 };
const labelStyle = { color: "var(--text-tertiary)", fontSize: 10, textTransform: "uppercase", letterSpacing: ".06em" }; const valueStyle = { color: "var(--text-primary)", fontFamily: "var(--font-mono)", fontSize: 17, fontWeight: 800, marginTop: 4 }; const progressLabels = { display: "flex", justifyContent: "space-between", color: "var(--text-tertiary)", fontSize: 10 }; const track = { height: 6, background: "var(--bg-elevated-2)", borderRadius: 99, overflow: "hidden", marginTop: 7 }; const bar = { height: "100%", background: "var(--amber)", borderRadius: 99, transition: "width .3s ease" }; const label = { color: "var(--text-secondary)", fontSize: 11, fontWeight: 700, marginBottom: 8 }; const weekRow = { display: "flex", gap: 7 }; const dayStyle = (active) => ({ width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: active ? "var(--amber)" : "var(--text-tertiary)", background: active ? "var(--amber-soft)" : "var(--bg-elevated-2)", border: `1px solid ${active ? "var(--amber)" : "var(--border-subtle)"}`, fontSize: 12 }); const badgeRow = { display: "flex", gap: 7, flexWrap: "wrap" }; const badgeStyle = { color: "var(--text-secondary)", background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", borderRadius: 7, padding: "6px 8px", fontSize: 10 }; const muted = { color: "var(--text-tertiary)", fontSize: 11 }; const loadingStyle = { ...cardStyle, color: "var(--text-tertiary)", fontSize: 12 }; const errorStyle = { ...cardStyle, color: "var(--red)", fontSize: 12 };
