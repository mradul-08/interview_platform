export default function NotBuiltYet({ title }) {
  return (
    <div style={{ background: "#0D1020", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 14, padding: "20px 22px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div>
        <p style={{ fontSize: 13.5, fontWeight: 700, color: "#F0F2FF", margin: "0 0 4px" }}>{title}</p>
        <p style={{ fontSize: 11.5, color: "#3D4466", margin: 0 }}>No data yet — this feature's backend hasn't been built. We'll wire this up in the next phase.</p>
      </div>
    </div>
  );
}