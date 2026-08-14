import { useNavigate } from "react-router-dom";

export default function Leaderboard({ data }) {
  const navigate = useNavigate();

  if (!data?.isReady) {
    return (
      <div style={{ background: "#0D1020", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 14, padding: "20px 22px" }}>
        <p style={{ fontSize: 13.5, fontWeight: 700, color: "#F0F2FF", margin: "0 0 4px" }}>Leaderboard</p>
        <p style={{ fontSize: 11.5, color: "#3D4466", margin: 0 }}>No students on the platform yet besides you.</p>
      </div>
    );
  }

  return (
    <div style={{ background: "#0D1020", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "18px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <p style={{ fontSize: 13.5, fontWeight: 700, color: "#F0F2FF", margin: 0 }}>Leaderboard</p>
        <button onClick={() => navigate("/dashboard/leaderboard")} style={{ fontSize: 11, color: "#A5B4FC", background: "none", border: "none", cursor: "pointer" }}>Global →</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {data.top.map((u) => (
          <div key={u.rank} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 10, background: u.isMe ? "rgba(99,102,241,0.08)" : "transparent", border: u.isMe ? "1px solid rgba(99,102,241,0.2)" : "1px solid transparent" }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: u.rank <= 3 ? "#F59E0B" : "#3D4466", minWidth: 18 }}>#{u.rank}</span>
            <div style={{ width: 26, height: 26, borderRadius: "50%", background: "linear-gradient(135deg,#6366F1,#22D3EE)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "white" }}>{u.name[0]}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 12.5, fontWeight: 600, color: u.isMe ? "#A5B4FC" : "#F0F2FF", margin: 0 }}>{u.name}{u.isMe && " (you)"}</p>
              <p style={{ fontSize: 10.5, color: "#3D4466", margin: 0 }}>{u.college}</p>
            </div>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: "#F0F2FF" }}>{u.points.toLocaleString()}</span>
          </div>
        ))}
        {data.myRank > 5 && (
          <p style={{ fontSize: 11, color: "#3D4466", textAlign: "center", margin: "4px 0 0" }}>Your global rank: #{data.myRank}</p>
        )}
      </div>
    </div>
  );
}