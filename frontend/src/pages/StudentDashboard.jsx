// src/pages/StudentDashboard.jsx
// Proper nested routing — all sub-pages work, problems navigate correctly
import { useState, useEffect, useRef } from "react";
import { useNavigate, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Track } from "livekit-client";
import { useDashboard } from "../hooks/useDashboard";
import api from "../api/api";
import { getRealtimeSocket } from "../realtime/socket";
import { Bookmark, ExternalLink, X, Mic, MicOff, Camera, CameraOff, PhoneOff, Maximize2 } from "lucide-react";
import Sidebar from "../layout/Sidebar";
import Topbar from "../layout/Topbar";
import { useMockInterviewCall, leaveMockInterviewCall, toggleMockInterviewMic, toggleMockInterviewCamera } from "../features/mock-interviews/api";
import "../features/mock-interviews/mockInterviews.css";
import "../features/mock-interviews/mockInterviewPip.css";

// â”€â”€ Page imports (create each of these files) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
import Overview from "./dashboard/Overview";
import ProblemsPage from "./dashboard/ProblemsPage";
import ProblemDetailPage from "./dashboard/ProblemDetailPage";
import SheetsPage from "./dashboard/SheetsPage";
import MessagesPage from "./dashboard/MessagesPage";
import LeaderboardPage from "./dashboard/LeaderboardPage";
import AptitudeRoutes from "../features/aptitude/AptitudeRoutes";
import MockInterviewsPage from "../features/mock-interviews/MockInterviewsPage";
import MockInterviewRoom from "../features/mock-interviews/MockInterviewRoom";
import MockInterviewJoinPage from "../features/mock-interviews/MockInterviewJoinPage";
import ErrorBoundary from "../components/ErrorBoundary";
import GeminiStudyGroups from "../features/study-groups-gemini/StudyGroupsPage";
import GeminiStudyGroupDetailsEntry from "../features/study-groups-gemini/StudyGroupDetailsEntry";
import MemberProfilePage from "../features/study-groups-gemini/MemberProfilePage";
import GeminiStudyGroupCreate from "../features/study-groups-gemini/StudyGroupCreatePage";
import GeminiStudyGroupJoin from "../features/study-groups-gemini/StudyGroupJoinPage";
import GeminiStudyGroupInvite from "../features/study-groups-gemini/StudyGroupInvitePage";
import ProfilePage from "../features/profile/ProfilePage";
import PublicProfilePage from "../features/profile/PublicProfilePage";

// â”€â”€ Generic placeholder for pages not yet built â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ComingSoonPage({ title, description }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
      <div style={{ textAlign: "center", maxWidth: 380 }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: "var(--accent-soft)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-strong)" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)", margin: "0 0 8px", letterSpacing: "-0.02em" }}>{title}</h2>
        <p style={{ fontSize: 13.5, color: "var(--text-tertiary)", margin: "0 0 20px", lineHeight: 1.6 }}>
          {description || "This feature is being built. Check back soon!"}
        </p>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 14px", borderRadius: 100, background: "var(--accent-soft)", border: "1px solid var(--accent)", fontSize: 11.5, color: "var(--accent-strong)", fontWeight: 600 }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--accent)" }} />
          Coming Soon
        </div>
      </div>
    </div>
  );
}

function BookmarksPage() {
  const navigate = useNavigate();
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [sort, setSort] = useState("recent");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const pageCacheRef = useRef(new Map());

  useEffect(() => {
    const socket = getRealtimeSocket();
    const onBookmark = (event) => {
      const problem = event?.problem;
      const problemId = String(problem?._id || "");
      if (!problemId) return;
      pageCacheRef.current.clear();
      const matches = !search && (!difficulty || problem.difficulty === difficulty);
      setBookmarks((current) => {
        const index = current.findIndex((item) => String(item._id) === problemId);
        if (!event.bookmarked) return index === -1 ? current : current.filter((item) => String(item._id) !== problemId);
        if (index === -1) return matches && page === 1 ? [problem, ...current].slice(0, 12) : current;
        const next = [...current];
        next[index] = { ...next[index], ...problem };
        return next;
      });
      if (!event.bookmarked && bookmarks.some((item) => String(item._id) === problemId)) setTotal((value) => Math.max(0, value - 1));
      if (event.bookmarked && matches && page === 1 && !bookmarks.some((item) => String(item._id) === problemId)) setTotal((value) => value + 1);
    };
    socket.on("problem:bookmark-updated", onBookmark);
    return () => { socket.off("problem:bookmark-updated", onBookmark); };
  }, [bookmarks, difficulty, page, search]);

  useEffect(() => {
    const timer = window.setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 250);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    let active = true;
    const key = JSON.stringify({ page, search, difficulty, sort });
    const cached = pageCacheRef.current.get(key);
    if (cached) {
      setBookmarks(cached.bookmarks);
      setTotal(cached.total);
      setTotalPages(cached.totalPages);
      setLoading(false);
    } else {
      setLoading((value) => value || (page === 1 && !search && !difficulty));
    }
    const loadPage = async (targetPage, updateVisible) => {
      const response = await api.get("/api/problems/bookmarks", { params: { page: targetPage, limit: 12, search, difficulty, sort } });
      const data = { bookmarks: Array.isArray(response.data?.bookmarks) ? response.data.bookmarks : [], total: Number(response.data?.total) || 0, totalPages: Number(response.data?.totalPages) || 1 };
      pageCacheRef.current.set(JSON.stringify({ page: targetPage, search, difficulty, sort }), data);
      if (active && updateVisible) { setBookmarks(data.bookmarks); setTotal(data.total); setTotalPages(data.totalPages); setError(""); setLoading(false); }
      return data;
    };
    loadPage(page, true).then((data) => {
      if (active && data.totalPages > page) loadPage(page + 1, false).catch(() => {});
    }).catch((requestError) => {
      if (active) { setError(requestError.response?.data?.message || "Bookmarks could not be loaded."); setLoading(false); }
    });
    return () => { active = false; };
  }, [page, search, difficulty, sort]);

  const removeBookmark = async (problemId) => {
    if (busyId) return;
    const previous = bookmarks;
    const previousTotal = total;
    setBusyId(String(problemId));
    setBookmarks((current) => current.filter((item) => String(item._id) !== String(problemId)));
    try {
      await api.delete(`/api/problems/${problemId}/bookmark`);
    } catch (requestError) {
      setBookmarks(previous);
      setTotal(previousTotal);
      setError(requestError.response?.data?.message || "Bookmark could not be removed.");
    } finally {
      setBusyId("");
    }
  };

  return <main className="cv-page-shell" style={{ maxWidth: 1040, margin: "0 auto" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16, marginBottom: 24 }}>
      <div><span className="study-eyebrow"><Bookmark size={13} /> Saved problems</span><h1 style={{ margin: "8px 0 5px", color: "var(--text-primary)" }}>Bookmarks</h1><p style={{ margin: 0, color: "var(--text-tertiary)", fontSize: 13 }}>Keep the problems you want to revisit close at hand.</p></div>
      <span style={{ color: "var(--text-tertiary)", fontSize: 12, fontFamily: "var(--font-mono)" }}>{total} saved</span>
    </div>
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
      <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search title, topic, tag, company or slug..." aria-label="Search bookmarks" style={{ flex: "1 1 320px", minWidth: 220, padding: "10px 13px", borderRadius: 9, border: "1px solid var(--border-default)", background: "var(--bg-elevated)", color: "var(--text-primary)", outline: "none" }} />
      <select value={difficulty} onChange={(event) => { setDifficulty(event.target.value); setPage(1); }} aria-label="Filter bookmarks by difficulty" style={{ padding: "10px 12px", borderRadius: 9, border: "1px solid var(--border-default)", background: "var(--bg-elevated)", color: "var(--text-primary)" }}><option value="">All difficulties</option><option value="Easy">Easy</option><option value="Medium">Medium</option><option value="Hard">Hard</option></select>
      <select value={sort} onChange={(event) => { setSort(event.target.value); setPage(1); }} aria-label="Sort bookmarks" style={{ padding: "10px 12px", borderRadius: 9, border: "1px solid var(--border-default)", background: "var(--bg-elevated)", color: "var(--text-primary)" }}><option value="recent">Recently saved</option><option value="title">Title A–Z</option><option value="difficulty">Difficulty</option></select>
    </div>
    {error && <div role="alert" className="study-empty" style={{ marginBottom: 16 }}><strong>{error}</strong></div>}
    {loading ? <div className="study-loading">Loading bookmarks…</div> : bookmarks.length === 0 ? <div className="study-empty" style={{ padding: 56, textAlign: "center" }}><Bookmark size={28} color="var(--accent-strong)" /><strong style={{ display: "block", marginTop: 12, color: "var(--text-primary)" }}>{search || difficulty ? "No bookmarks match your filters" : "No saved problems yet"}</strong><span>{search || difficulty ? "Try a different search or filter." : "Bookmark a problem while practicing and it will appear here instantly."}</span><button type="button" className="study-secondary" style={{ marginTop: 16 }} onClick={() => navigate("/dashboard/problems")}>Browse problems</button></div> : <><div style={{ display: "grid", gap: 12 }}>{bookmarks.map((problem) => <article key={problem._id} style={{ display: "flex", alignItems: "center", gap: 16, padding: 18, borderRadius: 14, border: "1px solid var(--border-subtle)", background: "var(--bg-surface)" }}><div style={{ flex: 1, minWidth: 0 }}><div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}><h2 style={{ margin: 0, color: "var(--text-primary)", fontSize: 15 }}>{problem.title}</h2><span style={{ padding: "3px 8px", borderRadius: 6, background: "var(--accent-soft)", color: "var(--accent-strong)", fontSize: 11, fontFamily: "var(--font-mono)" }}>{problem.difficulty}</span></div><div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 9 }}>{(problem.topic || []).slice(0, 4).map((topic) => <span key={topic} style={{ color: "var(--text-tertiary)", fontSize: 11 }}>{topic}</span>)}</div></div><button type="button" className="study-secondary" onClick={() => navigate(`/dashboard/problems/${problem.slug}`)}><ExternalLink size={14} /> Open</button><button type="button" aria-label={`Remove ${problem.title} bookmark`} disabled={busyId === String(problem._id)} onClick={() => removeBookmark(problem._id)} style={{ border: 0, background: "transparent", color: "var(--text-tertiary)", cursor: "pointer", opacity: busyId === String(problem._id) ? 0.5 : 1 }}><X size={17} /></button></article>)}</div><div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, marginTop: 22 }}><button type="button" className="study-secondary" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Previous</button><span style={{ color: "var(--text-tertiary)", fontSize: 12 }}>Page {page} of {totalPages}</span><button type="button" className="study-secondary" disabled={page >= totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}>Next</button></div></>}
  </main>;
}

// â”€â”€ Page title map (for topbar) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const PAGE_TITLES = {
  "/dashboard": "Overview",
  "/dashboard/problems": "Problems",
  "/dashboard/sheets": "DSA Sheets",
  "/dashboard/aptitude": "Aptitude",
  "/dashboard/mock": "Mock Interviews",
  "/dashboard/contests": "Contests",
  "/dashboard/leaderboard": "Leaderboard",
  "/dashboard/groups": "Study Groups",
  "/dashboard/messages": "Messages",
  "/dashboard/bookmarks": "Bookmarks",
  "/dashboard/profile": "Profile",
};

function PiPCallWidget({ currentPath }) {
  const call = useMockInterviewCall();
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const onRoomPage = currentPath === `/dashboard/mock/${call.interviewId}`;
  const screenTrack = call.tracks.find((x) => x.source === Track.Source.ScreenShare && x.track.kind === Track.Kind.Video);
  const previewTrack = !screenTrack && (call.tracks.find((x) => x.source !== Track.Source.ScreenShare && x.track.kind === Track.Kind.Video && x.participant.isLocal)
    || call.tracks.find((x) => x.source !== Track.Source.ScreenShare && x.track.kind === Track.Kind.Video));
  const previewName = previewTrack?.participant?.name || call.tracks.find((x) => x.participant?.name)?.participant?.name || "Participant";
  useEffect(() => {
    const element = videoRef.current;
    if (!element || !previewTrack) return undefined;
    previewTrack.track.attach(element);
    return () => previewTrack.track.detach(element);
  }, [previewTrack]);
  if (!(call.status === "connected" || call.status === "connecting") || onRoomPage) return null;
  const remainingLabel = call.remaining === null ? "In progress" : `${Math.floor(call.remaining / 60).toString().padStart(2, "0")}:${(call.remaining % 60).toString().padStart(2, "0")} left`;
  const screenSharing = Boolean(screenTrack);
  return <div className="mi-pip" role="complementary" aria-label="Ongoing mock interview"><div className="mi-pip-video" onClick={() => navigate(`/dashboard/mock/${call.interviewId}`)}>{previewTrack ? <video ref={videoRef} autoPlay playsInline muted /> : <div className="mi-pip-placeholder"><span className="mi-pip-avatar">{previewName.charAt(0).toUpperCase()}</span><small>{previewName}</small></div>}{screenSharing && <span className="mi-pip-badge">Sharing screen</span>}</div><div className="mi-pip-info"><strong>{call.interview?.title || "Mock interview"}</strong><small>{call.status === "connecting" ? "Connecting…" : remainingLabel}</small></div><div className="mi-pip-controls"><button className={call.micEnabled ? "mi-icon-btn" : "mi-icon-btn off"} onClick={toggleMockInterviewMic} aria-label={call.micEnabled ? "Mute" : "Unmute"}>{call.micEnabled ? <Mic size={14} /> : <MicOff size={14} />}</button><button className={call.cameraEnabled ? "mi-icon-btn" : "mi-icon-btn off"} onClick={toggleMockInterviewCamera} aria-label={call.cameraEnabled ? "Stop video" : "Start video"}>{call.cameraEnabled ? <Camera size={14} /> : <CameraOff size={14} />}</button><button className="mi-icon-btn" onClick={() => navigate(`/dashboard/mock/${call.interviewId}`)} aria-label="Return to interview"><Maximize2 size={14} /></button><button className="mi-icon-btn off" onClick={leaveMockInterviewCall} aria-label="Leave interview"><PhoneOff size={14} /></button></div></div>;
}

export default function StudentDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data, loading, error, refetch } = useDashboard();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) navigate("/login");
    (async () => {
      try {
        const res = await api.get("/api/auth/me");
        setProfile(res.data?.profile || null);
      } catch {
        setProfile(null);
      }
    })();
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setMobileSidebarOpen(false);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [navigate]);

  // Derive page title from route
  const path = location.pathname;
  const isOverviewRoute = path === "/dashboard";
  const isProblemDetail = path.match(/^\/dashboard\/problems\/.+/);
  const pageTitle = isProblemDetail
    ? "Problems"
    : PAGE_TITLES[path]
      || (path.startsWith("/dashboard/aptitude/") ? "Aptitude" : null)
      || (path.startsWith("/dashboard/groups/") ? "Study Groups" : null)
      || (path.startsWith("/dashboard/profile/") ? "Profile" : null)
      || "CodeVerse";

  // Problem detail gets full-height layout (no inner padding)
  const isFullHeight = isProblemDetail;

  return (
    <div className="cv-app-shell" style={{ display: "flex", minHeight: "100vh", fontFamily: "var(--font-sans)" }}>

      <PiPCallWidget currentPath={path} />

      {!isMobile && (
        <Sidebar user={data?.user} collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} mobile={false} />
      )}
      {isMobile && mobileSidebarOpen && (
        <Sidebar user={data?.user} collapsed={false} setCollapsed={() => {}} mobile={true} onClose={() => setMobileSidebarOpen(false)} />
      )}

      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
        <Topbar
          user={data?.user}
          stats={data?.stats}
          pageTitle={pageTitle}
          onMenuClick={() => isMobile ? setMobileSidebarOpen(o => !o) : setSidebarCollapsed(c => !c)}
        />
        {profile && (
          <div className="cv-card cv-dashboard-profile-strip">
            Signed in as <strong>{profile.fullName || profile.companyName || profile.email || data?.user?.name}</strong>
          </div>
        )}

        {/* Loading / error state */}
        {loading && isOverviewRoute && (
          <div className="cv-dashboard-state" role="status" aria-live="polite">
            <div className="cv-dashboard-state-content">
              <div style={{ width: 32, height: 32, borderRadius: "50%", border: "2px solid var(--border-strong)", borderTop: "2px solid var(--accent)", animation: "cv-spin 0.7s linear infinite", margin: "0 auto 12px" }} />
              <strong>Loading your dashboard</strong>
              <p>Preparing your progress and recommendations.</p>
            </div>
            <style>{`@keyframes cv-spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}
        {error && isOverviewRoute && (
          <div className="cv-dashboard-state" role="alert">
            <div className="cv-dashboard-state-content">
              <strong>Dashboard unavailable</strong>
              <p>{error}</p>
              <button type="button" className="study-secondary" onClick={() => refetch()}>Try again</button>
            </div>
          </div>
        )}

        {/* Routes — only render when data is ready (or not needed) */}
        {(!isOverviewRoute || (!loading && !error)) && (
          <main className={`cv-dashboard-main${isFullHeight ? " cv-dashboard-main-full-height" : ""}`}>
            <ErrorBoundary key={path} title="This section hit an error" description="Something failed to render on this page. Try again, or go back and reopen it.">
            <Routes>
              {/* Overview needs dashboard data */}
              <Route index element={data ? <Overview data={data} /> : <div className="study-empty"><strong>Dashboard data is unavailable.</strong><span>Check your session and try loading the dashboard again.</span><button type="button" className="study-secondary" onClick={() => refetch()}>Retry dashboard</button></div>} />

              {/* Problems — independent API, no dashboard data needed */}
              <Route path="problems" element={<ProblemsPage />} />
              <Route path="problems/:slug" element={<ProblemDetailPage />} />

              {/* DSA Sheets */}
              <Route path="sheets" element={<SheetsPage />} />

              {/* Aptitude */}
              <Route path="aptitude/*" element={<AptitudeRoutes />} />

              {/* Mock Interviews */}
              <Route path="mock" element={<MockInterviewsPage />} />
              <Route path="mock/join/:joinCode" element={<MockInterviewJoinPage />} />
              <Route path="mock/:interviewId" element={<MockInterviewRoom />} />

              {/* Contests */}
              <Route path="contests" element={<ComingSoonPage title="Contests" description="Participate in platform contests and live competitive events." />} />

              {/* Leaderboard */}
              <Route path="leaderboard" element={<LeaderboardPage />} />

              {/* Keep old Network bookmarks safe without exposing the removed placeholder. */}
              <Route path="network" element={<Navigate to="/dashboard" replace />} />

              {/* Gemini Study Groups */}
              <Route path="study-groups-gemini/*" element={<Navigate to="/dashboard/groups" replace />} />
              <Route path="groups" element={<GeminiStudyGroups />} />
              <Route path="groups/create" element={<GeminiStudyGroupCreate />} />
              <Route path="groups/join" element={<GeminiStudyGroupJoin />} />
              <Route path="groups/invite/:token" element={<GeminiStudyGroupInvite />} />
              <Route path="groups/:groupId" element={<GeminiStudyGroupDetailsEntry />} />
              <Route path="groups/:groupId/members/:memberId" element={<MemberProfilePage />} />

              {/* Messages */}
              <Route path="messages" element={<MessagesPage />} />

              {/* Bookmarks */}
              <Route path="bookmarks" element={<BookmarksPage />} />

              {/* Profile */}
              <Route path="profile/:username" element={<PublicProfilePage />} />
              <Route path="profile" element={<ProfilePage />} />

              {/* Keep old Settings bookmarks safe without exposing the removed page. */}
              <Route path="settings" element={<Navigate to="/dashboard" replace />} />
            </Routes>
            </ErrorBoundary>
          </main>
        )}
      </div>
    </div>
  );
}
