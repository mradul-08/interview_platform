import { useEffect, useMemo, useRef, useState } from "react";
import api from "../../api/api";
import "../../styles/aptitude.css";

const TABS = ["Overview", "Practice", "Mock Tests", "Topics", "Analytics", "Review", "Badges"];
const CATEGORIES = [
  { name: "Quantitative Aptitude", short: "Quant", icon: "∑", tone: "violet", description: "Percentages, profit & loss, time, algebra and more." },
  { name: "Logical Reasoning", short: "Logic", icon: "◇", tone: "cyan", description: "Patterns, puzzles, arrangements and deduction." },
  { name: "Verbal Ability", short: "Verbal", icon: "Aa", tone: "pink", description: "Grammar, vocabulary, comprehension and sentence skills." },
  { name: "Data Interpretation", short: "Data", icon: "▥", tone: "amber", description: "Tables, charts, graphs and caselets." },
];
const DIFFICULTIES = [
  { label: "Easy", copy: "Build fundamentals", tone: "success" },
  { label: "Medium", copy: "Sharpen patterns", tone: "warning" },
  { label: "Hard", copy: "Practice under pressure", tone: "danger" },
];

export default function AptitudePage() {
  const [tab, setTab] = useState("Overview");
  const [dashboard, setDashboard] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [mistakes, setMistakes] = useState(null);
  const [revision, setRevision] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [session, setSession] = useState(null);
  const [summary, setSummary] = useState(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [result, setResult] = useState(null);
  const [questionStartedAt, setQuestionStartedAt] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [markedQuestions, setMarkedQuestions] = useState(new Set());
  const [bookmarked, setBookmarked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [preflight, setPreflight] = useState(null);
  const submissionCounter = useRef(0);
  const startingRef = useRef(false);

  const loadWorkspace = async (signal) => {
    const responses = await Promise.all([
      api.get("/api/aptitude/dashboard", { signal }),
      api.get("/api/aptitude/recommendations", { signal }),
      api.get("/api/aptitude/analytics", { signal }),
      api.get("/api/aptitude/mistakes", { signal }),
      api.get("/api/aptitude/revision", { signal }),
      api.get("/api/aptitude/sessions/active", { signal }),
    ]);
    setDashboard(responses[0].data.data || null);
    setRecommendations(responses[1].data.questions || []);
    setAnalytics(responses[2].data.data || null);
    setMistakes(responses[3].data.data || null);
    setRevision(responses[4].data.data || null);
    setActiveSession(responses[5].data.session || null);
  };

  useEffect(() => {
    const controller = new AbortController();
    // The workspace request synchronizes this page with the API once on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadWorkspace(controller.signal)
      .catch((requestError) => { if (!controller.signal.aborted) setError(requestError.response?.data?.message || "Unable to load aptitude workspace."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  const openSession = (nextSession) => {
    const details = nextSession.questionDetails || nextSession.questions?.map((item) => item.questionData).filter(Boolean) || [];
    const resumeIndex = Math.min(nextSession.currentQuestionIndex || 0, Math.max(details.length - 1, 0));
    setSession({ ...nextSession, questionDetails: details });
    setActiveSession(null);
    setSummary(null);
    setQuestionIndex(resumeIndex);
    setSelectedAnswer(null);
    setMarkedQuestions(new Set((nextSession.questions || []).filter((item) => item.status === "MARKED_FOR_REVIEW").map((item) => item.order)));
    setResult(null);
    setQuestionStartedAt(new Date().toISOString());
    setElapsed(0);
    setError("");
  };

  const startSession = async (config = {}) => {
    if (startingRef.current || starting || session) return;
    startingRef.current = true;
    setStarting(true); setError("");
    try {
      const totalQuestions = Number(config.totalQuestions) || 10;
      const response = await api.post("/api/aptitude/sessions", { mode: config.mode || "QUICK", config: { totalQuestions, timeLimitSeconds: totalQuestions * 120, ...config } });
      openSession(response.data.session);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to start this session.");
    } finally { startingRef.current = false; setStarting(false); }
  };

  const requestSession = (config = {}) => {
    if (startingRef.current || starting || session) return;
    if (["EXAM_SIMULATION", "COMPANY_PATTERN"].includes(config.mode)) setPreflight(config);
    else startSession(config);
  };

  const currentQuestion = session?.questionDetails?.[questionIndex];
  const isExam = ["EXAM_SIMULATION", "COMPANY_PATTERN"].includes(session?.mode);
  const hasCountdown = Boolean(session?.expiresAt || session?.config?.timeLimitSeconds);
  const questionStatuses = useMemo(() => new Map((session?.questions || []).map((item) => [item.order, item.status || "UNANSWERED"])), [session]);
  const statusCounts = useMemo(() => {
    const statuses = [...questionStatuses.values()];
    return { answered: statuses.filter((status) => status === "ANSWERED").length, skipped: statuses.filter((status) => status === "SKIPPED").length, unanswered: statuses.filter((status) => !["ANSWERED", "SKIPPED"].includes(status)).length };
  }, [questionStatuses]);

  useEffect(() => {
    if (!session || !questionStartedAt || result) return undefined;
    const timer = window.setInterval(() => {
      const now = Date.now();
      if (hasCountdown && session.expiresAt) setElapsed(Math.max(0, Math.floor((new Date(session.expiresAt).getTime() - now) / 1000)));
      else setElapsed(Math.max(0, Math.floor((now - new Date(questionStartedAt).getTime()) / 1000)));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [session, questionStartedAt, result, hasCountdown]);

  const submitAnswer = async () => {
    if (!session || !currentQuestion || submitting || selectedAnswer === null) return;
    setSubmitting(true); setError("");
    try {
      submissionCounter.current += 1;
      const submissionId = window.crypto?.randomUUID?.() || `apt-${questionIndex}-${submissionCounter.current}`;
      const response = await api.post("/api/aptitude/attempts", { questionId: currentQuestion._id, selectedAnswer, sessionId: session._id, submissionId, startedAt: questionStartedAt, timeSpent: elapsed });
      setResult(response.data.result);
      setSession((previous) => ({ ...previous, questions: (previous.questions || []).map((item) => item.order === questionIndex ? { ...item, status: "ANSWERED" } : item) }));
      if (isExam) window.setTimeout(() => goNext(true), 350);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to submit this answer.");
    } finally { setSubmitting(false); }
  };

  const skipQuestion = async () => {
    if (!session || !currentQuestion || submitting) return;
    setSubmitting(true); setError("");
    try {
      submissionCounter.current += 1;
      const submissionId = window.crypto?.randomUUID?.() || `apt-skip-${questionIndex}-${submissionCounter.current}`;
      await api.post("/api/aptitude/attempts", { questionId: currentQuestion._id, selectedAnswer: null, sessionId: session._id, submissionId, startedAt: questionStartedAt, timeSpent: elapsed });
      setSession((previous) => ({ ...previous, questions: (previous.questions || []).map((item) => item.order === questionIndex ? { ...item, status: "SKIPPED" } : item) }));
      goNext(true);
    } catch (requestError) { setError(requestError.response?.data?.message || "Unable to skip this question."); }
    finally { setSubmitting(false); }
  };

  const goNext = (force = false) => {
    if (!force && !result && !isExam) return;
    if (questionIndex + 1 < (session?.questionDetails?.length || 0)) {
      setQuestionIndex((value) => value + 1); setSelectedAnswer(null); setResult(null); setQuestionStartedAt(new Date().toISOString()); setElapsed(0); setBookmarked(false);
    } else finishSession();
  };

  const goToQuestion = (index) => {
    if (!session || index < 0 || index >= (session.questionDetails?.length || 0)) return;
    setQuestionIndex(index); setSelectedAnswer(null); setResult(null); setQuestionStartedAt(new Date().toISOString()); setElapsed(0);
  };

  const finishSession = async () => {
    if (!session) return;
    try {
      const response = await api.post(`/api/aptitude/sessions/${session._id}/submit`);
      setSummary(response.data.results); setSession(null); setTab("Overview");
      setDashboard((previous) => previous ? { ...previous, readinessScore: response.data.readinessScore ?? previous.readinessScore } : previous);
    } catch (requestError) { setError(requestError.response?.data?.message || "Unable to finish session."); }
  };

  const markForReview = async () => {
    if (!session || !currentQuestion) return;
    try {
      await api.post("/api/aptitude/sessions/mark-review", { sessionId: session._id, questionId: currentQuestion._id });
      setMarkedQuestions((previous) => new Set([...previous, questionIndex]));
      setSession((previous) => ({ ...previous, questions: (previous.questions || []).map((item) => item.order === questionIndex ? { ...item, status: "MARKED_FOR_REVIEW" } : item) }));
    } catch { setError("Unable to mark this question for review."); }
  };

  const toggleBookmark = async () => {
    if (!currentQuestion) return;
    try { const response = await api.post(`/api/aptitude/questions/${currentQuestion._id}/bookmark`); setBookmarked(response.data.bookmarked); }
    catch { setError("Unable to update bookmark."); }
  };

  if (loading) return <div className="apt-loading"><div className="apt-spinner" />Preparing your aptitude workspace...</div>;
  if (error && !dashboard && !activeSession) return <div className="apt-error-state" role="alert"><strong>Unable to load Aptitude</strong><p>{error}</p><button type="button" className="apt-btn primary" onClick={() => window.location.reload()}>Try again</button></div>;
  if (session) return <SessionViewV2 session={session} question={currentQuestion} questionIndex={questionIndex} elapsed={elapsed} isExam={isExam} hasCountdown={hasCountdown} selectedAnswer={selectedAnswer} setSelectedAnswer={setSelectedAnswer} result={result} submitting={submitting} markedQuestions={markedQuestions} questionStatuses={questionStatuses} statusCounts={statusCounts} bookmarked={bookmarked} error={error} onSubmit={submitAnswer} onSkip={skipQuestion} onNext={() => goNext()} onFinish={finishSession} onMark={markForReview} onBookmark={toggleBookmark} onQuestion={goToQuestion} onExit={() => { setSession(null); setActiveSession(session); }} />;
  if (summary) return <ResultView summary={summary} onBack={() => { setSummary(null); loadWorkspace(); }} />;

  return <div className="apt-workspace">
    <div className="apt-inner-nav">
      <div className="apt-brand"><span className="apt-brand-mark">✦</span><div><strong>Aptitude</strong><small>Placement intelligence</small></div></div>
      <nav role="tablist" aria-label="Aptitude sections">{TABS.map((item) => <button type="button" role="tab" aria-selected={tab === item} key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item}</button>)}</nav>
      <div className="apt-header-pills"><span>🔥 {dashboard?.currentStreak || 0} day streak</span><span>◆ {dashboard?.aptitudeXp || 0} XP</span></div>
    </div>
    {error && <div className="apt-alert">{error}<button onClick={() => setError("")}>×</button></div>}
    {activeSession && <div className="apt-resume-banner"><div><strong>You have an unfinished session</strong><span>Question {(activeSession.currentQuestionIndex || 0) + 1} of {activeSession.questions?.length || activeSession.questionDetails?.length || 0} is waiting for you.</span></div><button className="apt-btn primary" onClick={() => openSession(activeSession)}>Continue session <span>→</span></button></div>}
    {tab === "Overview" && <Overview dashboard={dashboard} recommendations={recommendations} revision={revision} onStart={() => startSession()} onPractice={(category) => startSession({ mode: "FOCUSED", category, totalQuestions: 10 })} onTab={setTab} starting={starting} />}
    {tab === "Practice" && <PracticeView recommendations={recommendations} starting={starting} onStart={startSession} />}
    {tab === "Mock Tests" && <MockTestsView starting={starting} onStart={requestSession} />}
    {tab === "Topics" && <TopicsView dashboard={dashboard} onPractice={(topic) => startSession({ mode: "FOCUSED", topic, totalQuestions: 10 })} />}
    {tab === "Analytics" && <AnalyticsView analytics={analytics} dashboard={dashboard} />}
    {tab === "Review" && <ReviewView mistakes={mistakes} revision={revision} onStart={startSession} />}
    {tab === "Badges" && <BadgesView badges={dashboard?.badges || []} />}
    {preflight && <TestPreflight config={preflight} starting={starting} onCancel={() => setPreflight(null)} onConfirm={() => { setPreflight(null); startSession(preflight); }} />}
  </div>;
}

function Overview({ dashboard, recommendations, revision, onStart, onPractice, onTab, starting }) {
  const accuracy = dashboard?.accuracy || 0;
  return <main className="apt-content">
    <header className="apt-page-heading"><div><span className="apt-eyebrow">Your preparation command center</span><h1>Good to see you back.</h1><p>Build the speed and accuracy you need to clear your next placement test.</p></div><button className="apt-btn primary large" onClick={onStart} disabled={starting}>{starting ? "Preparing..." : "Start daily practice"}<span>→</span></button></header>
    <section className="apt-metric-grid">
      <MetricCard label="Aptitude readiness" value={dashboard?.readinessScore ?? "—"} suffix={dashboard?.readinessScore != null ? "/100" : ""} note={dashboard?.readinessScore == null ? "Complete 10 questions to unlock" : "Based on recent performance"} tone="violet" ring />
      <MetricCard label="Accuracy" value={`${accuracy}%`} note="Across answered questions" trend={accuracy ? "Live" : "Start baseline"} tone="green" />
      <MetricCard label="Questions solved" value={dashboard?.totalAttempts || 0} note={`${dashboard?.totalSessions || 0} practice sessions`} trend={dashboard?.currentStreak ? `🔥 ${dashboard.currentStreak}d streak` : "Start your streak"} tone="cyan" />
      <MetricCard label="Average time" value={`${dashboard?.avgTimeSpent || 0}s`} note="Per answered question" trend="Keep improving" tone="amber" />
    </section>
    <section className="apt-primary-grid">
      <div className="apt-panel"><PanelHeading eyebrow="Performance snapshot" title="Topic performance" action="View all" onAction={() => onTab("Topics")} />{dashboard?.topicMastery?.length ? <div className="apt-topic-list">{dashboard.topicMastery.slice(0, 5).map((item) => <TopicRow key={`${item.category}-${item.topic}`} item={item} onClick={() => onPractice(item.category)} />)}</div> : <EmptyState title="Build your baseline" copy="Answer a few questions and your topic strengths will appear here." action="Start practice" onClick={onStart} />}</div>
      <div className="apt-panel"><PanelHeading eyebrow="Actionable insight" title="Focus area" />{dashboard?.weakTopics?.length ? <WeakArea item={dashboard.weakTopics[0]} onPractice={() => onPractice(dashboard.weakTopics[0].category)} /> : <EmptyState title="No weak areas yet" copy="Your first practice session will reveal exactly where to focus." action="Take diagnostic" onClick={onStart} />}</div>
    </section>
    <section className="apt-panel apt-recommendations"><PanelHeading eyebrow="Recommended for you" title="Your next best practice" action="Explore practice" onAction={() => onTab("Practice")} /><div className="apt-recommendation-grid">{recommendations.slice(0, 4).map((item, index) => <RecommendationCard key={item._id} item={item} index={index} onStart={() => onPractice(item.category)} />)}{!recommendations.length && <EmptyState title="Your plan starts here" copy="Start a short diagnostic and we will personalize the next questions." action="Start now" onClick={onStart} />}</div></section>
    <section className="apt-secondary-grid"><div className="apt-panel apt-daily-card"><PanelHeading eyebrow="Today’s goal" title="Small progress, every day" /><div className="apt-goal-row"><div className="apt-goal-ring"><strong>{dashboard?.dailyMission?.xpRewarded ? "✓" : "0/5"}</strong></div><div><strong>{dashboard?.dailyMission?.xpRewarded ? "Daily mission complete" : "Complete one focused practice"}</strong><p>Keep your streak alive and earn better readiness data.</p></div></div><button className="apt-text-btn" onClick={() => onTab("Practice")}>View today’s plan →</button></div><div className="apt-panel"><PanelHeading eyebrow="Revision queue" title="Don’t lose what you learned" />{revision?.dueCount ? <div className="apt-revision-callout"><strong>{revision.dueCount} topic{revision.dueCount > 1 ? "s" : ""} due for review</strong><span>Spaced revision is ready.</span><button className="apt-btn secondary" onClick={() => onTab("Review")}>Review now</button></div> : <EmptyState title="Nothing due today" copy="Mistake-based revision will appear here automatically." action="Practice mistakes" onClick={() => onTab("Review")} />}</div></section>
  </main>;
}

function PracticeView({ recommendations, starting, onStart }) { return <main className="apt-content"><PageIntro eyebrow="Practice library" title="Improve one skill at a time" copy="Choose a category, difficulty or let the adaptive engine select the right next question." /><section className="apt-category-grid">{CATEGORIES.map((category) => <button key={category.name} className="apt-category-card" onClick={() => onStart({ mode: "FOCUSED", category: category.name, totalQuestions: 10 })}><span className={`apt-category-icon ${category.tone}`}>{category.icon}</span><strong>{category.name}</strong><p>{category.description}</p><span className="apt-card-action">10 questions <b>→</b></span></button>)}</section><section className="apt-panel"><PanelHeading eyebrow="Choose your pace" title="Targeted practice" /> <div className="apt-difficulty-grid">{DIFFICULTIES.map((item) => <button key={item.label} className={`apt-difficulty-card ${item.tone}`} onClick={() => onStart({ mode: "FOCUSED", difficulty: item.label, totalQuestions: 10 })} disabled={starting}><strong>{item.label}</strong><span>{item.copy}</span><small>10 questions · adaptive feedback →</small></button>)}</div></section><section className="apt-panel"><PanelHeading eyebrow="Adaptive engine" title="Questions selected for you" /> <div className="apt-question-list">{recommendations.map((item, index) => <RecommendationCard key={item._id} item={item} index={index} onStart={() => onStart({ mode: "FOCUSED", category: item.category, topic: item.topic, totalQuestions: 8 })} />)}</div></section></main>; }

function TestPreflight({ config, starting, onCancel, onConfirm }) { const minutes = Math.round((config.timeLimitSeconds || 0) / 60); return <div className="apt-modal-backdrop" role="presentation"><section className="apt-preflight" role="dialog" aria-modal="true" aria-labelledby="apt-preflight-title"><span className="apt-category-icon violet">◷</span><span className="apt-eyebrow">Assessment preflight</span><h2 id="apt-preflight-title">Ready to start your timed test?</h2><p>This session is designed to feel like a real placement assessment. Your timer and progress are saved on the server.</p><div className="apt-preflight-stats"><div><strong>{config.totalQuestions}</strong><small>Questions</small></div><div><strong>{minutes} min</strong><small>Time limit</small></div><div><strong>{config.negativeMarking ? "Yes" : "No"}</strong><small>Negative marking</small></div></div><ul><li>You can move between questions and mark them for review.</li><li>Explanations appear after the test is submitted.</li><li>Once the timer reaches zero, no new answers can be submitted.</li></ul><div className="apt-preflight-actions"><button type="button" className="apt-btn secondary" onClick={onCancel}>Not yet</button><button type="button" className="apt-btn primary" onClick={onConfirm} disabled={starting}>{starting ? "Preparing..." : "Start test →"}</button></div></section></div>; }

function MockTestsView({ starting, onStart }) { return <main className="apt-content"><PageIntro eyebrow="Assessment center" title="Practice under real placement pressure" copy="Timed mock tests simulate the pace, structure and decision-making of an actual aptitude round." /><section className="apt-mock-grid"><MockCard tone="violet" title="Full aptitude test" copy="Balanced Quant, Logic, Verbal and DI assessment." meta="20 questions · 20 min" onClick={() => onStart({ mode: "EXAM_SIMULATION", totalQuestions: 20, timeLimitSeconds: 1200, negativeMarking: false })} disabled={starting} /><MockCard tone="cyan" title="Topic test" copy="Go deep on one category with a focused score report." meta="15 questions · 15 min" onClick={() => onStart({ mode: "EXAM_SIMULATION", totalQuestions: 15, timeLimitSeconds: 900, negativeMarking: false })} disabled={starting} /><MockCard tone="amber" title="Company pattern" copy="Prepare for the format used in common placement tests." meta="20 questions · 20 min" onClick={() => onStart({ mode: "COMPANY_PATTERN", totalQuestions: 20, timeLimitSeconds: 1200, negativeMarking: false })} disabled={starting} /></section><section className="apt-panel apt-test-rules"><PanelHeading eyebrow="Before you begin" title="How mock tests work" /><div className="apt-rule-grid"><Rule icon="◷" title="One fixed timer" copy="The server timer continues even if you refresh the page." /><Rule icon="✓" title="Review before submit" copy="Use the navigator to mark questions and return before finishing." /><Rule icon="↗" title="Actionable result" copy="See category, time and difficulty breakdowns after submission." /></div></section></main>; }

function TopicsView({ dashboard, onPractice }) { const topics = dashboard?.topicMastery || []; return <main className="apt-content"><PageIntro eyebrow="Topic map" title="Know exactly what to work on" copy="Every topic becomes clearer as you practice. Start with a weak area or explore a new skill." /><section className="apt-topic-detail-grid">{CATEGORIES.map((category) => { const rows = topics.filter((item) => item.category === category.name); return <div className="apt-panel" key={category.name}><div className="apt-topic-heading"><span className={`apt-category-icon small ${category.tone}`}>{category.icon}</span><div><strong>{category.name}</strong><small>{rows.length || 0} tracked topics</small></div></div>{rows.length ? rows.slice(0, 6).map((item) => <TopicRow key={item.topic} item={item} onClick={() => onPractice(item.topic)} />) : <EmptyState title="Not started" copy="Practice this category to unlock topic mastery." action="Start" onClick={() => onPractice(category.name)} />}</div>; })}</section></main>; }

function AnalyticsView({ analytics, dashboard }) { return <main className="apt-content"><PageIntro eyebrow="Progress intelligence" title="See how your preparation is changing" copy="Use trends to improve your strategy, not just to collect numbers." /><section className="apt-metric-grid"><MetricCard label="Accuracy" value={`${analytics?.overallAccuracy || dashboard?.accuracy || 0}%`} note="Overall answered accuracy" tone="green" /><MetricCard label="Attempts" value={analytics?.totalAttempts || dashboard?.totalAttempts || 0} note="Recorded answered questions" tone="cyan" /><MetricCard label="Readiness" value={dashboard?.readinessScore ?? "—"} suffix={dashboard?.readinessScore != null ? "/100" : ""} note="Unlocks after a baseline" tone="violet" /><MetricCard label="Weak topics" value={analytics?.weakTopics?.length || dashboard?.weakTopics?.length || 0} note="Topics needing attention" tone="danger" /></section><section className="apt-primary-grid"><div className="apt-panel"><PanelHeading eyebrow="Accuracy by topic" title="Where you are strongest" />{analytics?.topicPerformance?.length ? analytics.topicPerformance.map((item) => <TopicRow key={item.topic} item={{ ...item, masteryScore: item.accuracy, totalAttempts: item.total }} />) : <EmptyState title="Not enough data yet" copy="Complete at least five answered questions to unlock analytics." />}</div><div className="apt-panel"><PanelHeading eyebrow="Difficulty curve" title="How you handle pressure" />{analytics?.difficultyPerformance?.length ? analytics.difficultyPerformance.map((item) => <TopicRow key={item.difficulty} item={{ topic: item.difficulty, masteryScore: item.accuracy, totalAttempts: item.total, avgTimeSpent: item.avgTimeSpent }} />) : <EmptyState title="Build your baseline" copy="Difficulty insights appear after you practice." />}</div></section></main>; }

function ReviewView({ mistakes, revision, onStart }) { return <main className="apt-content"><PageIntro eyebrow="Review center" title="Turn mistakes into progress" copy="Review the reason behind each mistake, then solve a fresh question on the same concept." /><section className="apt-primary-grid"><div className="apt-panel"><PanelHeading eyebrow="Mistake intelligence" title="Why you lose marks" />{mistakes?.hasData ? <><div className="apt-mistake-list">{mistakes.breakdown.map((item) => <div key={item.type} className="apt-mistake-row"><div><strong>{item.label}</strong><small>{item.count} recent mistakes</small></div><strong>{item.percentage}%</strong><div className="apt-progress"><span style={{ width: `${item.percentage}%` }} /></div></div>)}</div><button className="apt-btn primary" onClick={() => onStart({ mode: "WEAKNESS_REVISION", topic: mistakes.focusTopic?.topic, totalQuestions: 8 })}>Practice my biggest gap →</button></> : <EmptyState title="Mistake lab is warming up" copy="Answer five questions incorrectly or correctly to begin seeing reliable patterns." action="Start practice" onClick={() => onStart({ mode: "QUICK", totalQuestions: 10 })} />}</div><div className="apt-panel"><PanelHeading eyebrow="Spaced revision" title="Due for review" />{revision?.dueCount ? <>{revision.due.map((item) => <div className="apt-due-row" key={`${item.category}-${item.topic}`}><div><strong>{item.topic}</strong><small>{item.category} · stage {item.stage + 1}</small></div><span>Due now</span></div>)}<button className="apt-btn secondary" onClick={() => onStart({ mode: "WEAKNESS_REVISION", totalQuestions: Math.min(10, revision.dueCount * 4) })}>Start revision →</button></> : <EmptyState title="No revision due" copy="Your revision queue fills automatically when you miss a concept." />}</div></section></main>; }

function BadgesView({ badges }) { return <main className="apt-content"><PageIntro eyebrow="Consistency rewards" title="Make progress visible" copy="Badges reward reliable preparation, not random guessing." /><section className="apt-badge-grid">{badges.length ? badges.map((badge) => <div className="apt-badge-card" key={badge.badgeId}><span>✦</span><strong>{badge.badgeId.replace(/^apt-/, "").replaceAll("-", " ")}</strong><small>Unlocked achievement</small></div>) : <div className="apt-panel"><EmptyState title="Your first badge is close" copy="Complete your first correct aptitude answer to unlock it." /></div>}</section></main>; }

function SessionViewV2({ session, question, questionIndex, elapsed, isExam, hasCountdown, selectedAnswer, setSelectedAnswer, result, submitting, markedQuestions, questionStatuses, statusCounts, bookmarked, error, onSubmit, onSkip, onNext, onFinish, onMark, onBookmark, onQuestion, onExit }) {
  if (!question) return <div className="apt-loading">This session has no available questions.</div>;
  const total = session.questionDetails?.length || 0;
  const expired = hasCountdown && session.expiresAt && elapsed === 0;
  const statusClass = (index) => {
    const status = questionStatuses.get(index) || "UNANSWERED";
    return `${index === questionIndex ? "current" : ""} ${status === "ANSWERED" ? "solved" : ""} ${status === "SKIPPED" ? "skipped" : ""} ${status === "MARKED_FOR_REVIEW" || markedQuestions.has(index) ? "review" : ""} ${status === "UNANSWERED" ? "unsolved" : ""}`;
  };
  const questionProgress = `Question ${questionIndex + 1} of ${total}`;
  const sessionMessage = error || (expired ? "Time is up. Submit the session to see your result." : "");
  return (
    <div className="apt-session-shell">
      <div className="apt-sr-only" role={error ? "alert" : "status"} aria-live="polite">{sessionMessage}</div>
      <header className="apt-session-header">
        <button type="button" className="apt-icon-btn" onClick={onExit} aria-label="Exit session">←</button>
        <div><strong>{isExam ? "Mock test" : "Practice session"}</strong><span>{question.category || "Aptitude"} · {question.topic}</span></div>
        <div className="apt-session-progress"><span>{questionProgress}</span><div aria-hidden="true">{Array.from({ length: total }).map((_, index) => <i key={index} className={index < questionIndex ? "done" : index === questionIndex ? "current" : ""} />)}</div></div>
        <div className={`apt-timer ${hasCountdown && elapsed < 60 ? "danger" : ""}`} role="timer" aria-label={`Elapsed time ${formatTime(elapsed)}`} aria-live="off">◷ {formatTime(elapsed)}</div>
        <button type="button" className="apt-btn secondary" onClick={onExit}>Exit</button>
      </header>
      <div className="apt-session-body">
        <article className="apt-question-panel">
          <div className="apt-question-meta"><span className={`apt-difficulty ${(question.difficulty || "medium").toLowerCase()}`}>{question.difficulty}</span><span>{question.expectedTime}s target</span><button type="button" className={bookmarked ? "active apt-inline-btn" : "apt-inline-btn"} onClick={onBookmark}>◇ {bookmarked ? "Saved" : "Save"}</button><button type="button" className="apt-inline-btn" onClick={onMark}>{markedQuestions.has(questionIndex) ? "★ Marked" : "☆ Mark for review"}</button></div>
          <h1>{question.question}</h1>
          <div className="apt-options" role="radiogroup" aria-label="Answer choices">{question.options.map((option) => { const picked = selectedAnswer === option.key; const correct = result?.isCorrect && picked; const wrong = result && picked && !result.isCorrect; return <button type="button" key={option.key} role="radio" aria-checked={picked} className={`${picked ? "selected" : ""} ${correct ? "correct" : ""} ${wrong ? "wrong" : ""}`} disabled={Boolean(result) || submitting || expired} onClick={() => setSelectedAnswer(option.key)}><span>{option.key}</span><strong>{option.text}</strong>{correct && <b>✓</b>}</button>; })}</div>
          {expired && <div className="apt-alert" role="alert">Time is up. Submit the session to see your result.</div>}
          {result && <div className={`apt-feedback ${result.isCorrect ? "success" : "error"}`} role="status" aria-live="polite"><strong>{result.isCorrect ? "Correct — nice work" : "Not quite this time"}</strong><p>{result.explanation}</p>{result.shortTrick && <small><b>Shortcut:</b> {result.shortTrick}</small>}</div>}
          {error && <div className="apt-alert" role="alert">{error}</div>}
          <footer className="apt-question-actions"><button type="button" className="apt-btn ghost" onClick={onSkip} disabled={submitting || Boolean(result) || expired}>Skip question</button>{isExam ? <button type="button" className="apt-btn primary" onClick={selectedAnswer ? onSubmit : onNext} disabled={submitting || expired}>{questionIndex + 1 === total ? "Submit test" : "Save & next"} <span>→</span></button> : <button type="button" className="apt-btn primary" onClick={result ? onNext : onSubmit} disabled={submitting || expired || (!result && !selectedAnswer)}>{result ? "Next question" : "Submit answer"} <span>→</span></button>}</footer>
        </article>
        <aside className="apt-question-sidebar"><div className="apt-side-card"><div className="apt-side-heading"><strong>Question navigator</strong><small>{statusCounts.answered} solved · {statusCounts.skipped} skipped · {statusCounts.unanswered} remaining</small></div><div className="apt-navigator" role="navigation" aria-label="Question navigator">{Array.from({ length: total }).map((_, index) => <button type="button" key={index} aria-label={`Question ${index + 1}`} aria-current={index === questionIndex ? "step" : undefined} className={statusClass(index)} onClick={() => onQuestion(index)}>{String(index + 1).padStart(2, "0")}</button>)}</div><div className="apt-legend"><span><i className="solved" /> Solved ({statusCounts.answered})</span><span><i className="skipped" /> Skipped ({statusCounts.skipped})</span><span><i className="unsolved" /> Unsolved ({statusCounts.unanswered})</span><span><i className="review" /> Review</span></div></div><div className="apt-side-card apt-side-note"><strong>{isExam ? "Mock test mode" : "Practice mode"}</strong><p>{isExam ? "Explanations unlock after you submit the test." : "Answer freely; feedback appears immediately."}</p></div><button type="button" className="apt-submit-test" onClick={onFinish}>{isExam ? "Submit test" : "Finish session"}</button></aside>
      </div>
    </div>
  );
}

function ResultView({ summary, onBack }) { return <main className="apt-content apt-result"><PageIntro eyebrow="Session complete" title="Your performance snapshot" copy="Good data creates a better next practice session." /><section className="apt-result-hero"><div><span>Your score</span><strong>{summary.accuracy}%</strong><small>{summary.totalCorrect} correct out of {summary.totalAnswered} answered</small></div><div className="apt-result-score"><span>XP earned</span><strong>+{summary.totalXpAwarded || 0}</strong></div><div className="apt-result-score"><span>Average time</span><strong>{summary.avgTimeSpent || 0}s</strong></div></section><section className="apt-metric-grid"><MetricCard label="Correct" value={summary.totalCorrect} note="Keep this momentum" tone="green" /><MetricCard label="Incorrect" value={summary.totalIncorrect} note="Review these concepts" tone="danger" /><MetricCard label="Skipped" value={summary.totalSkipped} note="Return when ready" tone="amber" /><MetricCard label="Status" value={summary.timedOut ? "Timed out" : "Complete"} note="Result saved" tone="violet" /></section><div className="apt-result-actions"><button className="apt-btn primary" onClick={onBack}>Back to overview <span>→</span></button><button className="apt-btn secondary" onClick={onBack}>Review performance</button></div></main>; }

function MetricCard({ label, value, suffix, note, trend, tone, ring }) { return <div className={`apt-metric-card ${tone}`}><div><span>{label}</span><strong>{value}<small>{suffix}</small></strong><em>{trend || note}</em></div>{ring && <div className="apt-metric-ring"><i style={{ "--score": `${Number(value) || 0}%` }} /><b>{value}</b></div>}</div>; }
function TopicRow({ item, onClick }) { const score = item.masteryScore ?? item.accuracy ?? null; return <button className="apt-topic-row" onClick={onClick}><span>{item.topic}</span><div className="apt-topic-stat"><small>{item.totalAttempts || item.total || 0} attempts</small><strong>{score == null ? "Learning" : `${score}%`}</strong></div><div className="apt-progress"><span style={{ width: `${score || 0}%` }} /></div></button>; }
function WeakArea({ item, onPractice }) { return <div className="apt-weak-area"><span className="apt-warning-icon">!</span><div><strong>{item.topic}</strong><p>Accuracy {item.masteryScore}% · average {item.avgTimeSpent || 0}s</p><small>Most recent gap detected in this topic.</small></div><button className="apt-btn primary" onClick={onPractice}>Practice now</button></div>; }
function RecommendationCard({ item, index, onStart }) { return <button className="apt-recommendation-card" onClick={onStart}><span className="apt-rec-number">0{index + 1}</span><div><div><span className={`apt-difficulty ${item.difficulty?.toLowerCase()}`}>{item.difficulty}</span><small>{item.topic} · {item.expectedTime}s</small></div><strong>{item.question}</strong><em>Recommended next →</em></div></button>; }
function MockCard({ tone, title, copy, meta, onClick, disabled }) { return <button className={`apt-mock-card ${tone}`} onClick={onClick} disabled={disabled}><span className="apt-mock-icon">◷</span><strong>{title}</strong><p>{copy}</p><small>{meta}</small><b>Configure test →</b></button>; }
function Rule({ icon, title, copy }) { return <div className="apt-rule"><span>{icon}</span><div><strong>{title}</strong><p>{copy}</p></div></div>; }
function PanelHeading({ eyebrow, title, action, onAction }) { return <div className="apt-panel-heading"><div><span className="apt-eyebrow">{eyebrow}</span><h2>{title}</h2></div>{action && <button className="apt-text-btn" onClick={onAction}>{action} →</button>}</div>; }
function PageIntro({ eyebrow, title, copy }) { return <header className="apt-page-heading compact"><div><span className="apt-eyebrow">{eyebrow}</span><h1>{title}</h1><p>{copy}</p></div></header>; }
function EmptyState({ title, copy, action, onClick }) { return <div className="apt-empty"><span>✦</span><strong>{title}</strong><p>{copy}</p>{action && <button className="apt-btn secondary" onClick={onClick}>{action} →</button>}</div>; }
function formatTime(value) { const minutes = Math.floor(value / 60); const seconds = value % 60; return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`; }
