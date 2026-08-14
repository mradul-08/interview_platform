import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Trophy, RotateCcw, Target, CalendarClock, LayoutDashboard, Gauge, CheckCircle2, XCircle, SkipForward, Clock3, PieChart, ArrowRight, Loader2 } from "lucide-react";
import aptitudeApi from "../lib/api";
import { Card, PageLoading, ErrorNote, ProgressBar } from "../lib/ui";
import { formatTopicName, readinessLabel } from "../lib/format";

const PIE_COLORS = { correct: "var(--green)", incorrect: "var(--red)", skipped: "var(--text-disabled)" };

export default function ResultPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState({ loading: true, error: "" });
  const [results, setResults] = useState(null);
  const [readinessScore, setReadinessScore] = useState(null);
  const [practiceTopicIndex, setPracticeTopicIndex] = useState(0);
  const [availableTopics, setAvailableTopics] = useState([]);
  const [repracticing, setRepracticing] = useState(false);

  useEffect(() => {
    aptitudeApi.submitSession(sessionId)
      .then((res) => {
        setResults(res.data.results);
        setReadinessScore(res.data.readinessScore ?? null);
        setState({ loading: false, error: "" });
      })
      .catch(() => setState({ loading: false, error: "Couldn't load your results." }));
  }, [sessionId]);

  useEffect(() => {
    const controller = new AbortController();
    aptitudeApi.topics(controller.signal)
      .then((res) => setAvailableTopics(res.data?.topics || []))
      .catch(() => {});
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const topicCount = new Set([...Object.keys(results?.topicBreakdown || {}), ...availableTopics]).size;
    if (topicCount < 2) return undefined;
    const timer = window.setInterval(() => {
      setPracticeTopicIndex((current) => (current + 1) % topicCount);
    }, 8000);
    return () => window.clearInterval(timer);
  }, [results, availableTopics]);

  if (state.loading) return <PageLoading />;
  if (state.error) return <ErrorNote message={state.error} />;
  if (!results) return <ErrorNote message="No results found for this session." />;

  const total = results.totalCorrect + results.totalIncorrect + results.totalSkipped;
  const answered = results.totalCorrect + results.totalIncorrect;
  const meta = readinessLabel(readinessScore);
  const categories = Object.entries(results.categoryBreakdown || {});
  const topics = Object.entries(results.topicBreakdown || {}).sort((a, b) => b[1].total - a[1].total);
  const worstCategory = categories.sort((a, b) => a[1].accuracy - b[1].accuracy)[0];
  const practiceTopics = [...new Set([...topics.map(([topic]) => topic), ...availableTopics])];
  const rotatingTopic = practiceTopics.length ? practiceTopics[practiceTopicIndex % practiceTopics.length] : null;
  const rotatingTopicLabel = rotatingTopic ? formatTopicName(rotatingTopic) : null;
  const chart = buildPie(results);
  const verdict = results.accuracy >= 80 ? "Excellent command" : results.accuracy >= 60 ? "Good progress" : answered ? "Keep building your base" : "Start with one more attempt";
  const repracticeMistakes = async () => {
    setRepracticing(true);
    try {
      const response = await aptitudeApi.repracticeSessionMistakes(sessionId);
      navigate(`/dashboard/aptitude/session/${response.data.session._id}`);
    } catch {
      setRepracticing(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <Card style={{ padding: "26px 28px", background: "linear-gradient(135deg, var(--bg-surface), var(--bg-elevated))" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 18, flexWrap: "wrap", marginBottom: 24 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--accent-strong)", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".08em" }}><Trophy size={16} /> Practice report</div>
            <h1 style={{ margin: "8px 0 5px", fontSize: 25, color: "var(--text-primary)", letterSpacing: "-.02em" }}>{verdict}</h1>
            <p style={{ margin: 0, color: "var(--text-tertiary)", fontSize: 12.5 }}>Here is what this practice session says about your performance.</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}><div style={{ padding: "8px 12px", borderRadius: 999, color: results.accuracy >= 60 ? "var(--green)" : "var(--amber)", background: results.accuracy >= 60 ? "var(--green-soft)" : "var(--amber-soft)", fontSize: 12, fontWeight: 800 }}>{results.timedOut ? "Time limit reached" : "Session completed"}</div><button className="cv-button-primary" style={{ padding: "8px 13px", fontSize: 12 }} onClick={() => navigate("/dashboard/aptitude/practice")}><ArrowRight size={14} /> End report</button></div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "minmax(210px, .8fr) minmax(260px, 1.2fr)", gap: 28, alignItems: "center" }}>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <div aria-label={`Result: ${results.totalCorrect} correct, ${results.totalIncorrect} incorrect, ${results.totalSkipped} skipped`} style={{ width: 190, height: 190, borderRadius: "50%", background: chart.background, display: "grid", placeItems: "center", position: "relative", boxShadow: "inset 0 0 0 1px var(--border-subtle)" }}>
              <div style={{ width: 126, height: 126, borderRadius: "50%", background: "var(--bg-surface)", display: "grid", placeItems: "center", textAlign: "center", boxShadow: "0 0 0 1px var(--border-subtle)" }}>
                <strong style={{ fontSize: 30, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>{results.accuracy}%</strong>
                <span style={{ marginTop: -4, fontSize: 10.5, color: "var(--text-tertiary)" }}>accuracy</span>
              </div>
            </div>
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 14, color: "var(--text-primary)", fontSize: 14, fontWeight: 800 }}><PieChart size={16} color="var(--accent-strong)" /> Answer distribution</div>
            <div style={{ display: "grid", gap: 9 }}>
              <LegendRow icon={<CheckCircle2 size={16} />} label="Correct answers" value={results.totalCorrect} total={total} color={PIE_COLORS.correct} />
              <LegendRow icon={<XCircle size={16} />} label="Incorrect answers" value={results.totalIncorrect} total={total} color={PIE_COLORS.incorrect} />
              <LegendRow icon={<SkipForward size={16} />} label="Skipped questions" value={results.totalSkipped} total={total} color={PIE_COLORS.skipped} />
            </div>
            <div style={{ marginTop: 15, padding: "10px 12px", borderRadius: 10, color: "var(--text-secondary)", background: "var(--bg-elevated)", fontSize: 11.5, lineHeight: 1.5 }}>{answered ? `You attempted ${answered} of ${total} questions and got ${results.totalCorrect} right.` : "No questions were answered in this session."}</div>
          </div>
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))", gap: 12 }}>
        <Metric icon={<Target size={16} />} label="Score" value={results.score} note={`${results.totalCorrect} correct`} />
        <Metric icon={<Clock3 size={16} />} label="Average speed" value={`${results.avgTimeSpent}s`} note="per question" />
        <Metric icon={<Trophy size={16} />} label="XP earned" value={`+${results.totalXpAwarded}`} note="from this session" />
        {typeof results.negativeMarks === "number" && <Metric icon={<XCircle size={16} />} label="Penalty" value={results.negativeMarks ? `-${results.negativeMarks}` : "0"} note="negative marks" color={results.negativeMarks ? "var(--red)" : undefined} />}
      </div>

      {readinessScore != null && <Card><div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}><div style={{ width: 44, height: 44, borderRadius: 13, background: "var(--accent-soft)", color: "var(--accent-strong)", display: "grid", placeItems: "center" }}><Gauge size={20} /></div><div style={{ flex: 1, minWidth: 180 }}><div style={{ fontSize: 11.5, color: "var(--text-tertiary)" }}>Your readiness after this session</div><div style={{ marginTop: 3, fontSize: 16, fontWeight: 800, color: meta.color }}>{readinessScore} · {meta.label}</div></div><button className="cv-button-secondary" style={{ padding: "8px 14px", fontSize: 12 }} onClick={() => navigate("/dashboard/aptitude/progress")}>View full progress</button></div></Card>}

      {categories.length > 0 && <Card><SectionTitle icon={<Target size={16} />} title="Category performance" sub="See where this session was strongest and weakest." /><div style={{ display: "grid", gap: 13 }}>{categories.map(([category, stats]) => <div key={category}><div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 6, fontSize: 12 }}><span style={{ color: "var(--text-primary)", fontWeight: 700 }}>{category}</span><span style={{ color: stats.accuracy >= 60 ? "var(--green)" : "var(--red)", fontFamily: "var(--font-mono)", fontWeight: 800 }}>{stats.accuracy}% <small style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-sans)", fontWeight: 500 }}>({stats.correct}/{stats.total})</small></span></div><ProgressBar value={stats.accuracy} color={stats.accuracy >= 60 ? "var(--green)" : "var(--red)"} /></div>)}</div></Card>}

      {topics.length > 0 && <Card><SectionTitle icon={<PieChart size={16} />} title="Topic-level detail" sub="Use this list to choose your next revision target." /><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 9 }}>{topics.map(([topic, stats]) => <div key={topic} style={{ padding: "11px 12px", border: "1px solid var(--border-subtle)", borderRadius: 10, background: "var(--bg-elevated)" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12 }}><strong style={{ color: "var(--text-primary)" }}>{topic}</strong><strong style={{ color: stats.accuracy >= 60 ? "var(--green)" : "var(--red)", fontFamily: "var(--font-mono)" }}>{stats.accuracy}%</strong></div><div style={{ marginTop: 5, color: "var(--text-tertiary)", fontSize: 10.5 }}>{stats.correct} correct of {stats.total} · {stats.total - stats.correct} to revise</div></div>)}</div></Card>}

      <Card><SectionTitle icon={<RotateCcw size={16} />} title="Your next best move" sub={worstCategory ? `Focus first on ${formatTopicName(worstCategory[0])}.` : "Keep the momentum going."} /><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 10 }}><ActionButton icon={<RotateCcw size={15} />} label="Review mistakes" onClick={() => navigate(`/dashboard/aptitude/results/${sessionId}/review`)} />{(rotatingTopic || worstCategory) && <ActionButton key={rotatingTopic || worstCategory[0]} className="apt-rotating-action" icon={<Target size={15} />} label={`Practice ${rotatingTopicLabel || formatTopicName(worstCategory[0])}`} onClick={() => navigate("/dashboard/aptitude/practice", rotatingTopic ? { state: { topic: rotatingTopic } } : { state: { category: worstCategory[0] } })} />}<ActionButton icon={repracticing ? <Loader2 size={15} /> : <CalendarClock size={15} />} label={repracticing ? "Preparing mistakes..." : "Re-practice mistakes"} onClick={repracticeMistakes} disabled={repracticing || results.totalIncorrect === 0} /><ActionButton icon={<LayoutDashboard size={15} />} label="Review this session" onClick={() => navigate(`/dashboard/aptitude/results/${sessionId}/full-review`)} /></div></Card>
    </div>
  );
}

function buildPie(results) {
  const total = results.totalCorrect + results.totalIncorrect + results.totalSkipped;
  if (!total) return { background: "var(--bg-elevated-2)" };
  const correctEnd = results.totalCorrect / total * 100;
  const incorrectEnd = correctEnd + results.totalIncorrect / total * 100;
  return { background: `conic-gradient(${PIE_COLORS.correct} 0 ${correctEnd}%, ${PIE_COLORS.incorrect} ${correctEnd}% ${incorrectEnd}%, ${PIE_COLORS.skipped} ${incorrectEnd}% 100%)` };
}

function LegendRow({ icon, label, value, total, color }) {
  const percent = total ? Math.round(value / total * 100) : 0;
  return <div style={{ display: "flex", alignItems: "center", gap: 9, color }}><span style={{ display: "grid", placeItems: "center" }}>{icon}</span><span style={{ flex: 1, color: "var(--text-secondary)", fontSize: 12 }}>{label}</span><strong style={{ color: "var(--text-primary)", fontFamily: "var(--font-mono)", fontSize: 12 }}>{value}</strong><span style={{ width: 38, textAlign: "right", color: "var(--text-tertiary)", fontSize: 11 }}>{percent}%</span></div>;
}

function Metric({ icon, label, value, note, color = "var(--text-primary)" }) {
  return <Card padding="14px 15px"><div style={{ display: "flex", alignItems: "center", gap: 7, color: "var(--text-tertiary)", fontSize: 10.5 }}>{icon}{label}</div><div style={{ marginTop: 7, color, fontSize: 20, fontWeight: 800, fontFamily: "var(--font-mono)" }}>{value}</div><div style={{ marginTop: 3, color: "var(--text-tertiary)", fontSize: 10.5 }}>{note}</div></Card>;
}

function SectionTitle({ icon, title, sub }) {
  return <div style={{ display: "flex", alignItems: "flex-start", gap: 9, marginBottom: 16 }}><span style={{ color: "var(--accent-strong)", marginTop: 1 }}>{icon}</span><div><div style={{ color: "var(--text-primary)", fontSize: 14, fontWeight: 800 }}>{title}</div>{sub && <div style={{ marginTop: 3, color: "var(--text-tertiary)", fontSize: 11.5 }}>{sub}</div>}</div></div>;
}

function ActionButton({ icon, label, onClick, className = "", disabled = false }) {
  return <button onClick={onClick} disabled={disabled} className={`cv-button-secondary ${className}`} style={{ padding: "11px 14px", fontSize: 12.5, justifyContent: "flex-start" }} aria-live="polite">{icon} {label}</button>;
}
