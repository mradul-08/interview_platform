/* eslint-disable no-irregular-whitespace */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/api";
import { createCompetitiveAptitudeSession, createCompetitiveTest, getCompetitiveAttemptSubmissions, getCompetitiveResults, getCompetitiveTest, getCompetitiveTests, getMembers, joinCompetitiveTest, startCompetitiveTest } from "./api";
import { getRealtimeSocket } from "../../realtime/socket";
import "./competitiveTestBoard.css";

const TYPES = [{ value: "DSA", label: "DSA" }, { value: "APTITUDE", label: "Aptitude" }, { value: "DSA_APTITUDE", label: "DSA + Aptitude" }];

function listFromResponse(data, key) {
  if (Array.isArray(data)) return data;
  return data?.[key] || data?.data?.[key] || data?.items || [];
}

function formatDate(value) {
  if (!value) return "Not scheduled";
  return new Date(value).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

function formatClock(seconds) {
  const safe = Math.max(0, Number(seconds) || 0);
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

function participantLabel(participant) {
  return participant?.name || participant?.username || "Member";
}

function hasMorePages(data, page, itemCount, pageSize) {
  const totalPages = Number(data?.totalPages || data?.pagination?.totalPages || 0);
  return totalPages ? page < totalPages : itemCount >= pageSize;
}

function QuestionPicker({ title, searchLabel, items, selectedIds, onToggle, query, onQueryChange, loading, error, hasMore, onLoadMore, getLabel, getMeta }) {
  return <fieldset><legend>{title}  ·  {selectedIds.length} selected</legend><input className="sg-picker-search" type="search" value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder={`Search ${searchLabel.toLowerCase()}...`} aria-label={`Search ${searchLabel}`} />{error && <p className="sg-error-text" role="alert">{error}</p>}{loading && !items.length && <p className="sg-muted" role="status">Loading {searchLabel.toLowerCase()}...</p>}{!loading && !items.length && <p className="sg-muted">No {searchLabel.toLowerCase()} found.</p>}<div className="sg-choice-list">{items.map((item) => <label key={item._id} className="sg-choice"><input type="checkbox" checked={selectedIds.includes(item._id)} onChange={() => onToggle(item._id)} /><span>{getLabel(item)}</span><small>{getMeta(item)}</small></label>)}</div>{hasMore && <button type="button" className="sg-btn" disabled={loading} onClick={onLoadMore}>{loading ? "Loading..." : "Load more"}</button>}</fieldset>;
}

function ResultsWorkspace({ groupId, test, close }) {
  const [payload, setPayload] = useState(null);
  const [selectedResult, setSelectedResult] = useState(null);
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [reportError, setReportError] = useState("");
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState(false);
  const load = useCallback(async () => { setLoading(true); try { setPayload(await getCompetitiveResults(groupId, test._id)); setError(""); } catch (err) { setError(err.response?.data?.message || "Results could not be loaded."); } finally { setLoading(false); } }, [groupId, test._id]);
  useEffect(() => { load(); const socket = getRealtimeSocket(); const refresh = (event) => { if (String(event?.testId) === String(test._id)) load(); }; socket.on("group:test", refresh); socket.on("group:test-participant", refresh); socket.on("group:test-progress", refresh); socket.on("connect", refresh); return () => { socket.off("group:test", refresh); socket.off("group:test-participant", refresh); socket.off("group:test-progress", refresh); socket.off("connect", refresh); }; }, [load, test._id]);
  const openReport = async (result) => {
    setSelectedResult(result);
    setReport(null);
    setReportError("");
    if (!result.attemptId) return;
    setReportLoading(true);
    try { setReport(await getCompetitiveAttemptSubmissions(groupId, test._id, result.attemptId)); } catch (err) { setReportError(err.response?.data?.message || "Participant report details could not be loaded."); } finally { setReportLoading(false); }
  };
  const winner = (payload?.results || []).find((result) => result.rank === 1 && result.status !== "MISSED");
  const breakdownEntries = selectedResult ? Object.entries(selectedResult.categoryBreakdown || {}) : [];
  const dsaProblems = report?.dsaProblems || [];
  const aptitudeSummary = report?.aptitudeSummary;
  useEffect(() => {
    if (!selectedResult?.attemptId) return undefined;
    const socket = getRealtimeSocket();
    const refreshReport = (event) => {
      if (String(event?.testId) === String(test._id)) openReport(selectedResult);
    };
    socket.on("group:test-participant", refreshReport);
    socket.on("group:test-progress", refreshReport);
    return () => { socket.off("group:test-participant", refreshReport); socket.off("group:test-progress", refreshReport); };
  }, [selectedResult?.attemptId, test._id]);
  return <section className="sg-card sg-results-workspace" aria-live="polite">
    <div className="sg-section-head"><div><span className="sg-eyebrow">RESULTS</span><h3>{test.title}</h3><span className="sg-muted">Select a participant for the full report.</span></div><button type="button" className="sg-btn" onClick={close}>Close</button></div>
    {loading ? <p className="sg-muted" role="status">Loading results...</p> : error ? <p className="sg-error-text" role="alert">{error} <button type="button" className="sg-btn" onClick={load}>Retry</button></p> : <>
      {winner && <div className="sg-results-winner"><span className="sg-eyebrow">WINNER</span><strong>{participantLabel(winner.participant)}</strong><span>{winner.score ?? "—"} points</span></div>}
      <div className="sg-results-table-wrap"><table className="sg-results-table"><caption className="sr-only">Competitive test ranking</caption><thead><tr><th>Rank</th><th>Participant</th><th>Score</th><th>DSA</th><th>Aptitude</th><th>Status</th><th>Time</th></tr></thead><tbody>{(payload?.results || []).map((result) => <tr key={result.attemptId || result.participant?._id || result.rank} className={selectedResult?.attemptId === result.attemptId ? "is-selected" : ""} onClick={() => openReport(result)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openReport(result); } }} tabIndex="0" role="button"><td>#{result.rank || "—"}</td><td><strong>{participantLabel(result.participant)}</strong></td><td className="sg-result-score">{result.score ?? "—"}</td><td>{result.dsaScore ?? "—"}</td><td>{result.aptitudeScore ?? "—"}</td><td><span className={`sg-session-status is-${String(result.status || "").toLowerCase()}`}>{result.status}</span></td><td>{result.completionTimeSeconds != null ? formatClock(result.completionTimeSeconds) : "—"}</td></tr>)}</tbody></table>{!payload?.results?.length && <p className="sg-muted sg-results-empty">No persisted results yet.</p>}</div>
      {selectedResult && <aside className="sg-result-detail" aria-label="Participant full report"><div className="sg-section-head"><div><span className="sg-eyebrow">FULL REPORT</span><h3>{participantLabel(selectedResult.participant)}</h3></div><button type="button" className="sg-btn" onClick={() => setSelectedResult(null)}>Close report</button></div><div className="sg-report-summary"><span>Score <strong>{selectedResult.score ?? "—"}</strong></span><span>DSA <strong>{selectedResult.dsaScore ?? "—"}</strong></span><span>Aptitude <strong>{selectedResult.aptitudeScore ?? "—"}</strong></span><span>Status <strong>{selectedResult.status}</strong></span></div>{reportLoading && <p className="sg-muted" role="status">Loading participant report...</p>}{reportError && <p className="sg-error-text" role="alert">{reportError}</p>}{!reportLoading && !reportError && <><div><strong>DSA performance</strong>{dsaProblems.length ? <div className="sg-report-submissions">{dsaProblems.map((problem) => <div className="sg-report-submission" key={problem._id}><span>{problem.title}</span><span className={problem.solved ? "sg-report-accepted" : "sg-report-verdict"}>{problem.solved ? "Accepted" : "Unsolved"}</span></div>)}</div> : <p className="sg-muted">No DSA problems assigned.</p>}{report?.submissions?.length ? <small>{report.submissions.length} persisted submission{report.submissions.length === 1 ? "" : "s"}, including verdict history.</small> : null}</div><div><strong>Aptitude performance</strong>{aptitudeSummary ? <p className="sg-muted">{aptitudeSummary.answered}/{aptitudeSummary.total} answered · {aptitudeSummary.correct} correct · {aptitudeSummary.incorrect} incorrect</p> : <p className="sg-muted">No Aptitude data recorded.</p>}{breakdownEntries.length ? <div className="sg-breakdown-list">{breakdownEntries.map(([category, values]) => <span key={category}>{category}: {typeof values === "object" && values !== null ? `${values.correct ?? values.answered ?? 0}/${values.total ?? 0}` : values}</span>)}</div> : null}</div><small>Completion time: {selectedResult.completionTimeSeconds != null ? formatClock(selectedResult.completionTimeSeconds) : "—"}</small></>}</aside>}
    </>}
  </section>;
}

function LiveCompetitiveWorkspace({ groupId, test, problems, close }) {
  const navigate = useNavigate();
  const [detail, setDetail] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [serverClockOffset, setServerClockOffset] = useState(0);
  const [error, setError] = useState("");
  const [opening, setOpening] = useState(false);
  const load = useCallback(async () => {
    try {
      const nextDetail = await getCompetitiveTest(groupId, test._id);
      setDetail(nextDetail);
      const serverTime = Date.parse(nextDetail?.serverNow || "");
      if (Number.isFinite(serverTime)) setServerClockOffset(serverTime - Date.now());
      setError("");
    } catch (err) { setError(err.response?.data?.message || "Live test state could not be loaded."); }
  }, [groupId, test._id]);
  useEffect(() => {
    load();
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    const socket = getRealtimeSocket();
    const refresh = (event) => { if (String(event?.testId) === String(test._id)) load(); };
    const refreshOnConnect = () => load();
    socket.on("group:test", refresh); socket.on("group:test-participant", refresh); socket.on("group:test-progress", refresh); socket.on("connect", refreshOnConnect);
    return () => { window.clearInterval(timer); socket.off("group:test", refresh); socket.off("group:test-participant", refresh); socket.off("group:test-progress", refresh); socket.off("connect", refreshOnConnect); };
  }, [load, test._id]);
  const currentTest = detail?.test || test;
  const attempt = detail?.attempt || test.attempt;
  const canManage = Boolean(detail?.canManage ?? test.canManage);
  const isMonitoring = canManage && !attempt;
  const deadline = isMonitoring ? currentTest.endsAt : attempt?.endsAt;
  const remaining = deadline ? Math.max(0, Math.ceil((new Date(deadline).getTime() - (now + serverClockOffset)) / 1000)) : null;
  const openAptitude = async () => { setOpening(true); setError(""); try { const session = await createCompetitiveAptitudeSession(groupId, test._id); navigate(`/dashboard/aptitude/session/${session._id}`); } catch (err) { setError(err.response?.data?.message || "Aptitude session could not be opened."); } finally { setOpening(false); } };
  return <section className="sg-card sg-live-workspace" aria-live="polite">
    <div className="sg-section-head"><div><span className="sg-eyebrow">{isMonitoring ? "MANAGER MONITOR" : "TEST WORKSPACE"}</span><h3>{currentTest.title}</h3><span className="sg-muted">{isMonitoring ? "You are monitoring this test" : `You are taking this test · ${currentTest.status} · ${attempt?.status || "INVITED"}`}</span></div><div className="sg-live-timer">{remaining === null ? "--:--" : formatClock(remaining)}</div><button type="button" className="sg-btn" onClick={close}>Close</button></div>
    {error && <p className="sg-error-text" role="alert">{error}</p>}
    {isMonitoring && currentTest.status === "LIVE" && <div className="sg-live-state"><strong>Live monitor</strong><p>Participants are taking this test now. The countdown is based on the shared test deadline.</p></div>}
    {currentTest.status === "SCHEDULED" && <div className="sg-live-state"><strong>{isMonitoring ? "Monitoring scheduled test" : "Waiting for the scheduled start"}</strong><p>Scheduled for {formatDate(currentTest.scheduledAt)}.</p></div>}
    {!isMonitoring && currentTest.status === "LIVE" && attempt?.status === "JOINED" && <div className="sg-live-state sg-late-join-state"><strong>This test is live</strong><p>Your personal {Math.round(currentTest.durationSeconds / 60)}-minute timer starts when you press Start.</p><small>The server enforces your deadline in real time.</small></div>}
    {currentTest.status === "ENDED" && <div className="sg-live-state"><strong>Test ended</strong><p>Results are being finalized by the server.</p></div>}
    {currentTest.status === "RESULTS_AVAILABLE" && <div className="sg-live-state"><strong>Results are available</strong><p>Your persisted score: {attempt?.score ?? "Pending"}</p></div>}
    {isMonitoring && <LiveParticipantProgress groupId={groupId} test={test} />}
    {currentTest.status === "LIVE" && attempt?.status === "STARTED" && <div className="sg-live-content"><div><strong>DSA problems</strong>{currentTest.problemIds?.length ? currentTest.problemIds.map((problemId) => { const problem = problems.find((item) => String(item._id) === String(problemId)); return <div className="sg-live-item" key={problemId}><span>{problem?.title || `Problem ${problemId}`}</span>{problem?.slug && <button type="button" className="sg-btn" onClick={() => navigate(`/dashboard/problems/${problem.slug}?competitiveTestId=${currentTest._id}&competitiveTestAttemptId=${attempt._id}&groupId=${groupId}`)}>Open editor</button>}</div>; }) : <p className="sg-muted">No DSA problems in this test.</p>}</div><div><strong>Aptitude</strong>{currentTest.aptitudeQuestionIds?.length ? <button type="button" className="sg-btn accent" onClick={openAptitude} disabled={opening}>{opening ? "Opening..." : "Open Aptitude session"}</button> : <p className="sg-muted">No Aptitude questions in this test.</p>}</div></div>}
  </section>;
}

function LiveParticipantProgress({ groupId, test }) {
  const [detail, setDetail] = useState(null);
  const load = useCallback(async () => {
    try { setDetail(await getCompetitiveTest(groupId, test._id)); } catch { /* the main workspace owns visible errors */ }
  }, [groupId, test._id]);
  useEffect(() => {
    load();
    const socket = getRealtimeSocket();
    const refresh = (event) => { if (String(event?.testId) === String(test._id)) load(); };
    socket.on("group:test-progress", refresh);
    socket.on("group:test-participant", refresh);
    socket.on("connect", load);
    return () => { socket.off("group:test-progress", refresh); socket.off("group:test-participant", refresh); socket.off("connect", load); };
  }, [load, test._id]);
  const participants = detail?.participants || [];
  const summary = detail?.summary || { started: 0, completed: 0, missed: 0 };
  return <section className="sg-card sg-progress-panel sg-live-progress" aria-live="polite"><div className="sg-progress-heading"><strong>Group progress</strong><span>{summary.started} started  ·  {summary.completed} completed  ·  {summary.missed} missed</span></div><div className="sg-progress-list">{participants.map((participant) => <div className="sg-progress-row" key={participant.participant?._id}><div><strong>{participantLabel(participant.participant)}</strong><small>{participant.status}</small></div><span>{participant.dsa?.total ? `DSA ${participant.dsa.solved}/${participant.dsa.total}` : ""}{participant.dsa?.total && participant.aptitude?.total ? "  ·  " : ""}{participant.aptitude?.total ? `Aptitude ${participant.aptitude.answered}/${participant.aptitude.total}` : ""}</span></div>)}</div></section>;
}

function CompetitiveManagerTools({ tests, onMonitor }) {
  const manageable = tests.filter((test) => test.canManage && ["SCHEDULED", "LIVE"].includes(test.status));
  if (!manageable.length) return null;
  return <section className="sg-card sg-manager-tools"><div className="sg-section-head"><div><strong>Manager monitoring</strong><span className="sg-muted">View group progress without joining as a participant.</span></div></div><div className="sg-actions">{manageable.map((test) => <button type="button" className="sg-btn" key={test._id} onClick={() => onMonitor(test)}>Monitor {test.title}</button>)}</div></section>;
}

export default function CompetitiveTestBoard({ groupId }) {
  const boardRef = useRef(null);
  const [tests, setTests] = useState([]);
  const [testPage, setTestPage] = useState(1);
  const [testTotalPages, setTestTotalPages] = useState(1);
  const [testPageLoading, setTestPageLoading] = useState(false);
  const testPageCacheRef = useRef(new Map());
  const testPageRef = useRef(1);
  const [members, setMembers] = useState([]);
  const [problems, setProblems] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [problemQuery, setProblemQuery] = useState("");
  const [aptitudeQuery, setAptitudeQuery] = useState("");
  const [problemPage, setProblemPage] = useState(1);
  const [aptitudePage, setAptitudePage] = useState(1);
  const [problemHasMore, setProblemHasMore] = useState(false);
  const [aptitudeHasMore, setAptitudeHasMore] = useState(false);
  const [optionLoading, setOptionLoading] = useState("");
  const [optionError, setOptionError] = useState({ problems: "", aptitude: "" });
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [action, setAction] = useState("");
  const [error, setError] = useState("");
  const [activeTest, setActiveTest] = useState(null);
  const [resultsTest, setResultsTest] = useState(null);
  const [form, setForm] = useState({ title: "", description: "", type: "DSA", scheduledAt: "", durationMinutes: 45, participantIds: [], problemIds: [], aptitudeQuestionIds: [] });

  const loadTests = useCallback(async ({ background = false, force = false, page = testPageRef.current } = {}) => {
    const cached = testPageCacheRef.current.get(page);
    if (cached && !force) { testPageRef.current = page; setTests(cached.tests); setTestPage(page); setTestTotalPages(cached.pagination?.totalPages || 1); return; }
    if (background) setTestPageLoading(true);
    try {
      const response = await getCompetitiveTests(groupId, page, 10);
      const next = { tests: response.tests || [], pagination: response.pagination || {} };
      testPageCacheRef.current.set(page, next);
      const loadedPage = next.pagination.page || page; testPageRef.current = loadedPage;
      setTests(next.tests); setTestPage(loadedPage); setTestTotalPages(next.pagination.totalPages || 1);
      if (loadedPage < (next.pagination.totalPages || 1) && !testPageCacheRef.current.has(loadedPage + 1)) {
        getCompetitiveTests(groupId, loadedPage + 1, 10).then((prefetched) => testPageCacheRef.current.set(loadedPage + 1, { tests: prefetched.tests || [], pagination: prefetched.pagination || {} })).catch(() => {});
      }
      if (!background) setError("");
    } catch (err) {
      if (!background) setError(err.response?.data?.message || "Competitive tests could not be loaded.");
    } finally {
      setLoading(false); setTestPageLoading(false);
    }
  }, [groupId]);

  const loadOptionPage = useCallback(async (kind, page, query, append = false) => {
    const isProblems = kind === "problems";
    const pageSize = 20;
    setOptionLoading(kind);
    setOptionError((current) => ({ ...current, [kind]: "" }));
    try {
      const endpoint = isProblems ? "/api/problems" : "/api/aptitude/questions";
      const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
      if (query.trim()) params.set("search", query.trim());
      if (isProblems) params.set("published", "true");
      const response = await api.get(`${endpoint}?${params.toString()}`);
      const items = listFromResponse(response.data, isProblems ? "problems" : "questions");
      const setter = isProblems ? setProblems : setQuestions;
      setter((current) => {
        if (!append) return items;
        const existing = new Set(current.map((item) => String(item._id)));
        return [...current, ...items.filter((item) => !existing.has(String(item._id)))];
      });
      if (isProblems) { setProblemPage(page); setProblemHasMore(hasMorePages(response.data, page, items.length, pageSize)); }
      else { setAptitudePage(page); setAptitudeHasMore(hasMorePages(response.data, page, items.length, pageSize)); }
    } catch (err) {
      setOptionError((current) => ({ ...current, [kind]: err.response?.data?.message || `${isProblems ? "DSA problems" : "Aptitude questions"} could not be loaded.` }));
    } finally {
      setOptionLoading("");
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => loadOptionPage("problems", 1, problemQuery), 250);
    return () => window.clearTimeout(timer);
  }, [loadOptionPage, problemQuery]);

  useEffect(() => {
    const timer = window.setTimeout(() => loadOptionPage("aptitude", 1, aptitudeQuery), 250);
    return () => window.clearTimeout(timer);
  }, [loadOptionPage, aptitudeQuery]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      getMembers(groupId),
      getCompetitiveTests(groupId, 1, 10),
    ]).then(([nextMembers, response]) => {
      if (!active) return;
      setMembers(nextMembers);
      const nextTests = { tests: response.tests || [], pagination: response.pagination || {} };
      testPageCacheRef.current.set(1, nextTests);
      testPageRef.current = 1;
      setTests(nextTests.tests); setTestPage(1); setTestTotalPages(nextTests.pagination.totalPages || 1);
      setError("");
    }).catch((err) => active && setError(err.response?.data?.message || "Competitive test setup data could not be loaded.")).finally(() => active && setLoading(false));
    const socket = getRealtimeSocket();
    const refresh = (event) => { if (!event?.groupId || String(event.groupId) === String(groupId)) loadTests({ background: true, force: true }); };
    socket.on("group:test", refresh);
    socket.on("group:test-participant", refresh);
    return () => { active = false; socket.off("group:test", refresh); socket.off("group:test-participant", refresh); };
  }, [groupId, loadTests]);

  const needsDsa = form.type !== "APTITUDE";
  const needsAptitude = form.type !== "DSA";
  const toggle = (field, value) => setForm((current) => ({ ...current, [field]: current[field].includes(value) ? current[field].filter((item) => item !== value) : [...current[field], value] }));
  const selectedMembers = useMemo(() => new Set(form.participantIds), [form.participantIds]);
  const currentUserId = (() => { try { const user = JSON.parse(localStorage.getItem("user") || "{}"); return String(user._id || user.id || user.userId || ""); } catch { return ""; } })();
  const requiredParticipantIds = useMemo(() => members.map((member) => ({ member, value: String(member.userId?._id || member.userId) })).filter(({ member, value }) => member.role === "OWNER" || value === currentUserId).map(({ value }) => value), [currentUserId, members]);
  useEffect(() => {
    if (!requiredParticipantIds.length) return;
    setForm((current) => {
      const participantIds = [...new Set([...current.participantIds, ...requiredParticipantIds])];
      return participantIds.length === current.participantIds.length ? current : { ...current, participantIds };
    });
  }, [requiredParticipantIds]);

  const submit = async (event) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true); setError("");
    try {
      const participantIds = [...new Set([...form.participantIds, ...requiredParticipantIds])];
      await createCompetitiveTest(groupId, { ...form, participantIds, problemIds: needsDsa ? form.problemIds : [], aptitudeQuestionIds: needsAptitude ? form.aptitudeQuestionIds : [], durationSeconds: Number(form.durationMinutes) * 60, scheduledAt: new Date(form.scheduledAt).toISOString() });
      setForm({ title: "", description: "", type: "DSA", scheduledAt: "", durationMinutes: 45, participantIds: requiredParticipantIds, problemIds: [], aptitudeQuestionIds: [] });
      setOpen(false);
      testPageCacheRef.current.clear();
      await loadTests({ background: true, force: true, page: 1 });
    } catch (err) { setError(err.response?.data?.message || "Competitive test could not be scheduled."); } finally { setSaving(false); }
  };

  const runAction = async (test, kind) => {
    setAction(`${test._id}:${kind}`); setError("");
    try {
      const response = kind === "join"
        ? await joinCompetitiveTest(groupId, test._id)
        : await startCompetitiveTest(groupId, test._id);
      await loadTests({ background: true, force: true });
      if (kind === "start") {
        setActiveTest({ ...test, status: "LIVE", attempt: response?.attempt || { ...test.attempt, status: "STARTED" } });
      }
    }
    catch (err) { setError(err.response?.data?.message || "Competitive test action could not be completed."); }
    finally { setAction(""); }
  };

  return <section ref={boardRef} className="sg-card sg-competitive-board" aria-labelledby="competitive-tests-heading">
    <div className="sg-section-head"><div><span className="sg-eyebrow">LIVE PRACTICE</span><h2 id="competitive-tests-heading">Competitive tests</h2><span className="sg-muted">Run a real timed DSA or Aptitude test with this group.</span></div><button type="button" className="sg-btn accent" onClick={() => setOpen((value) => !value)}>{open ? "Close setup" : "Create test"}</button></div>
    {open && <form className="sg-competitive-form" onSubmit={submit}>
      <label className="sg-field"><span>TEST TITLE</span><input required maxLength="140" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="e.g. Graphs sprint" /></label>
      <label className="sg-field"><span>DESCRIPTION</span><textarea maxLength="2000" rows="2" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="What should the group focus on?" /></label>
      <div className="sg-competitive-grid"><label className="sg-field"><span>TYPE</span><select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value, problemIds: [], aptitudeQuestionIds: [] })}>{TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><label className="sg-field"><span>START TIME</span><input required type="datetime-local" value={form.scheduledAt} onChange={(event) => setForm({ ...form, scheduledAt: event.target.value })} /></label><label className="sg-field"><span>DURATION (MINUTES)</span><input required min="1" max="1440" type="number" value={form.durationMinutes} onChange={(event) => setForm({ ...form, durationMinutes: event.target.value })} /><small className="sg-muted">At least 1 minute; the server enforces the deadline.</small></label></div>
      <fieldset><legend>PARTICIPANTS</legend><div className="sg-choice-list">{members.map((member) => { const user = member.userId || {}; const value = String(user._id || member.userId); return <label key={member._id} className={`sg-choice ${member.role === "OWNER" || value === currentUserId ? "is-locked" : ""}`} title={member.role === "OWNER" ? "Group owner is always included" : value === currentUserId ? "You are always included" : undefined}><input type="checkbox" checked={selectedMembers.has(value) || member.role === "OWNER" || value === currentUserId} disabled={member.role === "OWNER" || value === currentUserId} onChange={() => toggle("participantIds", value)} /><span>{user.name || user.username || "Member"}</span>{(member.role === "OWNER" || value === currentUserId) && <small>Always included</small>}</label>; })}</div></fieldset>
      {needsDsa && <QuestionPicker title="DSA PROBLEMS" searchLabel="DSA problems" items={problems} selectedIds={form.problemIds} onToggle={(value) => toggle("problemIds", value)} query={problemQuery} onQueryChange={setProblemQuery} loading={optionLoading === "problems"} error={optionError.problems} hasMore={problemHasMore} onLoadMore={() => loadOptionPage("problems", problemPage + 1, problemQuery, true)} getLabel={(problem) => problem.title || problem.name || "Problem"} getMeta={(problem) => problem.difficulty || ""} />}
      {needsAptitude && <QuestionPicker title="APTITUDE QUESTIONS" searchLabel="Aptitude questions" items={questions} selectedIds={form.aptitudeQuestionIds} onToggle={(value) => toggle("aptitudeQuestionIds", value)} query={aptitudeQuery} onQueryChange={setAptitudeQuery} loading={optionLoading === "aptitude"} error={optionError.aptitude} hasMore={aptitudeHasMore} onLoadMore={() => loadOptionPage("aptitude", aptitudePage + 1, aptitudeQuery, true)} getLabel={(question) => question.question || "Aptitude question"} getMeta={(question) => question.difficulty || question.topic || ""} />}
      <button type="submit" className="sg-btn accent" disabled={saving}>{saving ? "Scheduling..." : "Schedule competitive test"}</button>
    </form>}
    {error && <p className="sg-error-text" role="alert">{error}</p>}
    {loading ? <p className="sg-muted" role="status">Loading competitive tests...</p> : tests.length ? <div className="sg-competitive-list">{tests.map((test) => <article className="sg-competitive-item" key={test._id}><div><div className="sg-competitive-title"><strong>{test.title}</strong><span className={`sg-session-status is-${String(test.status || "").toLowerCase()}`}>{test.status}</span></div><small>{test.type.replace("_", " + ")}  ·  {formatDate(test.scheduledAt)}  ·  {Math.round(test.durationSeconds / 60)} min</small><p>{test.attempt?.status || "INVITED"} {test.attempt?.score != null ? ` ·  score ${test.attempt.score}` : ""}</p></div><div className="sg-actions">{test.attempt?.status === "INVITED" && <button type="button" className="sg-btn" disabled={Boolean(action)} onClick={() => runAction(test, "join")}>{action === `${test._id}:join` ? "Joining..." : "Join"}</button>}{test.attempt?.status === "JOINED" && test.status === "LIVE" && <button type="button" className="sg-btn accent" disabled={Boolean(action)} onClick={() => runAction(test, "start")}>{action === `${test._id}:start` ? "Starting..." : "Start"}</button>}{test.attempt?.status === "STARTED" && <button type="button" className="sg-btn accent" onClick={() => setActiveTest(test)}>Open test</button>}{test.status === "RESULTS_AVAILABLE" && <button type="button" className="sg-btn accent" onClick={() => setResultsTest(test)}>View results</button>}</div></article>)}</div> : <div className="sg-task-state"><strong>No competitive tests scheduled</strong><p>Create a focused group test for your study group.</p><button type="button" className="sg-btn accent" onClick={() => setOpen(true)}>Create test</button></div>}
    {testTotalPages > 1 && <div className="sg-pagination" aria-label="Competitive test pages"><button type="button" className="sg-btn" disabled={testPage <= 1 || testPageLoading} onClick={() => loadTests({ page: testPage - 1 })}>Previous</button><span className="sg-muted">Page {testPage} of {testTotalPages}</span><button type="button" className="sg-btn" disabled={testPage >= testTotalPages || testPageLoading} onClick={() => loadTests({ page: testPage + 1 })}>Next</button></div>}
    {activeTest && <LiveCompetitiveWorkspace groupId={groupId} test={activeTest} problems={problems} close={() => setActiveTest(null)} />}
    <CompetitiveManagerTools tests={tests} onMonitor={setActiveTest} />
    {resultsTest && <ResultsWorkspace groupId={groupId} test={resultsTest} close={() => setResultsTest(null)} />}
  </section>;
}
