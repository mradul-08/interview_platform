import { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

const AuthPage = lazy(() => import("./pages/AuthPage"));
const AuthSuccess = lazy(() => import("./pages/AuthSuccess"));
const StudentDashboard = lazy(() => import("./pages/StudentDashboard"));
const CompanyDashboard = lazy(() => import("./pages/CompanyDashboard"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const Home = lazy(() => import("./pages/Home"));

function PrivateRoute({ children, allowedRoles }) {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  if (!token) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/login" replace />;
  return children;
}

function RouteShell({ children }) {
  return <Suspense fallback={<div className="min-h-screen bg-slate-950" />}><>{children}</></Suspense>;
}

function App() {
  return (
    <RouteShell>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/auth-success" element={<AuthSuccess />} />

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
