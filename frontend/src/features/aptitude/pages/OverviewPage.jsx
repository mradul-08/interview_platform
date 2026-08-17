import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Play, Target, CalendarClock, TrendingUp, Timer, ArrowRight, Award, ChevronLeft, ChevronRight, Pause, Play as PlayIcon, X, CheckCircle2 } from "lucide-react";
import aptitudeApi from "../lib/api";
import { Card, SectionHeader, EmptyState, PageLoading, ErrorNote, ProgressBar, Pill } from "../lib/ui";
import { formatTopicName, relativeDue, CATEGORY_META, DIFFICULTY_META } from "../lib/format";
import ReadinessCard from "../components/ReadinessCard";
import StreakCalendar from "../components/StreakCalendar";
import AptitudeAnalyticsChart from "../components/AptitudeAnalyticsChart";
import QuestionPackAccess from "../components/QuestionPackAccess";
import useRealtimeSocket from "../../../realtime/useRealtimeSocket";

export default function OverviewPage() {
  const navigate = useNavigate();
  const [state, setState] = useState({ loading: true, error: "" });
  const [dashboardReady, setDashboardReady] = useState(false);
  const [dashboard, setDashboard] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [revision, setRevision] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [recommendationIndex, setRecommendationIndex] = useState(0);
  const [recommendationsPaused, setRecommendationsPaused] = useState(false);
  const [selectedRecommendation, setSelectedRecommendation] = useState(null);
  const [weakTopicIndex, setWeakTopicIndex] = useState(0);
  const loadingRef = useRef(false);

  const load = ({ background = false } = {}) => {
    if (loadingRef.current) return null;
    loadingRef.current = true;
    // Render the page shell immediately. Individual cards own their loading
    // shells, so one slow endpoint cannot blank the entire overview.
    if (!background) setState((current) => ({ ...current, loading: false, error: "" }));
    const controller = new AbortController();
    const fast = (request) => Promise.race([
      request.catch(() => null),
      new Promise((resolve) => window.setTimeout(() => resolve(null), 8000)),
    ]);
    Promise.all([
      fast(aptitudeApi.dashboard(controller.signal)),
      fast(aptitudeApi.activeSession(controller.signal)),
      fast(aptitudeApi.revision(controller.signal)),
      fast(aptitudeApi.recommendations(controller.signal)),
      fast(aptitudeApi.analytics(controller.signal)),
    ]).then(([d, s, r, rec, a]) => {
      const overviewUnavailable = [d, s, r, rec, a].every((response) => !response);
      if (d) setDashboard(d.data?.data || null);
      if (s) setActiveSession(s.data?.session || null);
      if (r) setRevision(r.data?.data || null);
      if (rec) setRecommendations(rec.data?.questions || []);
      if (a) setAnalytics(a.data?.data || null);
      setDashboardReady(!overviewUnavailable);
      // Overview is a composed page. One unavailable endpoint must not replace
      // the whole page with an error screen; independent cards can still load.
      if (!background) {
        setState({ loading: false, error: overviewUnavailable ? "Aptitude overview could not be loaded. Check your connection and try again." : "" });
      } else if (!overviewUnavailable) {
        setState((current) => ({ ...current, error: "" }));
      }
    }).finally(() => {
      loadingRef.current = false;
    });
    return controller;
  };

  useEffect(() => {
    const controller = load();
    return () => controller?.abort();
  }, []);

  useRealtimeSocket({
    "realtime:ready": () => { setRefreshKey((value) => value + 1); load({ background: true }); },
    "aptitude:analytics-updated": () => { setRefreshKey((value) => value + 1); load({ background: true }); },
    "aptitude:revision-updated": (payload) => {
      if (payload?.revision) setRevision(payload.revision);
      setRefreshKey((value) => value + 1);
    },
    "gamification:updated": () => { setRefreshKey((value) => value + 1); load({ background: true }); },
  });

  const weakTopics = dashboard?.weakTopics?.length ? dashboard.weakTopics : (analytics?.topicPerformance || []).map((item) => ({
    topic: item.topic,
    category: item.category,
    totalAttempts: item.total,
    totalCorrect: item.correct,
    masteryScore: item.accuracy,
    isWeak: item.accuracy < 60,
    earlySignal: item.total < 5,
  }));
  useEffect(() => {
    if (weakTopics.length < 2) return undefined;
    const timer = window.setInterval(() => setWeakTopicIndex((current) => (current + 1) % weakTopics.length), 8000);
    return () => window.clearInterval(timer);
  }, [weakTopics.length]);
  const weakest = weakTopics.length ? weakTopics[weakTopicIndex % weakTopics.length] : null;
  const recommendationWindow = Math.min(4, recommendations.length);
  const visibleRecommendations = recommendations.length <= recommendationWindow
    ? recommendations
    : Array.from({ length: recommendationWindow }, (_, index) => recommendations[(recommendationIndex + index) % recommendations.length]);
  useEffect(() => setRecommendationIndex(0), [recommendations.length]);
  useEffect(() => {
    if (recommendationsPaused || recommendations.length <= recommendationWindow) return undefined;
    const timer = window.setInterval(() => setRecommendationIndex((current) => (current + 1) % recommendations.length), 12000);
    return () => window.clearInterval(timer);
  }, [recommendationsPaused, recommendations.length, recommendationWindow]);
  if (state.loading) return <PageLoading />;
  if (state.error) return <ErrorNote message={state.error} onRetry={load} />;
  return (
    <div style={{ display: "grid", gap: 18 }}>
      {activeSession && (
        <Card style={{ background: "var(--accent-soft)", borderColor: "var(--accent)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 11, background: "var(--accent)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Play size={17} />
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: "var(--text-primary)" }}>You have a session in progress</div>
                <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                  {activeSession.questions?.length || 0} questions · pick up where you left off
                </div>
              </div>
            </div>
            <button className="cv-button-primary" style={{ padding: "9px 18px", fontSize: 12.5 }} onClick={() => navigate(`/dashboard/aptitude/session/${activeSession._id}`)}>
              Continue session <ArrowRight size={14} />
            </button>
          </div>
        </Card>
      )}

      <ReadinessCard refreshKey={refreshKey} />

      <QuestionPackAccess refreshKey={refreshKey} />

      <AptitudeAnalyticsChart refreshKey={refreshKey} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
        <Card style={{ background: "linear-gradient(135deg, var(--bg-surface), var(--bg-elevated))", borderColor: "var(--border-default)" }}>
          <SectionHeader icon={<Timer size={16} />} title="Mock tests" sub="Timed interview practice" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, marginBottom: 14 }}>
            <div style={{ padding: "10px", borderRadius: 10, background: "var(--bg-elevated-2)" }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)" }}>20</div>
              <div style={{ fontSize: 10.5, color: "var(--text-tertiary)", marginTop: 2 }}>questions</div>
            </div>
            <div style={{ padding: "10px", borderRadius: 10, background: "var(--bg-elevated-2)" }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)" }}>20 min</div>
              <div style={{ fontSize: 10.5, color: "var(--text-tertiary)", marginTop: 2 }}>server timed</div>
            </div>
          </div>
          <div style={{ fontSize: 11.5, color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 12 }}>Test your speed and accuracy with exam-style questions. Choose mixed or category-specific mode.</div>
          <button className="cv-button-primary" style={{ width: "100%", padding: "9px 12px", fontSize: 12 }} onClick={() => navigate("/dashboard/aptitude/mock")}>
            Configure mock test <ArrowRight size={14} />
          </button>
        </Card>

        <Card>
          <SectionHeader icon={<Target size={16} />} title="Weakest area" />
          {!dashboardReady ? (
            <div className="cv-aptitude-skeleton" style={{ height: 220 }} aria-label="Loading weak area" />
          ) : !weakest ? (
            <EmptyState icon={<Target size={20} />} title="No weak spots found yet" description="Keep practicing across categories — we'll flag topics below 60% accuracy here." />
          ) : (
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)", marginBottom: 4 }}>{formatTopicName(weakest.topic)}</div>
              <div style={{ fontSize: 12, color: "var(--text-tertiary)", marginBottom: 10 }}>{weakest.category} · {weakest.totalAttempts} attempts</div>
              <ProgressBar value={weakest.masteryScore} color="var(--red)" />
              <div style={{ fontSize: 11.5, color: weakest.isWeak ? "var(--red)" : "var(--green)", marginTop: 6, fontWeight: 700 }}>{weakest.masteryScore}% accuracy{weakest.earlySignal ? " · early signal" : weakest.isWeak ? " · needs focus" : " · lowest current score"}</div>
              <button
                className="cv-button-secondary"
                style={{ marginTop: 12, width: "100%", padding: "8px", fontSize: 12 }}
                onClick={() => navigate("/dashboard/aptitude/practice", { state: { topic: weakest.topic } })}
              >
                Practice this topic
              </button>
            </div>
          )}
        </Card>

        <Card>
          <SectionHeader icon={<CalendarClock size={16} />} title="Revision command center" sub={revision?.hasData ? `${revision.dueCount || 0} due now · ${revision.upcomingCount || 0} scheduled` : undefined} />
          {!dashboardReady ? (
            <div className="cv-aptitude-skeleton" style={{ height: 220 }} aria-label="Loading revision queue" />
          ) : !revision?.hasData ? (
            <EmptyState icon={<CalendarClock size={20} />} title="Nothing scheduled" description="Wrong answers automatically get scheduled for spaced revision." />
          ) : revision.dueCount === 0 ? (
            <div>
              <div style={{ display: "flex", gap: 14, marginBottom: 12, color: "var(--text-tertiary)", fontSize: 10.5 }}><span><b style={{ color: "var(--text-primary)", fontSize: 14 }}>{revision.totalMistakes || 0}</b> mistakes tracked</span><span><b style={{ color: "var(--red)", fontSize: 14 }}>{revision.summary?.highPriority || 0}</b> high priority</span></div>
              <div style={{ display: "grid", gap: 7, marginBottom: 12 }}>
                {revision.upcoming.slice(0, 3).map((item) => (
                  <div key={`${item.topic}-${item.dueDate}`} style={{ display: "grid", gap: 5, padding: "9px 10px", borderRadius: 8, background: "var(--bg-elevated)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><span style={{ fontSize: 12, color: "var(--text-primary)", fontWeight: 700 }}>{item.topic}</span><span style={{ fontSize: 10.5, color: item.priority === "high" ? "var(--red)" : "var(--amber)", fontWeight: 700 }}>{item.priorityLabel}</span></div>
                    <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-tertiary)", fontSize: 10.5 }}><span>{item.mistakes} mistake{item.mistakes === 1 ? "" : "s"} · {item.accuracy}% accuracy</span><span>{relativeDue(item.dueDate)} · stage {item.stage + 1}</span></div>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, color: "var(--text-tertiary)", fontSize: 11.5 }}><span>Scheduled after a short gap for retrieval practice.</span><button className="cv-button-secondary" style={{ padding: "7px 10px", fontSize: 11 }} onClick={() => navigate("/dashboard/aptitude/review")}>Open plan <ArrowRight size={13} /></button></div>
            </div>
          ) : (
            <div>
              <div style={{ display: "flex", gap: 14, marginBottom: 12, color: "var(--text-tertiary)", fontSize: 10.5 }}><span><b style={{ color: "var(--text-primary)", fontSize: 14 }}>{revision.totalMistakes || 0}</b> mistakes tracked</span><span><b style={{ color: "var(--red)", fontSize: 14 }}>{revision.summary?.highPriority || 0}</b> high priority</span><span><b style={{ color: "var(--green)", fontSize: 14 }}>{revision.dueCount}</b> ready now</span></div>
              <div style={{ display: "grid", gap: 6, marginBottom: 12 }}>
                {revision.due.slice(0, 3).map((item) => (
                  <div key={`${item.topic}-${item.dueDate}`} style={{ display: "grid", gap: 5, padding: "9px 10px", borderRadius: 8, background: "var(--bg-elevated)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><span style={{ fontSize: 12, color: "var(--text-primary)", fontWeight: 700 }}>{item.topic}</span><span style={{ fontSize: 10.5, color: item.priority === "high" ? "var(--red)" : "var(--green)", fontWeight: 700 }}>{item.priorityLabel}</span></div>
                    <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-tertiary)", fontSize: 10.5 }}><span>{item.mistakes} mistake{item.mistakes === 1 ? "" : "s"} · {item.accuracy}% accuracy</span><span>{relativeDue(item.dueDate)} · stage {item.stage + 1}</span></div>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}><span style={{ color: "var(--text-tertiary)", fontSize: 11.5 }}>{revision.dueCount} topic{revision.dueCount === 1 ? "" : "s"} ready for retrieval practice.</span><button className="cv-button-primary" style={{ padding: "7px 11px", fontSize: 11 }} onClick={() => navigate("/dashboard/aptitude/review")}>Start revision <ArrowRight size={13} /></button></div>
            </div>
          )}
        </Card>
      </div>

      <Card>
        <SectionHeader
          icon={<TrendingUp size={16} />}
          title="Recommended next"
          sub="Picked based on your recent accuracy and mistake pattern"
          action="Browse all"
          onAction={() => navigate("/dashboard/aptitude/practice")}
        />
        {recommendations.length > recommendationWindow && <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, marginTop: -8, marginBottom: 10 }}><button type="button" onClick={() => setRecommendationsPaused((value) => !value)} aria-label={recommendationsPaused ? "Resume recommendations" : "Pause recommendations"} style={carouselIconButton}>{recommendationsPaused ? <PlayIcon size={13} /> : <Pause size={13} />}</button><button type="button" onClick={() => setRecommendationIndex((current) => (current - 1 + recommendations.length) % recommendations.length)} aria-label="Previous recommendations" style={carouselIconButton}><ChevronLeft size={13} /></button><button type="button" onClick={() => setRecommendationIndex((current) => (current + 1) % recommendations.length)} aria-label="Next recommendations" style={carouselIconButton}><ChevronRight size={13} /></button></div>}
        {!dashboardReady ? (
          <div className="cv-aptitude-skeleton" style={{ height: 150 }} aria-label="Loading recommendations" />
        ) : recommendations.length === 0 ? (
          <EmptyState icon={<Award size={20} />} title="No recommendations yet" description="Answer a few questions and we'll start suggesting what to practice next." />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }} onMouseEnter={() => setRecommendationsPaused(true)} onMouseLeave={() => setRecommendationsPaused(false)}>
            {visibleRecommendations.map((q, index) => {
              const meta = CATEGORY_META[q.category] || {};
              const difficultyMeta = DIFFICULTY_META[q.difficulty] || {};
              return (
                <button
                  key={`${q._id}-${recommendationIndex}-${index}`}
                  type="button"
                  onClick={() => { setRecommendationsPaused(true); setSelectedRecommendation(q); }}
                  style={{ textAlign: "left", padding: "12px 14px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)", background: "var(--bg-elevated)", cursor: "pointer" }}
                  className="transition-all duration-200 hover:-translate-y-0.5"
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}><Pill color={meta.color} bg={meta.bg}>{meta.short || q.category}</Pill><span style={{ color: difficultyMeta.color, fontSize: 10.5, fontWeight: 800 }}>{q.difficulty}</span></div>
                  <div style={{ fontSize: 12.5, color: "var(--text-primary)", fontWeight: 600, marginTop: 8, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {q.question}
                  </div>
                  <div style={{ fontSize: 10.5, color: "var(--text-tertiary)", marginTop: 8 }}>{q.difficulty} · {q.topic}</div>
                </button>
              );
            })}
          </div>
        )}
      </Card>

      {selectedRecommendation && <div role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedRecommendation(null); }} style={{ position: "fixed", inset: 0, zIndex: 80, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, background: "rgba(3, 5, 12, .72)" }}>
        <div role="dialog" aria-modal="true" aria-label="Question explanation" style={{ width: "min(720px, 100%)", maxHeight: "min(760px, 90vh)", overflowY: "auto", padding: 22, border: "1px solid var(--border-default)", borderRadius: 18, background: "var(--bg-surface)", boxShadow: "var(--shadow-lg)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14 }}><div><div style={{ display: "flex", gap: 7, marginBottom: 10 }}><Pill color={(CATEGORY_META[selectedRecommendation.category] || {}).color} bg={(CATEGORY_META[selectedRecommendation.category] || {}).bg}>{(CATEGORY_META[selectedRecommendation.category] || {}).short || selectedRecommendation.category}</Pill><Pill color={(DIFFICULTY_META[selectedRecommendation.difficulty] || {}).color} bg={(DIFFICULTY_META[selectedRecommendation.difficulty] || {}).bg}>{selectedRecommendation.difficulty}</Pill></div><h2 style={{ margin: 0, color: "var(--text-primary)", fontSize: 20, lineHeight: 1.4 }}>{selectedRecommendation.question}</h2><div style={{ marginTop: 7, color: "var(--text-tertiary)", fontSize: 11.5 }}>{formatTopicName(selectedRecommendation.topic)} · Read-only explanation</div></div><button type="button" onClick={() => setSelectedRecommendation(null)} aria-label="Close explanation" style={carouselIconButton}><X size={16} /></button></div>
          <div style={{ display: "grid", gap: 8, marginTop: 20 }}>{(selectedRecommendation.options || []).map((option) => { const correct = option.key === selectedRecommendation.correctAnswer; return <div key={option.key} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "11px 12px", border: `1px solid ${correct ? "var(--green)" : "var(--border-subtle)"}`, borderRadius: 10, background: correct ? "var(--green-soft)" : "var(--bg-elevated)", color: "var(--text-primary)" }}><span style={{ width: 24, height: 24, display: "grid", placeItems: "center", flex: "0 0 auto", borderRadius: "50%", background: correct ? "var(--green)" : "var(--bg-elevated-2)", color: correct ? "#071b14" : "var(--text-secondary)", fontSize: 11, fontWeight: 800 }}>{option.key}</span><span style={{ flex: 1, fontSize: 13, lineHeight: 1.5 }}>{option.text}</span>{correct && <CheckCircle2 size={17} color="var(--green)" />}</div>; })}</div>
          {selectedRecommendation.explanation && <div style={{ marginTop: 18, padding: 14, borderLeft: "3px solid var(--accent)", borderRadius: "0 10px 10px 0", background: "var(--accent-soft)" }}><strong style={{ color: "var(--text-primary)", fontSize: 12.5 }}>Explanation</strong><p style={{ margin: "7px 0 0", color: "var(--text-secondary)", fontSize: 12.5, lineHeight: 1.65 }}>{selectedRecommendation.explanation}</p>{selectedRecommendation.shortTrick && <><strong style={{ display: "block", marginTop: 12, color: "var(--accent-strong)", fontSize: 12 }}>Shortcut</strong><p style={{ margin: "5px 0 0", color: "var(--text-secondary)", fontSize: 12.5, lineHeight: 1.6 }}>{selectedRecommendation.shortTrick}</p></>}{selectedRecommendation.conceptNote && <><strong style={{ display: "block", marginTop: 12, color: "var(--text-primary)", fontSize: 12 }}>Concept to remember</strong><p style={{ margin: "5px 0 0", color: "var(--text-secondary)", fontSize: 12.5, lineHeight: 1.6 }}>{selectedRecommendation.conceptNote}</p></>}</div>}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}><button type="button" className="cv-button-secondary" onClick={() => setSelectedRecommendation(null)}>Close explanation</button></div>
        </div>
      </div>}

      <StreakCalendar refreshKey={refreshKey} currentStreak={dashboard?.currentStreak || 0} longestStreak={dashboard?.longestStreak || 0} />
    </div>
  );
}

const carouselIconButton = { display: "grid", placeItems: "center", width: 30, height: 30, padding: 0, border: "1px solid var(--border-default)", borderRadius: 8, background: "var(--bg-elevated)", color: "var(--text-secondary)", cursor: "pointer" };
