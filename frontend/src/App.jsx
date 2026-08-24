import { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

const AuthPage = lazy(() => import("./pages/AuthPage"));
const AuthSuccess = lazy(() => import("./pages/AuthSuccess"));
const StudentDashboard = lazy(() => import("./pages/StudentDashboard"));
const CompanyDashboard = lazy(() => import("./pages/CompanyDashboard"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const Home = lazy(() => import("./pages/Home"));
const HomePreview = lazy(() => import("./pages/HomePreview"));
const PublicProfilePage = lazy(() => import("./features/profile/PublicProfilePage"));

function PrivateRoute({ children, allowedRoles }) {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  if (!token) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/login" replace />;
  return children;
}

function RouteLoading() {
  return (
    <main
      aria-label="Loading CodeVerse"
      role="status"
      style={{
        minHeight: "100svh",
        display: "grid",
        placeItems: "center",
        overflow: "hidden",
        backgroundColor: "#151515",
        backgroundImage: "radial-gradient(circle at 50% 42%, rgba(255,161,22,0.16), transparent 34%), linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)",
        backgroundSize: "auto, 64px 64px, 64px 64px",
        color: "#f8fafc",
      }}
    >
      <div style={{ display: "grid", justifyItems: "center", gap: 16 }}>
        <div style={{ position: "relative", width: 64, height: 64, padding: 3, borderRadius: 20, background: "linear-gradient(135deg, #ff9800, #ffa116)", boxShadow: "0 0 34px rgba(255,161,22,0.42)" }}>
          <img src="/branding/codeverse-favicon.png" alt="CodeVerse" style={{ width: "100%", height: "100%", display: "block", borderRadius: 17, objectFit: "cover" }} />
        </div>
        <div style={{ textAlign: "center" }}>
          <strong style={{ display: "block", fontSize: 20, letterSpacing: "-0.03em" }}>CodeVerse</strong>
          <span style={{ display: "block", marginTop: 4, color: "#94a3b8", fontSize: 12 }}>Preparing your workspace</span>
        </div>
        <span aria-hidden="true" style={{ width: 26, height: 26, border: "2px solid rgba(255,161,22,0.22)", borderTopColor: "#ffa116", borderRadius: "50%", animation: "cv-route-spin .8s linear infinite" }} />
      </div>
      <style>{"@keyframes cv-route-spin { to { transform: rotate(360deg); } }"}</style>
    </main>
  );
}

function RouteShell({ children }) {
  return <Suspense fallback={<RouteLoading />}><>{children}</></Suspense>;
}

function App() {
  return (
    <RouteShell>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/homepage-preview" element={<HomePreview />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/auth-success" element={<AuthSuccess />} />
        <Route path="/profile/:username" element={<PublicProfilePage />} />

        <Route path="/dashboard/student" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard/student/*" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard/company" element={<Navigate to="/company" replace />} />
        <Route path="/dashboard/company/*" element={<Navigate to="/company" replace />} />
        <Route path="/dashboard/admin" element={<Navigate to="/admin" replace />} />
        <Route path="/dashboard/admin/*" element={<Navigate to="/admin" replace />} />

        <Route
          path="/dashboard/*"
          element={
            <PrivateRoute allowedRoles={["student"]}>
              <StudentDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/company/*"
          element={
            <PrivateRoute allowedRoles={["company"]}>
              <CompanyDashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/*"
          element={
            <PrivateRoute allowedRoles={["admin"]}>
              <AdminDashboard />
            </PrivateRoute>
          }
        />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </RouteShell>
  );
}

export default App;
