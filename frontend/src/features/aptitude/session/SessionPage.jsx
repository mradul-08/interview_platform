import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Bookmark, Check, Flag, Loader2, SkipForward, Star, Timer } from "lucide-react";
import aptitudeApi from "../lib/api";
import { ErrorNote, PageLoading } from "../lib/ui";
import { CATEGORY_META, DIFFICULTY_META } from "../lib/format";

function formatClock(seconds) {
  if (seconds == null) return "--:--";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function SessionPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());
  const [visited, setVisited] = useState(() => new Set([0]));
  const [marked, setMarked] = useState(() => new Set());
  const [bookmarked, setBookmarked] = useState(() => new Set());
  const finishedRef = useRef(false);

  useEffect(() => {
    const c = new AbortController();
    aptitudeApi.getSession(sessionId, c.signal).then((r) => {
      const s = r.data.session;
      const questionDetails = s.questionDetails || s.questions.map((q) => q.questionData ? { ...q.questionData, _id: q.questionId } : q.questionSnapshot ? { ...q.questionSnapshot, _id: q.questionId } : null).filter(Boolean);
      if (!s || !Array.isArray(s.questions) || !questionDetails.length) throw new Error("This session has no available questions.");
      setError("");
      setSession({ ...s, questionDetails });
      const startIndex = s.currentQuestionIndex || 0;
      setIndex(startIndex);
      setVisited(new Set([startIndex]));
      setMarked(new Set(s.questions.filter((q) => q.status === "MARKED_FOR_REVIEW").map((q) => q.order)));
    }).catch((e) => setError(e.response?.data?.message || "Unable to load session.")).finally(() => setLoading(false));
    return () => c.abort();
  }, [sessionId]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const question = session?.questionDetails?.[index];
  const totalSeconds = session?.config?.timeLimitSeconds || null;
  const remaining = session?.expiresAt ? Math.max(0, Math.floor((new Date(session.expiresAt).getTime() - now) / 1000)) : null;
  const expired = remaining === 0 && remaining !== null;
  const danger = remaining !== null && (remaining <= 60 || (totalSeconds && remaining / totalSeconds <= 0.15));
  useEffect(() => {
    if (expired && session?.status === "ACTIVE" && !finishedRef.current) finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expired]);

  const goTo = (order) => { setIndex(order); setAnswer(null); setVisited((v) => new Set(v).add(order)); };
  const submit = async (selectedAnswer = answer, { skip = false } = {}) => {
    if (!question || busy || expired) return;
    setBusy(true); setError("");
    const currentOrder = index;
    const nextOrder = currentOrder + 1;
    const isLast = nextOrder >= session.questionDetails.length;
    const status = skip || !selectedAnswer ? "SKIPPED" : "ANSWERED";
    setSession((s) => ({ ...s, questions: s.questions.map((q) => (q.order === currentOrder ? { ...q, status } : q)) }));
    if (!isLast) {
      goTo(nextOrder);
      setBusy(false);
    }
    try {
      await aptitudeApi.submitAttempt({ questionId: question._id, selectedAnswer: skip ? null : selectedAnswer || null, sessionId: session._id, submissionId: crypto.randomUUID?.() });
      if (isLast) finish(false);
    } catch (e) { setError(e.response?.data?.message || "Unable to save answer."); }
    finally { if (isLast) setBusy(false); }
  };

  const toggleMark = async () => {
    setMarked((m) => { const next = new Set(m); next.has(index) ? next.delete(index) : next.add(index); return next; });
    try { await aptitudeApi.markForReview({ sessionId: session._id, questionId: question._id }); } catch { /* local state remains usable */ }
  };

  const toggleBookmark = async () => {
    if (!question) return;
    const willBookmark = !bookmarked.has(question._id);
    setBookmarked((b) => { const next = new Set(b); willBookmark ? next.add(question._id) : next.delete(question._id); return next; });
    try { await aptitudeApi.toggleBookmark(question._id); } catch {
      setBookmarked((b) => { const next = new Set(b); willBookmark ? next.delete(question._id) : next.add(question._id); return next; });
    }
  };

  const finish = async () => {
    if (finishedRef.current) return;
    finishedRef.current = true; setFinishing(true);
    try { await aptitudeApi.submitSession(session._id); navigate(`/dashboard/aptitude/results/${session._id}`); }
    catch (e) { finishedRef.current = false; setFinishing(false); setError(e.response?.data?.message || "Unable to finish session."); }
  };

  if (loading) return <PageLoading />;
  if (!session || !question) return <ErrorNote message={error || "This session has no questions."} onRetry={() => navigate("/dashboard/aptitude")} />;

  const catMeta = CATEGORY_META[question.category] || { color: "var(--accent)", bg: "var(--accent-soft)" };
  const diffMeta = DIFFICULTY_META[question.difficulty] || { color: "var(--text-secondary)", bg: "var(--bg-elevated)" };
  const markedCount = marked.size;
  const answeredCount = session.questions.filter((q) => q.status === "ANSWERED").length;
  const bubbleClass = (q) => { const parts = []; if (q.order === index) parts.push("current"); if (marked.has(q.order)) parts.push("marked"); if (q.status === "ANSWERED") parts.push("solved"); else if (q.status === "SKIPPED") parts.push("skipped"); else if (visited.has(q.order) && q.order !== index) parts.push("unsolved"); return parts.join(" "); };
  const jumpToNextMarked = () => { const orders = [...marked].sort((a, b) => a - b); const target = orders.find((o) => o > index) ?? orders[0]; if (target !== undefined) goTo(target); };

  return <div className="apt-session-shell">
    <div className="apt-session-header"><button className="apt-icon-btn" onClick={() => navigate("/dashboard/aptitude")} title="Exit session"><ArrowLeft size={16} /></button><div><strong>{session.mode.replace(/_/g, " ")}</strong><span>{question.category} · {question.topic}</span></div><div className="apt-session-progress"><span>Question {index + 1} / {session.questionDetails.length}</span><div>{session.questionDetails.map((_, i) => <i key={i} className={i < index ? "done" : i === index ? "current" : ""} />)}</div></div><span className={`apt-timer ${danger ? "danger" : ""}`}><Timer size={14} /> {remaining === null ? "Practice" : formatClock(remaining)}</span></div>
    <div className="apt-session-body"><div className="apt-question-panel"><div className="apt-question-meta"><span className="apt-difficulty" style={{ color: diffMeta.color, background: diffMeta.bg }}>{question.difficulty}</span><span style={{ color: catMeta.color }}>{catMeta.short || question.category}</span><button className={`apt-inline-btn ${marked.has(index) ? "active" : ""}`} onClick={toggleMark} title="Mark for review"><Flag size={12} /> {marked.has(index) ? "Marked" : "Mark for review"}</button><button className={`apt-inline-btn ${bookmarked.has(question._id) ? "active" : ""}`} onClick={toggleBookmark} title="Save to question bag">{bookmarked.has(question._id) ? <Star size={12} fill="currentColor" /> : <Bookmark size={12} />} Save</button></div><h1>{question.question}</h1><div className="apt-options">{question.options.map((option) => <button key={option.key} className={answer === option.key ? "selected" : ""} disabled={busy || expired} onClick={() => setAnswer(option.key)}><span>{option.key}</span><strong>{option.text}</strong></button>)}</div>{error && <p style={{ color: "var(--red)", marginTop: 14, fontSize: 12.5 }}>{error}</p>}<div className="apt-question-actions"><button className="apt-btn ghost" disabled={busy || expired} onClick={() => submit(null, { skip: true })}><SkipForward size={14} /> Skip</button><button className="apt-btn primary" disabled={busy || expired || !answer} onClick={() => submit()}>{busy ? <Loader2 size={14} className="apt-spin" /> : <Check size={14} />} Save &amp; next</button></div></div>
      <div className="apt-question-sidebar"><div className="apt-side-card"><div className="apt-side-heading"><strong>Question navigator</strong><small>{answeredCount} / {session.questionDetails.length} answered</small></div><div className="apt-navigator">{session.questions.map((q) => <button key={q.order} className={bubbleClass(q)} onClick={() => goTo(q.order)}>{q.order + 1}</button>)}</div><div className="apt-legend"><span><i className="solved" /> Solved</span><span><i className="skipped" /> Skipped</span><span><i className="unsolved" /> Visited, unanswered</span><span><i className="marked" /> Marked for review</span></div>{markedCount > 0 && <button className="apt-btn secondary" style={{ width: "100%", marginTop: 14 }} onClick={jumpToNextMarked}><Flag size={13} /> Next marked ({markedCount})</button>}</div><div className="apt-side-card apt-side-note"><strong>Before you submit</strong><p>Marked questions stay in your palette even after you answer them, so you can jump back any time before finishing.</p></div><button className="apt-submit-test" disabled={finishing} onClick={() => finish(false)}>{finishing ? "Submitting…" : "Finish session"}</button></div>
    </div>
  </div>;
}
