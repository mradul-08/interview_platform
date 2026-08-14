import { useNavigate } from "react-router-dom";

const diffColor = { Easy: "#10B981", Medium: "#F59E0B", Hard: "#EF4444" };

export default function ResumeLearning({ data }) {
  const navigate = useNavigate();

  if (!data?.isReady) {
    return (
      <div style={{ background: "#0D1020", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 14, padding: "20px 22px" }}>
        <p style={{ fontSize: 13.5, fontWeight: 700, color: "#F0F2FF", margin: "0 0 4px" }}>Resume Learning</p>
        <p style={{ fontSize: 11.5, color: "#3D4466", margin: 0 }}>You haven't attempted any problems yet. Solve your first one to see it here.</p>
      </div>
    );
  }

  const { problem, lastVerdict, solved } = data;

  return (
    <div style={{ background: "#0D1020", border: "1px solid rgba(255,255,255,0.07)", borderLeft: "3px solid #6366F1", borderRadius: 14, padding: "18px 20px", position: "relative", overflow: "hidden", gridColumn: "span 2" }}>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10, fontWeight: 700, color: "#A5B4FC", background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: 6, padding: "3px 8px", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
        Resume Learning
      </div>
      <p style={{ fontFamily: "monospace", fontSize: 15, fontWeight: 600, color: "#F0F2FF", margin: "0 0 6px", letterSpacing: "-0.02em" }}>{problem.title}</p>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <span style={{ fontFamily: "monospace", fontSize: 10.5, fontWeight: 600, padding: "2px 8px", borderRadius: 5, color: diffColor[problem.difficulty], background: `${diffColor[problem.difficulty]}15`, border: `1px solid ${diffColor[problem.difficulty]}30` }}>
          {problem.difficulty}
        </span>
        {problem.tags?.slice(0, 3).map((t) => (
          <span key={t} style={{ fontFamily: "monospace", fontSize: 10, color: "#8B93B0", background: "#131729", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 5, padding: "2px 7px" }}>{t}</span>
        ))}
        <span style={{ fontSize: 11, color: solved ? "#10B981" : "#F59E0B" }}>Last attempt: {lastVerdict}</span>
      </div>
      <button onClick={() => navigate(`/dashboard/problems/${problem.slug}`)}
        style={{ padding: "9px 18px", background: "#6366F1", color: "white", borderRadius: 10, fontSize: 12.5, fontWeight: 700, border: "none", cursor: "pointer" }}>
        Continue Problem →
      </button>
    </div>
  );
}