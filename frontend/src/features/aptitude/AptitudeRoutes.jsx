import { Navigate, NavLink, Route, Routes, useLocation } from "react-router-dom";
import { Dumbbell, LayoutGrid, RotateCcw, Timer, TrendingUp } from "lucide-react";
import "../../styles/aptitude-module.css";
import "../../styles/aptitude.css";
import OverviewPage from "./pages/OverviewPage";
import PracticePage from "./pages/PracticePage";
import MockTestsPage from "./pages/MockTestsPage";
import ReviewPage from "./pages/ReviewPage";
import ProgressPage from "./pages/ProgressPage";
import SessionPage from "./session/SessionPage";
import ResultPage from "./results/ResultPage";
import SessionReviewPage from "./results/SessionReviewPage";
import FullSessionReviewPage from "./results/FullSessionReviewPage";
import ErrorBoundary from "../../components/ErrorBoundary";
import AptitudeStreakBadge from "./components/AptitudeStreakBadge";
const tabs = [
  { to: "/dashboard/aptitude", label: "Overview", icon: LayoutGrid, end: true },
  { to: "/dashboard/aptitude/practice", label: "Practice", icon: Dumbbell },
  { to: "/dashboard/aptitude/mock", label: "Mock Tests", icon: Timer },
  { to: "/dashboard/aptitude/review", label: "Review", icon: RotateCcw },
  { to: "/dashboard/aptitude/progress", label: "Progress", icon: TrendingUp },
];

function IsolatedPage({ title, children }) {
  return (
    <ErrorBoundary
      key={title}
      title={`${title} could not load`}
      description="This Aptitude page failed independently. Other Aptitude pages are still safe—try again or switch tabs."
    >
      {children}
    </ErrorBoundary>
  );
}

export default function AptitudeRoutes() {
  const location = useLocation();
  const inSession = /\/aptitude\/(session|results)\//.test(location.pathname);
  return (
    <div style={{ display: "grid", gap: 18 }}>
      <AptitudeStreakBadge />
      {!inSession && <nav style={{ display: "flex", gap: 6, overflowX: "auto" }}>{tabs.map((tab) => <NavLink key={tab.label} to={tab.to} end={tab.end} className="cv-apt-tab"><tab.icon size={15} />{tab.label}</NavLink>)}</nav>}
      <Routes>
        <Route index element={<IsolatedPage title="Overview"><OverviewPage /></IsolatedPage>} />
        <Route path="practice" element={<IsolatedPage title="Practice"><PracticePage /></IsolatedPage>} />
        <Route path="mock" element={<IsolatedPage title="Mock Tests"><MockTestsPage /></IsolatedPage>} />
        <Route path="review" element={<IsolatedPage title="Review"><ReviewPage /></IsolatedPage>} />
        <Route path="progress" element={<IsolatedPage title="Progress"><ProgressPage /></IsolatedPage>} />
        <Route path="session/:sessionId" element={<IsolatedPage title="Practice Session"><SessionPage /></IsolatedPage>} />
        <Route path="results/:sessionId/review" element={<IsolatedPage title="Mistake Review"><SessionReviewPage /></IsolatedPage>} />
        <Route path="results/:sessionId/full-review" element={<IsolatedPage title="Full Session Review"><FullSessionReviewPage /></IsolatedPage>} />
        <Route path="results/:sessionId" element={<IsolatedPage title="Session Results"><ResultPage /></IsolatedPage>} />
        <Route path="*" element={<Navigate to="/dashboard/aptitude" replace />} />
      </Routes>
    </div>
  );
}
