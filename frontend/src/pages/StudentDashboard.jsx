// src/pages/StudentDashboard.jsx
// Proper nested routing — all sub-pages work, problems navigate correctly
import { useState, useEffect } from "react";
import { useNavigate, Routes, Route, useLocation } from "react-router-dom";
import { useDashboard } from "../hooks/useDashboard";
import api from "../api/api";
import Sidebar from "../layout/Sidebar";
import Topbar from "../layout/Topbar";

// â”€â”€ Page imports (create each of these files) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
import Overview from "./dashboard/Overview";
import ProblemsPage from "./dashboard/ProblemsPage";
import ProblemDetailPage from "./dashboard/ProblemDetailPage";
import SheetsPage from "./dashboard/SheetsPage";
import SecuritySettings from "./dashboard/SecuritySettings";
import MessagesPage from "./dashboard/MessagesPage";
import LeaderboardPage from "./dashboard/LeaderboardPage";
import AptitudeRoutes from "../features/aptitude/AptitudeRoutes";
import ErrorBoundary from "../components/ErrorBoundary";

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

// â”€â”€ Page title map (for topbar) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const PAGE_TITLES = {
  "/dashboard": "Overview",
  "/dashboard/problems": "Problems",
  "/dashboard/sheets": "DSA Sheets",
  "/dashboard/aptitude": "Aptitude",
  "/dashboard/mock": "Mock Interviews",
  "/dashboard/contests": "Contests",
  "/dashboard/leaderboard": "Leaderboard",
  "/dashboard/network": "Network",
  "/dashboard/messages": "Messages",
  "/dashboard/bookmarks": "Bookmarks",
  "/dashboard/profile": "Profile",
  "/dashboard/settings": "Settings",
};

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
    : PAGE_TITLES[path] || "CodeVerse";

  // Problem detail gets full-height layout (no inner padding)
  const isFullHeight = isProblemDetail;

  return (
    <div className="cv-app-shell" style={{ display: "flex", minHeight: "100vh", fontFamily: "var(--font-sans)" }}>

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
          <div className="cv-card" style={{ margin: "0 28px 16px", padding: "12px 16px", borderRadius: 14, color: "var(--text-secondary)", fontSize: 13 }}>
            Signed in as <strong>{profile.fullName || profile.companyName || profile.email || data?.user?.name}</strong>
          </div>
        )}

        {/* Loading / error state */}
        {loading && isOverviewRoute && (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", border: "2px solid var(--border-strong)", borderTop: "2px solid var(--accent)", animation: "cv-spin 0.7s linear infinite", margin: "0 auto 12px" }} />
              <p style={{ color: "var(--text-tertiary)", fontSize: 13, margin: 0 }}>Loading your dashboard…</p>
            </div>
            <style>{`@keyframes cv-spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}
        {error && isOverviewRoute && (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ textAlign: "center" }}>
              <p style={{ color: "var(--red)", fontSize: 13, marginBottom: 12 }}>{error}</p>
              <button type="button" className="study-secondary" onClick={() => refetch()}>Try again</button>
            </div>
          </div>
        )}

        {/* Routes — only render when data is ready (or not needed) */}
        {(!isOverviewRoute || (!loading && !error)) && (
          <main style={{ flex: 1, overflowY: isFullHeight ? "hidden" : "auto", padding: isFullHeight ? 0 : "24px 28px" }}>
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
              <Route path="mock" element={<ComingSoonPage title="Mock Interviews" description="Schedule real-time mock interviews with peers. Get scored on coding, communication, and confidence." />} />

              {/* Contests */}
              <Route path="contests" element={<ComingSoonPage title="Contests" description="Participate in platform contests and live competitive events." />} />

              {/* Leaderboard */}
              <Route path="leaderboard" element={<LeaderboardPage />} />

              {/* Network */}
              <Route path="network" element={<ComingSoonPage title="Network" description="Connect with peers, seniors, and company recruiters. Expand your placement network." />} />

              {/* Messages */}
              <Route path="messages" element={<MessagesPage />} />

              {/* Bookmarks */}
              <Route path="bookmarks" element={<ComingSoonPage title="Bookmarks" description="All problems you've saved for later, organized by difficulty and topic." />} />

              {/* Profile */}
              <Route path="profile" element={<ComingSoonPage title="Profile" description="Your public coding profile — submissions, stats, achievements, and resume." />} />

              {/* Settings */}
              <Route path="settings" element={<SecuritySettings />} />
            </Routes>
            </ErrorBoundary>
          </main>
        )}
      </div>
    </div>
  );
}
