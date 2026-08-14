import { useEffect, useState } from "react";
import { Gauge, Info } from "lucide-react";
import aptitudeApi from "../lib/api";
import { Card, EmptyState } from "../lib/ui";
import { readinessLabel } from "../lib/format";

export default function ReadinessCard({ refreshKey = 0 }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    aptitudeApi.readinessBreakdown(controller.signal)
      .then((response) => setData(response.data?.data || null))
      .catch((error) => {
        if (error.name !== "CanceledError" && error.code !== "ERR_CANCELED") setData(null);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [refreshKey]);

  if (loading && !data) return <Card><div className="cv-aptitude-skeleton" style={{ height: 420 }} aria-label="Loading readiness" /></Card>;

  if (!data?.hasData) {
    return <Card><EmptyState icon={<Gauge size={20} />} title="Readiness needs a baseline" description={`Answer at least ${data?.minRequired || 10} questions to unlock your interview readiness score.`} /></Card>;
  }

  const meta = readinessLabel(data.score);
  return (
    <Card>
      <div style={headerStyle}>
        <div>
          <div style={eyebrowStyle}>Interview readiness</div>
          <h2 style={{ margin: "4px 0 5px", color: "var(--text-primary)", fontSize: 19 }}>How prepared are you?</h2>
          <p style={{ margin: 0, color: "var(--text-tertiary)", fontSize: 11.5 }}>Calculated from your real aptitude attempts</p>
        </div>
        <button type="button" onClick={() => setShowGuide((value) => !value)} style={guideButton}><Info size={13} /> {showGuide ? "Hide guide" : "How it works"}</button>
      </div>

      <div style={scoreRow}>
        <div style={{ ...ring, background: `conic-gradient(${meta.color} ${data.score * 3.6}deg, var(--bg-elevated-2) 0)` }}><div style={innerRing}><strong>{data.score}</strong><small>/100</small></div></div>
        <div>
          <div style={{ color: meta.color, fontSize: 17, fontWeight: 800 }}>{meta.label}</div>
          <div style={{ color: "var(--text-secondary)", fontSize: 12, marginTop: 5 }}>Based on {data.sampleSize} answered questions</div>
          <div style={{ color: "var(--text-tertiary)", fontSize: 11, marginTop: 5 }}>Updates automatically after every attempt</div>
        </div>
      </div>

      {showGuide && <div style={guideCard}><strong>What this means</strong><p>A higher score means your accuracy, difficulty handling, consistency, speed, and recent form are closer to interview expectations. Each row below shows one part of the score; its weight tells you how much it contributes.</p></div>}

      <div style={componentGrid}>
        {data.components.map((item) => (
          <div key={item.key} style={componentCard}>
            <div style={componentTop}><span style={{ color: "var(--text-primary)", fontWeight: 700 }}>{item.label}</span><strong style={{ color: item.score >= 70 ? "var(--green)" : item.score >= 40 ? "var(--amber)" : "var(--red)" }}>{item.score}%</strong></div>
            <div style={track}><div style={{ width: `${item.score}%`, height: "100%", background: item.score >= 70 ? "var(--green)" : item.score >= 40 ? "var(--accent)" : "var(--red)", borderRadius: 99, transition: "width .5s ease" }} /></div>
            <div style={componentNote}>{item.note}<span>Weight {Math.round(item.weight * 100)}%</span></div>
          </div>
        ))}
      </div>
    </Card>
  );
}

const headerStyle = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" };
const eyebrowStyle = { color: "var(--accent-strong)", fontSize: 10, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase" };
const guideButton = { display: "inline-flex", alignItems: "center", gap: 5, border: "1px solid var(--border-default)", background: "var(--bg-elevated)", color: "var(--accent-strong)", borderRadius: 8, padding: "7px 10px", cursor: "pointer", fontSize: 11, fontWeight: 700 };
const scoreRow = { display: "flex", alignItems: "center", gap: 17, margin: "22px 0 20px", padding: "15px 16px", borderRadius: 12, background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" };
const ring = { width: 82, height: 82, borderRadius: "50%", display: "grid", placeItems: "center", flex: "0 0 auto" };
const innerRing = { width: 66, height: 66, borderRadius: "50%", background: "var(--bg-surface)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "var(--text-primary)" };
const guideCard = { padding: "11px 13px", marginBottom: 16, borderRadius: 10, background: "var(--accent-soft)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)", fontSize: 11.5, lineHeight: 1.55 };
const componentGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 9 };
const componentCard = { padding: "11px 12px", borderRadius: 10, background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" };
const componentTop = { display: "flex", justifyContent: "space-between", gap: 8, fontSize: 12 };
const track = { height: 7, margin: "9px 0 7px", borderRadius: 99, background: "var(--bg-elevated-2)", overflow: "hidden" };
const componentNote = { display: "flex", justifyContent: "space-between", gap: 8, color: "var(--text-tertiary)", fontSize: 10.5 };
