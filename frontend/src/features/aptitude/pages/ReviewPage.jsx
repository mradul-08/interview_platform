import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, RefreshCcw, RotateCcw, Bookmark, Loader2, CalendarClock, ChevronDown, ChevronUp, X } from "lucide-react";
import aptitudeApi from "../lib/api";
import { Card, SectionHeader, EmptyState, PageLoading, ErrorNote, Pill } from "../lib/ui";
import { MISTAKE_LABELS, CATEGORY_META, DIFFICULTY_META, relativeDue } from "../lib/format";
import useRealtimeSocket from "../../../realtime/useRealtimeSocket";

export default function ReviewPage() {
  const navigate = useNavigate();
  const [state, setState] = useState({ loading: true, error: "" });
  const [mistakes, setMistakes] = useState(null);
  const [revision, setRevision] = useState(null);
  const [bookmarks, setBookmarks] = useState([]);
  const [busyAction, setBusyAction] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [mistakeFocusIndex, setMistakeFocusIndex] = useState(0);

  const load = () => {
    setState({ loading: true, error: "" });
    const controller = new AbortController();
    Promise.all([aptitudeApi.mistakes(controller.signal), aptitudeApi.revision(controller.signal), aptitudeApi.bookmarks(controller.signal)])
      .then(([m, r, b]) => { setMistakes(m.data?.data || null); setRevision(r.data?.data || null); setBookmarks(b.data?.bookmarks || []); setState({ loading: false, error: "" }); })
      .catch((e) => { if (e.name !== "CanceledError") setState({ loading: false, error: "Couldn't load your review data." }); });
    return controller;
  };
  useEffect(() => { const controller = load(); return () => controller.abort(); }, []);

  useRealtimeSocket({
    "aptitude:revision-updated": (payload) => {
      if (payload?.revision) setRevision(payload.revision);
    },
    "aptitude:analytics-updated": () => {
      aptitudeApi.mistakes()
        .then((response) => setMistakes(response.data?.data || null))
        .catch(() => {});
    },
  });

  const focusTopics = mistakes?.focusTopics || (mistakes?.focusTopic ? [mistakes.focusTopic] : []);
  const activeFocusTopic = focusTopics.length ? focusTopics[mistakeFocusIndex % focusTopics.length] : null;
  useEffect(() => setMistakeFocusIndex(0), [focusTopics.length]);
  useEffect(() => {
    if (focusTopics.length < 2) return undefined;
    const timer = window.setInterval(() => setMistakeFocusIndex((value) => (value + 1) % focusTopics.length), 8000);
    return () => window.clearInterval(timer);
  }, [focusTopics.length]);

  const removeBookmark = async (questionId) => {
    setBookmarks((prev) => prev.filter((b) => b.questionId?._id !== questionId));
    try { await aptitudeApi.toggleBookmark(questionId); } catch { load(); }
  };
  const runAction = async (key, fn) => { setBusyAction(key); try { const res = await fn(); navigate(`/dashboard/aptitude/session/${res.data.session._id}`); } catch { setBusyAction(""); } };

  if (state.loading) return <PageLoading />;
  if (state.error) return <ErrorNote message={state.error} onRetry={load} />;

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        <Card className="apt-mistake-pattern-card">
          <SectionHeader icon={<AlertTriangle size={16} />} title="Mistake pattern" sub={mistakes?.hasData ? `Live analysis · ${mistakes.totalMistakes} recent wrong answers` : undefined} />
          {!mistakes?.hasData ? <EmptyState icon={<AlertTriangle size={20} />} title="Not enough mistakes to analyze" description={`Answer a few more questions — we need at least ${mistakes?.minRequired || 10} wrong answers to find a pattern.`} /> : <div className="apt-mistake-pattern-content" style={{ display: "grid", gap: 10 }}>{mistakes.breakdown.map((b) => <div className="apt-mistake-row" key={b.type} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}><span style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>{MISTAKE_LABELS[b.type] || b.label}</span><div style={{ display: "flex", alignItems: "center", gap: 8 }}><div className="apt-mistake-track" style={{ width: 80, height: 6, borderRadius: 100, background: "var(--bg-elevated-2)", overflow: "hidden" }}><div style={{ width: `${b.percentage}%`, height: "100%", background: "var(--red)" }} /></div><span style={{ fontSize: 11.5, fontWeight: 700, width: 32, textAlign: "right" }}>{b.percentage}%</span></div></div>)}{activeFocusTopic && <><div className="apt-mistake-focus-meta" style={{ display: "flex", justifyContent: "space-between", color: "var(--text-tertiary)", fontSize: 10.5, marginTop: 2 }}><span>Priority focus · changes automatically</span><span>{(mistakeFocusIndex % focusTopics.length) + 1}/{focusTopics.length}</span></div><button onClick={() => runAction("fix", () => aptitudeApi.fixMistakes(activeFocusTopic.topic))} disabled={!!busyAction} className="cv-button-secondary apt-mistake-focus-button" style={{ marginTop: 2, padding: 9, fontSize: 12 }}>{busyAction === "fix" ? <Loader2 size={14} /> : <RefreshCcw size={14} />} Fix mistakes in {activeFocusTopic.topic}</button></>}</div>}
        </Card>
        <Card style={{ display: "flex", flexDirection: "column" }}><SectionHeader icon={<RotateCcw size={16} />} title="Mistake replay" sub="Re-attempt the questions you got wrong" /><p style={{ fontSize: 12.5, color: "var(--text-tertiary)", lineHeight: 1.6, flex: 1 }}>Pulls your last 10 incorrect answers into a fresh practice session with full explanations — the fastest way to close a specific gap.</p><button onClick={() => runAction("replay", aptitudeApi.startMistakeReplay)} disabled={!!busyAction} className="cv-button-primary" style={{ padding: 10, fontSize: 12.5, marginTop: 12 }}>{busyAction === "replay" ? <Loader2 size={14} /> : <RotateCcw size={14} />} Replay recent mistakes</button></Card>
        <Card><SectionHeader icon={<CalendarClock size={16} />} title="Spaced revision" sub={revision?.hasData ? `${revision.dueCount} due now` : undefined} />{!revision?.hasData ? <EmptyState icon={<CalendarClock size={20} />} title="Nothing scheduled yet" description="Wrong answers get automatically scheduled for revision at increasing intervals." /> : <><div style={{ display: "grid", gap: 6, marginBottom: 12, maxHeight: 180, overflowY: "auto" }}>{[...revision.due, ...revision.upcoming].slice(0, 6).map((item) => <div key={`${item.topic}-${item.dueDate}`} style={{ display: "flex", justifyContent: "space-between", padding: "7px 10px", borderRadius: 8, background: "var(--bg-elevated)" }}><span>{item.topic}</span><span>{relativeDue(item.dueDate)}</span></div>)}</div><button onClick={() => runAction("revision", aptitudeApi.startRevisionPractice)} disabled={!!busyAction || revision.dueCount === 0} className="cv-button-primary">{busyAction === "revision" ? <Loader2 size={14} /> : <RotateCcw size={14} />}{revision.dueCount === 0 ? "Nothing due yet" : "Start revision session"}</button></>}</Card>
      </div>

      <Card>
        <SectionHeader icon={<Bookmark size={16} />} title="Question bag" sub={bookmarks.length ? `${bookmarks.length} saved for deep revision` : undefined} />
        {bookmarks.length === 0 ? <EmptyState icon={<Bookmark size={20} />} title="No saved questions" description="Bookmark questions during practice or a mock test to build your revision bag here." /> : <div style={{ display: "grid", gap: 10 }}>{bookmarks.map((b) => { const q = b.questionId; if (!q) return null; const catMeta = CATEGORY_META[q.category] || {}; const diffMeta = DIFFICULTY_META[q.difficulty] || {}; const isOpen = expandedId === b._id; return <div key={b._id} style={{ border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", background: "var(--bg-elevated)", overflow: "hidden" }}><div role="button" tabIndex={0} onClick={() => setExpandedId(isOpen ? null : b._id)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setExpandedId(isOpen ? null : b._id); }} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "12px 14px", cursor: "pointer" }}><div style={{ flex: 1, minWidth: 0 }}><div style={{ display: "flex", gap: 6, marginBottom: 8 }}><Pill color={catMeta.color} bg={catMeta.bg}>{catMeta.short || q.category}</Pill><Pill color={diffMeta.color} bg={diffMeta.bg}>{q.difficulty}</Pill></div><div style={{ fontSize: 12.5, color: "var(--text-primary)", fontWeight: 600, lineHeight: 1.5, display: isOpen ? "block" : "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{q.question}</div><div style={{ fontSize: 10.5, color: "var(--text-tertiary)", marginTop: 6 }}>{q.topic}</div></div><button onClick={(e) => { e.stopPropagation(); removeBookmark(q._id); }} title="Remove from bag" style={{ border: 0, background: "transparent", color: "var(--text-tertiary)", cursor: "pointer", padding: 4 }}><X size={14} /></button>{isOpen ? <ChevronUp size={16} color="var(--text-tertiary)" /> : <ChevronDown size={16} color="var(--text-tertiary)" />}</div>{isOpen && <div style={{ padding: "0 14px 14px", borderTop: "1px solid var(--border-subtle)" }}><div style={{ display: "grid", gap: 6, margin: "12px 0" }}>{q.options?.map((opt) => <div key={opt.key} style={{ display: "flex", gap: 8, padding: "8px 10px", borderRadius: 8, fontSize: 12, border: `1px solid ${opt.key === q.correctAnswer ? "var(--green)" : "var(--border-subtle)"}`, background: opt.key === q.correctAnswer ? "var(--green-soft)" : "var(--bg-surface)", color: "var(--text-primary)" }}><b>{opt.key}</b><span>{opt.text}</span></div>)}</div>{q.explanation && <div style={{ marginBottom: 8 }}><strong>Explanation</strong><p>{q.explanation}</p></div>}{q.shortTrick && <div style={{ marginBottom: 8 }}><strong>Shortcut</strong><p>{q.shortTrick}</p></div>}{q.conceptNote && <div><strong>Concept</strong><p>{q.conceptNote}</p></div>}</div>}</div>; })}</div>}
      </Card>
    </div>
  );
}
