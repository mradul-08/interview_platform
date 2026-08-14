import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

export default function HeroSection({ user, stats }) {
  const navigate = useNavigate();

  const items = [
    { label: "Placement Readiness", value: `${stats.placementReadiness}%`, color: "#6366F1" },
    { label: "Current Rank", value: stats.rank ? `#${stats.rank}` : "—", color: "#22D3EE" },
    { label: "Current Streak", value: `${stats.currentStreak}d`, color: "#F59E0B" },
    { label: "Problems Solved", value: stats.problemsSolved, color: "#10B981" },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
      style={{ background: "#0D1020", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 18, padding: "22px 24px", position: "relative", overflow: "hidden" }}>
      <p style={{ fontSize: 11, fontWeight: 600, color: "#8B93B0", letterSpacing: "0.06em", textTransform: "uppercase", margin: "0 0 4px" }}>Welcome back</p>
      <h1 style={{ fontSize: 22, fontWeight: 800, color: "#F0F2FF", letterSpacing: "-0.03em", margin: "0 0 18px" }}>
        {user?.name || "Student"} <span style={{ fontSize: 18 }}>👋</span>
      </h1>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 18 }}>
        {items.map((it) => (
          <div key={it.label} style={{ background: "#131729", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#F0F2FF", letterSpacing: "-0.04em", lineHeight: 1 }}>{it.value}</div>
            <div style={{ fontSize: 10, fontWeight: 600, color: "#3D4466", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 4 }}>{it.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={() => navigate("/dashboard/problems")}
          style={{ padding: "8px 16px", borderRadius: 10, background: "#6366F1", color: "white", border: "none", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
          Continue Solving
        </button>
        <button onClick={() => navigate("/dashboard/mock")}
          style={{ padding: "8px 16px", borderRadius: 10, background: "#131729", color: "#F0F2FF", border: "1px solid rgba(255,255,255,0.07)", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
          Take Mock Interview
        </button>
        <button onClick={() => navigate("/dashboard/aptitude")}
          style={{ padding: "8px 16px", borderRadius: 10, background: "#131729", color: "#F0F2FF", border: "1px solid rgba(255,255,255,0.07)", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
          Start Aptitude Challenge
        </button>
      </div>
    </motion.div>
  );
}