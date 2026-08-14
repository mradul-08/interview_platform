import { useEffect, useMemo, useState } from "react";
import { BarChart3, CalendarDays, ChevronLeft, ChevronRight, Flame, Target } from "lucide-react";
import aptitudeApi from "../lib/api";
import { Card } from "../lib/ui";
import AptitudeActivityDetails from "./AptitudeActivityDetails";
import useRealtimeSocket from "../../../realtime/useRealtimeSocket";

const WEEKDAY_LABELS = ["Sun", "", "Tue", "", "Thu", "", "Sat"];
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const CURRENT_YEAR = new Date().getUTCFullYear();

function cellColor(day) {
  if (!day) return "transparent";
  if (!day.attempts) return "var(--bg-elevated-2)";
  if (day.attempts >= 6) return "var(--green)";
  if (day.attempts >= 3) return "var(--accent)";
  return "var(--green-soft)";
}

export default function StreakCalendar({ currentStreak = 0, longestStreak = 0 }) {
  const [year, setYear] = useState(CURRENT_YEAR);
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [lastSynced, setLastSynced] = useState(null);
  const { connected } = useRealtimeSocket({ "aptitude:activity-updated": () => { setReloadKey((value) => value + 1); setLastSynced(new Date()); } });

  useEffect(() => {
    const controller = new AbortController();
    aptitudeApi.streakCalendar(366, year, controller.signal)
      .then((response) => { setData(response.data?.data || null); setLastSynced(new Date()); })
      .catch((error) => { if (error.name !== "CanceledError" && error.code !== "ERR_CANCELED") setData({ year, days: [], totalAttempts: 0 }); });
    return () => controller.abort();
  }, [year, reloadKey]);

  const weeks = useMemo(() => {
    if (!data?.days?.length) return [];
    const firstDow = new Date(`${data.days[0].date}T00:00:00Z`).getUTCDay();
    const padded = [...Array(firstDow).fill(null), ...data.days];
    const result = [];
    for (let index = 0; index < padded.length; index += 7) result.push(padded.slice(index, index + 7));
    while (result[result.length - 1]?.length < 7) result[result.length - 1].push(...Array(7 - result[result.length - 1].length).fill(null));
    return result;
  }, [data]);

  const monthLabels = useMemo(() => {
    let lastMonth = null;
    return weeks.map((week) => {
      const firstReal = week.find(Boolean);
      if (!firstReal) return "";
      const month = new Date(`${firstReal.date}T00:00:00Z`).getUTCMonth();
      if (month === lastMonth) return "";
      lastMonth = month;
      return MONTH_LABELS[month];
    });
  }, [weeks]);

  const summary = useMemo(() => (data?.days || []).reduce((result, day) => {
    result.attempts += day.attempts || 0;
    result.correct += day.correct || 0;
    if (day.attempts) result.activeDays += 1;
    if (!result.bestDay || (day.attempts || 0) > result.bestDay.attempts) result.bestDay = day;
    Object.entries(day.categories || {}).forEach(([category, count]) => { result.categories[category] = (result.categories[category] || 0) + count; });
    return result;
  }, { attempts: 0, correct: 0, activeDays: 0, bestDay: null, categories: {} }), [data?.days]);
  const accuracy = summary.attempts ? Math.round((summary.correct / summary.attempts) * 100) : 0;
  const topCategory = Object.entries(summary.categories).sort((a, b) => b[1] - a[1])[0];

  if (!data) return <Card><div style={{ height: 270 }} /></Card>;

  return (
    <Card className="apt-year-calendar">
      <div className="apt-year-calendar-header">
        <div className="apt-calendar-title"><span className="apt-calendar-title-icon"><Flame size={17} /></span><div><strong>{currentStreak ? `${currentStreak}-day streak` : "Start an Aptitude streak"}</strong><small>Daily practice consistency <span className={`apt-live-badge ${connected ? "online" : ""}`}><i /> {connected ? "Live" : "Syncing"}</span></small></div></div>
        <div className="apt-year-calendar-controls">
          <button onClick={() => setYear((value) => value - 1)} aria-label="Previous year"><ChevronLeft size={15} /></button>
          <span>{year}</span>
          <button onClick={() => setYear((value) => Math.min(CURRENT_YEAR, value + 1))} disabled={year >= CURRENT_YEAR} aria-label="Next year"><ChevronRight size={15} /></button>
        </div>
        <small>Best: {longestStreak}d</small>
      </div>

      <div className="apt-year-calendar-summary">
        <div><span className="apt-calendar-stat-icon"><BarChart3 size={15} /></span><strong>{summary.attempts}</strong><span>Questions attempted</span></div>
        <div><span className="apt-calendar-stat-icon accuracy"><Target size={15} /></span><strong>{accuracy}%</strong><span>Year accuracy</span></div>
        <div><span className="apt-calendar-stat-icon days"><CalendarDays size={15} /></span><strong>{summary.activeDays}</strong><span>Active days</span></div>
        <div><span className="apt-calendar-stat-icon focus"><Flame size={15} /></span><strong>{topCategory ? topCategory[0] : "—"}</strong><span>Most practiced</span></div>
      </div>
      <div className="apt-year-calendar-helper"><span><CalendarDays size={14} /> Aptitude activity map</span><small>{lastSynced ? `Updated ${lastSynced.toLocaleTimeString()}` : "Click a day to see your questions, accuracy and difficulty split."}</small></div>

      <div className="apt-year-calendar-scroll">
        <div className="apt-year-calendar-grid">
          <div className="apt-year-calendar-weekdays">{WEEKDAY_LABELS.map((label, index) => <span key={index}>{label}</span>)}</div>
          <div>
            <div className="apt-year-calendar-months">{monthLabels.map((label, index) => <span key={index}>{label}</span>)}</div>
            <div className="apt-year-calendar-weeks">{weeks.map((week, weekIndex) => <div className="apt-year-calendar-week" key={weekIndex}>{week.map((day, dayIndex) => <button key={dayIndex} disabled={!day} onClick={() => day && setSelected({ ...day, showDetails: true })} title={day ? `${day.date}: ${day.attempts} attempts${day.attempts ? `, ${Math.round((day.correct / day.attempts) * 100)}% accuracy` : ""}` : ""} style={{ background: cellColor(day), borderColor: selected?.date === day?.date ? "var(--accent-strong)" : "var(--border-subtle)" }} />)}</div>)}</div>
          </div>
        </div>
      </div>

      <div className="apt-year-calendar-legend"><span><i className="empty" /> No practice</span><span><i className="light" /> 1–2 attempts</span><span><i className="medium" /> 3–5 attempts</span><span><i className="strong" /> 6+ attempts</span></div>

      {selected && <div className="apt-year-calendar-detail"><b>{selected.date}</b><span>{selected.attempts} attempt{selected.attempts === 1 ? "" : "s"}</span>{selected.attempts > 0 && <span>{Math.round((selected.correct / selected.attempts) * 100)}% accuracy</span>}</div>}
      <AptitudeActivityDetails day={selected?.showDetails ? selected : null} onClose={() => setSelected(null)} />
    </Card>
  );
}
