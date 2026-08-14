import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function TodaysRoadmap({ data }) {
  const navigate = useNavigate();
  const [done, setDone] = useState({});

  if (!data?.isReady) {
    return (
      <div style={{ background: "#0D1020", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 14, padding: "20px 22px" }}>
        <p style={{ fontSize: 13.5, fontWeight: 700, color: "#F0F2FF", margin: "0 0 4px" }}>Today's Plan</p>
        <p style={{ fontSize: 11.5, color: "#3D4466", margin: 0 }}>No tasks generated — you've cleared everything in the bank, or no problems exist yet.</p>
      </div>
    );
  }

  return (
    <div style={{ background: "#0D1020", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "18px 20px" }}>
      <p style={{ fontSize: 13.5, fontWeight: 700, color: "#F0F2FF", margin: "0 0 12px" }}>Today's Plan</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {data.tasks.map((t) => (
          <div key={t.id} onClick={() => setDone((d) => ({ ...d, [t.id]: !d[t.id] }))}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 10, cursor: "pointer" }}>
            <div style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11,
              background: done[t.id] ? "rgba(16,185,129,0.15)" : "#131729",
              border: done[t.id] ? "1px solid rgba(16,185,129,0.3)" : "1px solid rgba(255,255,255,0.07)",
              color: done[t.id] ? "#10B981" : "transparent" }}>✓</div>
            <span style={{ fontSize: 12.5, fontWeight: 500, color: done[t.id] ? "#8B93B0" : "#F0F2FF", textDecoration: done[t.id] ? "line-through" : "none" }}>
              {t.label}
            </span>
            <button onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/problems/${t.slug}`); }}
              style={{ marginLeft: "auto", fontSize: 10.5, color: "#A5B4FC", background: "none", border: "none", cursor: "pointer" }}>Open →</button>
          </div>
        ))}
      </div>
    </div>
  );
}