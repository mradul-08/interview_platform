import { useNavigate } from "react-router-dom";

const diffColor = { Easy: "#10B981", Medium: "#F59E0B", Hard: "#EF4444" };

export default function DailyChallenge({ data }) {
  const navigate = useNavigate();

  if (!data?.isReady) {
    return (
      <div style={{ background: "#0D1020", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 14, padding: "20px 22px" }}>
        <p style={{ fontSize: 13.5, fontWeight: 700, color: "#F0F2FF", margin: "0 0 4px" }}>Daily Challenge</p>
        <p style={{ fontSize: 11.5, color: "#3D4466", margin: 0 }}>No problems in the bank yet to pick a daily challenge from.</p>
      </div>
    );
  }

  const { problem, solvedByMe } = data;

  return (
    <div style={{ background: "#0D1020", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "18px 20px", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg,#6366F1,#22D3EE)" }} />
      <p style={{ fontSize: 13.5, fontWeight: 700, color: "#F0F2FF", margin: "0 0 10px" }}>Daily Challenge</p>
      <p style={{ fontFamily: "monospace", fontSize: 14, fontWeight: 600, color: "#F0F2FF", margin: "0 0 8px" }}>{problem.title}</p>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <span style={{ fontFamily: "monospace", fontSize: 10.5, fontWeight: 600, padding: "2px 8px", borderRadius: 5, color: diffColor[problem.difficulty], background: `${diffColor[problem.difficulty]}15` }}>{problem.difficulty}</span>
        <span style={{ fontSize: 11, color: "#8B93B0" }}>{problem.acceptanceRate}% acceptance</span>
      </div>
      <button onClick={() => navigate(`/dashboard/problems/${problem.slug}`)}
        disabled={solvedByMe}
        style={{ padding: "8px 16px", background: solvedByMe ? "#131729" : "#6366F1", color: solvedByMe ? "#10B981" : "white", borderRadius: 10, fontSize: 12.5, fontWeight: 700, border: solvedByMe ? "1px solid rgba(16,185,129,0.3)" : "none", cursor: solvedByMe ? "default" : "pointer" }}>
        {solvedByMe ? "✓ Solved Today" : "Solve Now →"}
      </button>
    </div>
  );
}