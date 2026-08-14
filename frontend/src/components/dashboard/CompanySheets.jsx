import { useNavigate } from "react-router-dom";

const sheetColors = { Blind75: "#6366F1", Striver: "#22D3EE" };

export default function CompanySheets({ data }) {
  const navigate = useNavigate();

  if (!data?.isReady) {
    return (
      <div style={{ background: "#0D1020", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 14, padding: "20px 22px" }}>
        <p style={{ fontSize: 13.5, fontWeight: 700, color: "#F0F2FF", margin: "0 0 4px" }}>Sheets</p>
        <p style={{ fontSize: 11.5, color: "#3D4466", margin: 0 }}>No sheets seeded yet.</p>
      </div>
    );
  }

  return (
    <div style={{ background: "#0D1020", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "18px 20px" }}>
      <p style={{ fontSize: 13.5, fontWeight: 700, color: "#F0F2FF", margin: "0 0 14px" }}>Sheets</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {data.sheets.map((s) => {
          const color = sheetColors[s.name] || "#6366F1";
          return (
            <div key={s.name} onClick={() => navigate(`/dashboard/sheets?sheet=${s.name}`)}
              style={{ background: "#131729", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 10, padding: "12px 14px", cursor: "pointer" }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: "#F0F2FF", margin: "0 0 4px" }}>{s.name}</p>
              <p style={{ fontFamily: "monospace", fontSize: 10.5, color: "#8B93B0", margin: "0 0 8px" }}>{s.solved}/{s.total} solved</p>
              <div style={{ height: 3, background: "#0D1020", borderRadius: 100, overflow: "hidden", marginBottom: 4 }}>
                <div style={{ height: "100%", width: `${s.pct}%`, background: color, borderRadius: 100 }} />
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, fontFamily: "monospace", color }}>{s.pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}