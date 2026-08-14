export default function DSAProgress({ data }) {
  if (!data?.isReady) {
    return (
      <div style={{ background: "#0D1020", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 14, padding: "20px 22px" }}>
        <p style={{ fontSize: 13.5, fontWeight: 700, color: "#F0F2FF", margin: "0 0 4px" }}>DSA Progress</p>
        <p style={{ fontSize: 11.5, color: "#3D4466", margin: 0 }}>No problems in the bank yet.</p>
      </div>
    );
  }

  return (
    <div style={{ background: "#0D1020", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "18px 20px" }}>
      <p style={{ fontSize: 13.5, fontWeight: 700, color: "#F0F2FF", margin: "0 0 14px" }}>DSA Progress</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        {data.topics.map((t) => (
          <div key={t.name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#F0F2FF", width: 100, flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.name}</span>
            <div style={{ flex: 1, height: 5, background: "#181D35", borderRadius: 100, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${t.pct}%`, background: "#6366F1", borderRadius: 100, transition: "width 0.6s ease" }} />
            </div>
            <span style={{ fontFamily: "monospace", fontSize: 11, color: "#8B93B0", width: 36, textAlign: "right" }}>{t.pct}%</span>
            <span style={{ fontFamily: "monospace", fontSize: 10, color: "#3D4466", width: 40, textAlign: "right" }}>{t.solved}/{t.total}</span>
          </div>
        ))}
      </div>
    </div>
  );
}