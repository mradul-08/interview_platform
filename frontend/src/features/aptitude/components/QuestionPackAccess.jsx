import { useEffect, useState } from "react";
import { ArrowRight, BookOpen, Brain, Calculator, Languages, Network, RefreshCcw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import aptitudeApi from "../lib/api";
import { Card, EmptyState, SectionHeader } from "../lib/ui";

const ICONS = { Quantitative: Calculator, Logical: Brain, Verbal: Languages, "Data Interpretation": Network };

export default function QuestionPackAccess({ refreshKey = 0 }) {
  const navigate = useNavigate();
  const [packs, setPacks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    aptitudeApi.topics(controller.signal)
      .then((response) => setPacks(response.data?.categoryStats || []))
      .catch(() => setPacks([]))
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [refreshKey]);

  return (
    <Card>
      <SectionHeader icon={<BookOpen size={18} />} title="Question pack access" sub="Choose an Aptitude track to start a focused practice set" />
      {loading ? <div style={{ color: "var(--text-tertiary)", fontSize: 12, padding: "16px 0" }}>Loading question packs…</div> : !packs.length ? (
        <EmptyState icon={<BookOpen size={20} />} title="No question packs available" description="Aptitude question packs will appear here once the question bank is ready." />
      ) : (
        <div style={gridStyle}>
          {packs.map((pack) => {
            const Icon = ICONS[pack.category] || BookOpen;
            return <button key={pack.category} type="button" onClick={() => navigate("/dashboard/aptitude/practice", { state: { category: pack.category } })} style={packStyle}>
              <span style={iconStyle}><Icon size={21} /></span>
              <span style={{ minWidth: 0, flex: 1, textAlign: "left" }}><strong style={titleStyle}>{pack.category}</strong><small style={descriptionStyle}>{descriptionFor(pack.category)}</small><span style={statsStyle}><b>{pack.totalQuestions}</b> questions <span style={separatorStyle}>•</span> <b>{pack.topicCount}</b> topics</span><span style={difficultyRow}>{(pack.difficulties || []).map((difficulty) => <em key={difficulty} style={difficultyStyle[difficulty] || difficultyStyle.default}>{difficulty}</em>)}</span></span>
              <span style={startStyle}>Start <ArrowRight size={14} /></span>
            </button>;
          })}
        </div>
      )}
      {!loading && packs.length > 0 && <button type="button" onClick={() => navigate("/dashboard/aptitude/practice")} style={browseStyle}><RefreshCcw size={13} /> Browse all Aptitude questions</button>}
    </Card>
  );
}

const gridStyle = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))", gap: 12 };
const packStyle = { display: "flex", alignItems: "flex-start", gap: 13, minHeight: 142, padding: "17px 16px", borderRadius: 14, border: "1px solid var(--border-subtle)", background: "linear-gradient(145deg, var(--bg-elevated), var(--bg-surface))", cursor: "pointer", color: "var(--text-primary)", textAlign: "left" };
const iconStyle = { width: 46, height: 46, display: "grid", placeItems: "center", borderRadius: 12, background: "var(--accent-soft)", color: "var(--accent-strong)", flex: "0 0 auto" };
const titleStyle = { display: "block", fontSize: 15, fontWeight: 850, letterSpacing: "-.01em" };
const descriptionStyle = { display: "block", marginTop: 5, color: "var(--text-tertiary)", fontSize: 11, lineHeight: 1.45 };
const statsStyle = { display: "flex", alignItems: "center", gap: 5, marginTop: 10, color: "var(--text-secondary)", fontSize: 10.5 };
const separatorStyle = { color: "var(--text-disabled)" };
const difficultyRow = { display: "flex", gap: 5, marginTop: 9 };
const difficultyStyle = { Easy: { color: "var(--green)", background: "var(--green-soft)", padding: "2px 6px", borderRadius: 5, fontStyle: "normal", fontSize: 9 }, Medium: { color: "var(--amber)", background: "var(--amber-soft)", padding: "2px 6px", borderRadius: 5, fontStyle: "normal", fontSize: 9 }, Hard: { color: "var(--red)", background: "var(--red-soft)", padding: "2px 6px", borderRadius: 5, fontStyle: "normal", fontSize: 9 }, default: { color: "var(--text-tertiary)", background: "var(--bg-elevated-2)", padding: "2px 6px", borderRadius: 5, fontStyle: "normal", fontSize: 9 } };
const startStyle = { display: "inline-flex", alignItems: "center", gap: 4, marginLeft: "auto", color: "var(--accent-strong)", fontSize: 10.5, fontWeight: 800, whiteSpace: "nowrap" };
const browseStyle = { display: "inline-flex", alignItems: "center", gap: 6, marginTop: 13, border: 0, background: "transparent", color: "var(--accent-strong)", cursor: "pointer", fontSize: 11.5, fontWeight: 700 };

function descriptionFor(category) {
  if (category === "Quantitative") return "Numbers, percentages, algebra and arithmetic speed.";
  if (category === "Logical") return "Patterns, arrangements, deductions and reasoning.";
  if (category === "Verbal") return "Vocabulary, grammar, comprehension and communication.";
  if (category === "Data Interpretation") return "Charts, tables, ratios and data-based decisions.";
  return "Build accuracy and speed across this Aptitude category.";
}
