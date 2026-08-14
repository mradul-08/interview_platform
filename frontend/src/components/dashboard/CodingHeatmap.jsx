import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/api";
import useRealtimeSocket from "../../realtime/useRealtimeSocket";

const COLORS = {
  empty: "var(--bg-elevated-2)",
  activity: ["#282449", "#4b3a88", "#7359c7", "#a78bfa"],
  Easy: "#55c7a1",
  Medium: "#f0b45b",
  Hard: "#ef7890",
};

const pad = (value) => String(value).padStart(2, "0");
const keyFor = (date) => `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
const formatDate = (value) => new Intl.DateTimeFormat(undefined, { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));

function buildCalendar(year) {
  const first = new Date(Date.UTC(year, 0, 1));
  const start = new Date(first);
  start.setUTCDate(first.getUTCDate() - first.getUTCDay());
  return Array.from({ length: 53 }, (_, week) => Array.from({ length: 7 }, (_, day) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + week * 7 + day);
    return { date: keyFor(date), month: date.getUTCMonth(), inYear: date.getUTCFullYear() === year };
  }));
}

function intensity(value) {
  if (!value) return 0;
  if (value === 1) return 1;
  if (value <= 3) return 2;
  if (value <= 5) return 3;
  return 4;
}

function Stat({ label, value, accent }) {
  return (
    <div style={{ flex: "1 1 130px", minWidth: 120, padding: "13px 14px", borderRadius: 12, background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" }}>
      <div style={{ color: "var(--text-tertiary)", fontSize: 10, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase" }}>{label}</div>
      <div style={{ color: accent || "var(--text-primary)", fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 850, marginTop: 7 }}>{value}</div>
    </div>
  );
}

export default function CodingHeatmap() {
  const navigate = useNavigate();
  const currentYear = new Date().getUTCFullYear();
  const [year, setYear] = useState(currentYear);
  const [mode, setMode] = useState("Activity");
  const [difficulty, setDifficulty] = useState("Hard");
  const [topic, setTopic] = useState("All topics");
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useRealtimeSocket({
    "realtime:ready": () => setReloadKey((value) => value + 1),
    "coding:analytics-updated": () => setReloadKey((value) => value + 1),
  });

  useEffect(() => {
    let active = true;
    api.get(`/api/dashboard/coding-activity?year=${year}`)
      .then((response) => active && setPayload(response.data))
      .catch(() => active && setError("Unable to load coding activity."))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [year, currentYear, reloadKey]);

  const changeYear = (nextYear) => {
    setYear(nextYear);
    setPayload(null);
    setLoading(true);
    setError("");
    setSelected(null);
  };

  const retry = () => {
    setPayload(null);
    setLoading(true);
    setError("");
    setReloadKey((value) => value + 1);
  };

  const days = useMemo(() => new Map((payload?.days || []).map((day) => [day.date, day])), [payload]);
  const calendar = useMemo(() => buildCalendar(year), [year]);
  const topics = useMemo(() => {
    const values = new Set();
    (payload?.days || []).forEach((day) => Object.keys(day.topics || {}).forEach((item) => values.add(item)));
    return ["All topics", ...Array.from(values).sort()];
  }, [payload]);

  const valueFor = (day) => {
    if (!day) return 0;
    if (mode === "Difficulty") return day.difficulty?.[difficulty] || 0;
    if (mode === "Topics") return topic === "All topics" ? day.solved : day.topics?.[topic] || 0;
    return day.submissions || 0;
  };

  const monthLabels = calendar.map((week, index) => {
    const month = week.find((cell) => cell.inYear && cell.date.endsWith("-01"));
    return month ? { index, label: new Intl.DateTimeFormat(undefined, { month: "short", timeZone: "UTC" }).format(new Date(`${month.date}T00:00:00Z`)) } : null;
  });
  const stats = payload?.stats || {};

  return (
    <section style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: "20px 22px", overflow: "hidden", position: "relative" }}>
      <div style={{ position: "absolute", inset: "0 0 auto", height: 2, background: "linear-gradient(90deg, var(--accent), #55c7a1, transparent)" }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 18 }}>
        <div>
          <div style={{ color: "var(--accent-strong)", fontSize: 10, fontWeight: 800, letterSpacing: ".12em", textTransform: "uppercase", marginBottom: 6 }}>Developer performance intelligence</div>
          <h3 style={{ color: "var(--text-primary)", fontSize: 17, margin: 0, letterSpacing: "-.02em" }}>Coding Heatmap</h3>
          <p style={{ color: "var(--text-tertiary)", fontSize: 12, margin: "5px 0 0" }}>{stats.codingDays || 0} active days · {stats.problemsSolved || 0} problems solved in {year}</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button aria-label="Previous year" onClick={() => changeYear(year - 1)} style={navButton}>‹</button>
          <span style={{ minWidth: 48, textAlign: "center", color: "var(--text-primary)", fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: 13 }}>{year}</span>
          <button aria-label="Next year" disabled={year >= currentYear} onClick={() => changeYear(Math.min(currentYear, year + 1))} style={{ ...navButton, opacity: year >= currentYear ? .35 : 1 }}>›</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 18 }}>
        {["Activity", "Difficulty", "Topics"].map((item) => (
          <button key={item} onClick={() => setMode(item)} style={{ ...filterButton, ...(mode === item ? activeFilter : {}) }}>{item}</button>
        ))}
        {mode === "Difficulty" && ["Easy", "Medium", "Hard"].map((item) => <button key={item} onClick={() => setDifficulty(item)} style={{ ...filterButton, color: difficulty === item ? COLORS[item] : "var(--text-tertiary)" }}>{item}</button>)}
        {mode === "Topics" && <select value={topic} onChange={(event) => setTopic(event.target.value)} style={selectStyle}>{topics.map((item) => <option key={item}>{item}</option>)}</select>}
      </div>

      <div style={{ overflowX: "auto", paddingBottom: 5 }}>
        <div style={{ minWidth: 690, position: "relative", paddingTop: 22 }}>
          <div style={{ position: "absolute", left: 30, top: 0, right: 0, height: 18, display: "grid", gridTemplateColumns: "repeat(53, 1fr)", gap: 4, color: "var(--text-tertiary)", fontSize: 10 }}>{monthLabels.map((item, index) => <span key={index} style={{ gridColumn: item ? item.index + 1 : "auto" }}>{item?.label}</span>)}</div>
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ width: 22, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "1px 0", color: "var(--text-tertiary)", fontSize: 9, height: 134 }}><span>Mon</span><span>Wed</span><span>Fri</span></div>
            <div style={{ display: "flex", gap: 4 }}>
              {calendar.map((week, weekIndex) => <div key={weekIndex} style={{ display: "flex", flexDirection: "column", gap: 4 }}>{week.map((cell) => {
                const day = days.get(cell.date);
                const value = valueFor(day);
                const level = intensity(value);
                const background = mode === "Difficulty" && value ? COLORS[difficulty] : level ? COLORS.activity[level - 1] : COLORS.empty;
                return <button key={cell.date} aria-label={`${cell.date}: ${value} activities`} disabled={!cell.inYear} onClick={() => cell.inYear && setSelected(day || { date: cell.date, submissions: 0, accepted: 0, solved: 0, difficulty: {}, problems: [] })} title={cell.inYear ? `${formatDate(cell.date)} · ${value} ${mode.toLowerCase()}` : ""} style={{ width: 10, height: 10, padding: 0, border: cell.inYear && day ? "1px solid rgba(255,255,255,.06)" : "none", borderRadius: 3, background: cell.inYear ? background : "transparent", cursor: cell.inYear ? "pointer" : "default", transition: "transform .15s, filter .15s" }} />;
              })}</div>)}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 15 }}>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}><Stat label="Current streak" value={`${stats.currentStreak || 0}d`} accent="var(--amber)" /><Stat label="Longest streak" value={`${stats.longestStreak || 0}d`} /><Stat label="Hard solved" value={stats.hardProblems || 0} accent="var(--red)" /><Stat label="Submissions" value={stats.totalSubmissions || 0} /></div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--text-tertiary)", fontSize: 10 }}><span>Less</span>{COLORS.activity.map((color) => <span key={color} style={{ width: 10, height: 10, background: color, borderRadius: 3 }} />)}<span>More</span></div>
      </div>

      {loading && <p style={messageStyle}>Loading your coding activity…</p>}
      {error && <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 12, color: "var(--red)", fontSize: 12 }}><span>{error}</span><button onClick={retry} style={retryButton}>Retry</button></div>}
      {!loading && !error && !payload?.isReady && <div style={{ marginTop: 15, padding: "12px 14px", borderRadius: 10, background: "var(--bg-elevated)", color: "var(--text-tertiary)", fontSize: 12 }}>No coding activity yet. <button onClick={() => navigate("/dashboard/problems")} style={linkButton}>Start solving →</button></div>}

      {selected && <div role="dialog" aria-label="Daily coding activity" onClick={() => setSelected(null)} style={overlayStyle}><div onClick={(event) => event.stopPropagation()} style={drawerStyle}>
        <button onClick={() => setSelected(null)} aria-label="Close" style={{ ...navButton, float: "right" }}>×</button>
        <div style={{ color: "var(--accent-strong)", fontSize: 10, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase" }}>Daily coding activity</div>
        <h3 style={{ color: "var(--text-primary)", margin: "8px 0 18px", fontSize: 20 }}>{formatDate(selected.date)}</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 20 }}><Stat label="Problems solved" value={selected.solved || 0} /><Stat label="Submissions" value={selected.submissions || 0} /><Stat label="Accepted" value={selected.accepted || 0} /></div>
        <div style={{ color: "var(--text-secondary)", fontSize: 12, marginBottom: 10 }}>Difficulty breakdown</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>{["Easy", "Medium", "Hard"].map((item) => <span key={item} style={{ color: COLORS[item], background: "var(--bg-elevated)", borderRadius: 7, padding: "6px 9px", fontSize: 11 }}>{item} {selected.difficulty?.[item] || 0}</span>)}</div>
        <div style={{ color: "var(--text-secondary)", fontSize: 12, marginBottom: 8 }}>Problems solved</div>
        {(selected.problems || []).length ? selected.problems.map((problem) => <button key={problem.slug} onClick={() => navigate(`/dashboard/problems/${problem.slug}`)} style={problemButton}><span style={{ color: "var(--green)" }}>✓</span><span style={{ flex: 1, textAlign: "left" }}>{problem.title}</span><span style={{ color: COLORS[problem.difficulty] || "var(--text-tertiary)", fontSize: 10 }}>{problem.difficulty}</span></button>) : <p style={messageStyle}>No accepted problems recorded on this day.</p>}
      </div></div>}
    </section>
  );
}

const navButton = { border: "1px solid var(--border-default)", background: "var(--bg-elevated)", color: "var(--text-primary)", borderRadius: 7, width: 28, height: 28, cursor: "pointer", fontSize: 18, lineHeight: 1 };
const filterButton = { border: "1px solid var(--border-subtle)", background: "var(--bg-elevated)", color: "var(--text-tertiary)", borderRadius: 7, padding: "6px 10px", cursor: "pointer", fontSize: 11, fontWeight: 700 };
const activeFilter = { background: "var(--accent-soft)", color: "var(--accent-strong)", borderColor: "var(--accent)" };
const selectStyle = { ...filterButton, outline: "none" };
const messageStyle = { color: "var(--text-tertiary)", fontSize: 12, margin: "14px 0 0" };
const retryButton = { border: "none", background: "var(--red-soft)", color: "var(--red)", borderRadius: 6, padding: "5px 8px", cursor: "pointer", fontSize: 11 };
const linkButton = { border: "none", background: "none", padding: 0, color: "var(--accent-strong)", cursor: "pointer", fontWeight: 700 };
const overlayStyle = { position: "fixed", inset: 0, zIndex: 20, background: "rgba(3,5,12,.68)", display: "flex", justifyContent: "flex-end" };
const drawerStyle = { width: "min(420px, 100%)", height: "100%", overflowY: "auto", background: "var(--bg-surface)", borderLeft: "1px solid var(--border-default)", padding: "28px 24px", boxShadow: "-20px 0 60px rgba(0,0,0,.25)" };
const problemButton = { width: "100%", display: "flex", gap: 8, alignItems: "center", border: "1px solid var(--border-subtle)", background: "var(--bg-elevated)", color: "var(--text-primary)", borderRadius: 8, padding: "10px", marginBottom: 7, cursor: "pointer", fontSize: 12 };
