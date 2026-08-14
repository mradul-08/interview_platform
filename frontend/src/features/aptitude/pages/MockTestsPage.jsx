import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Timer, ShieldAlert, Loader2, Play } from "lucide-react";
import aptitudeApi from "../lib/api";
import { Card, SectionHeader } from "../lib/ui";
import { CATEGORY_META } from "../lib/format";

const TEST_LENGTHS = [
  { count: 20, minutes: 20, label: "Quick check" },
  { count: 40, minutes: 40, label: "Standard" },
  { count: 60, minutes: 60, label: "Full length" },
];

export default function MockTestsPage() {
  const navigate = useNavigate();
  const [category, setCategory] = useState(null);
  const [length, setLength] = useState(TEST_LENGTHS[1]);
  const [negativeMarking, setNegativeMarking] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  const start = async () => {
    setStarting(true);
    setError("");
    try {
      const res = await aptitudeApi.createSession({
        mode: "EXAM_SIMULATION",
        config: {
          category,
          totalQuestions: length.count,
          timeLimitSeconds: length.minutes * 60,
          negativeMarking,
          negativeMarkingFactor: 0.25,
        },
      });
      navigate(`/dashboard/aptitude/session/${res.data.session._id}`, { state: { justStarted: true } });
    } catch (e) {
      setError(e.response?.data?.message || "Couldn't start the test. Try a different configuration.");
      setStarting(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <Card>
        <SectionHeader icon={<Timer size={16} />} title="Mock test" sub="Timed, exam-style — no feedback until you submit" />

        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Test length</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
            {TEST_LENGTHS.map((opt) => {
              const active = length.count === opt.count;
              return (
                <button
                  key={opt.count}
                  onClick={() => setLength(opt)}
                  style={{
                    textAlign: "left",
                    padding: "13px 14px",
                    borderRadius: "var(--radius-md)",
                    border: `1.5px solid ${active ? "var(--accent)" : "var(--border-subtle)"}`,
                    background: active ? "var(--accent-soft)" : "var(--bg-elevated)",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text-primary)" }}>{opt.label}</div>
                  <div style={{ fontSize: 11.5, color: "var(--text-tertiary)", marginTop: 3 }}>{opt.count} questions · {opt.minutes} min</div>
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Category</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <button onClick={() => setCategory(null)} style={chipStyle(category === null)}>Mixed</button>
            {Object.entries(CATEGORY_META).map(([name, meta]) => (
              <button key={name} onClick={() => setCategory(category === name ? null : name)} style={chipStyle(category === name, meta)}>{meta.short}</button>
            ))}
          </div>
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderRadius: "var(--radius-md)", background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", cursor: "pointer", marginBottom: 18 }}>
          <input type="checkbox" checked={negativeMarking} onChange={(e) => setNegativeMarking(e.target.checked)} style={{ width: 16, height: 16, accentColor: "var(--accent)" }} />
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-primary)" }}>Enable negative marking</div>
            <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>−0.25 for each wrong answer, matching most placement drives</div>
          </div>
        </label>

        <div style={{ display: "flex", gap: 10, padding: "12px 14px", borderRadius: "var(--radius-md)", background: "var(--amber-soft)", marginBottom: 18 }}>
          <ShieldAlert size={16} color="var(--amber)" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0, lineHeight: 1.6 }}>
            Once started, the timer is enforced by the server — closing the tab won't pause it. You can skip and mark questions for review, and revisit them from the palette before submitting.
          </p>
        </div>

        {error && <p style={{ fontSize: 12.5, color: "var(--red)", marginBottom: 12 }}>{error}</p>}

        <button onClick={start} disabled={starting} className="cv-button-primary" style={{ width: "100%", padding: "12px", fontSize: 13.5 }}>
          {starting ? <Loader2 size={16} className="animate-spin" /> : <Play size={15} />}
          {starting ? "Preparing your test…" : `Start ${length.label.toLowerCase()} test`}
        </button>
      </Card>
    </div>
  );
}

function chipStyle(active, meta) {
  return {
    fontSize: 12,
    fontWeight: 700,
    padding: "6px 13px",
    borderRadius: 100,
    color: active ? (meta?.color || "var(--accent-strong)") : "var(--text-secondary)",
    background: active ? (meta?.bg || "var(--accent-soft)") : "var(--bg-elevated)",
    border: `1.5px solid ${active ? (meta?.color || "var(--accent)") : "var(--border-subtle)"}`,
    cursor: "pointer",
  };
}
