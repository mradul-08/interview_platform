import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import api from "../api/api";
import { logoutEverywhere } from "../utils/auth";

export default function CompanyDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState({});
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
    setUser(currentUser);
    if (!token) { navigate("/login"); return; }
    if (currentUser.role !== "company" && currentUser.role !== "admin") navigate("/dashboard");
    (async () => {
      try {
        const res = await api.get("/api/auth/me");
        setProfile(res.data?.profile || null);
      } catch {
        setProfile(null);
      }
    })();
  }, [navigate]);

  return (
    <div className="cv-app-shell" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, sans-serif" }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="cv-card"
        style={{ textAlign: "center", padding: "48px 40px", borderRadius: 24, maxWidth: 480 }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: "rgba(59,91,219,0.15)", border: "1px solid rgba(59,91,219,0.3)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6EE7FF" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" /></svg>
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)", margin: "0 0 8px", letterSpacing: "-0.03em" }}>Company Dashboard</h1>
        <p style={{ fontSize: 13.5, color: "var(--text-secondary)", margin: "0 0 28px", lineHeight: 1.6 }}>Manage assessments, discover candidates, and conduct interviews.</p>
        {profile && (
          <div style={{ marginBottom: 18, padding: "12px 14px", borderRadius: 14, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "#cbd5e1", fontSize: 13, lineHeight: 1.5, textAlign: "left" }}>
            <div style={{ fontWeight: 700, color: "#E2E8F0" }}>{profile.companyName}</div>
            <div style={{ marginTop: 4 }}>{profile.officialEmail}</div>
            <div style={{ marginTop: 4 }}>Verified: {profile.verified ? "Yes" : "No"}</div>
          </div>
        )}
        {user.role === "company" && (
          <div style={{ marginBottom: 18, padding: "12px 14px", borderRadius: 14, background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", color: "#86efac", fontSize: 13, lineHeight: 1.5 }}>
            Company access is active. Your account is verified after registration validation.
          </div>
        )}
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 14px", borderRadius: 100, background: "rgba(59,91,219,0.1)", border: "1px solid rgba(59,91,219,0.25)", fontSize: 11.5, color: "#6EE7FF", fontWeight: 600 }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#6EE7FF", animation: "pulse 2s infinite" }} />
          Verified employer flow
        </div>
        <br /><br />
        <button onClick={logoutEverywhere}
          style={{ padding: "9px 20px", borderRadius: 10, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#fca5a5", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "Inter, sans-serif" }}>
          Logout
        </button>
      </motion.div>
    </div>
  );
}
