import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { SlidersHorizontal, Play, Loader2 } from "lucide-react";
import aptitudeApi from "../lib/api";
import { Card, SectionHeader } from "../lib/ui";
import { CATEGORY_META, DIFFICULTY_META, formatTopicName } from "../lib/format";

const CATEGORIES = Object.keys(CATEGORY_META);
const DIFFICULTIES = ["Easy", "Medium", "Hard"];
const COUNTS = [10, 15, 20, 30];

export default function PracticePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [topicsByCategory, setTopicsByCategory] = useState([]);
  const [category, setCategory] = useState(location.state?.category || null);
  const [topic, setTopic] = useState(location.state?.topic || null);
  const [companyTag] = useState(location.state?.companyTag || null);
  const [difficulty, setDifficulty] = useState(null);
  const [count, setCount] = useState(15);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    aptitudeApi
      .topics(controller.signal)
      .then((res) => setTopicsByCategory(res.data?.topics || []))
      .catch(() => {});
    return () => controller.abort();
  }, []);

  const startPractice = async () => {
    setStarting(true);
    setError("");
    try {
      const res = await aptitudeApi.createSession({
        mode: "FOCUSED",
        config: { category, topic, difficulty, companyTag, totalQuestions: count },
      });
      navigate(`/dashboard/aptitude/session/${res.data.session._id}`);
    } catch (e) {
      setError(e.response?.data?.message || "No questions matched those filters. Try widening them.");
      setStarting(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <Card>
        <SectionHeader icon={<SlidersHorizontal size={16} />} title="Build a practice set" sub="Untimed — get instant feedback and explanations as you go" />

        <FilterGroup label="Category">
          <ChipRow>
            <Chip active={category === null} onClick={() => setCategory(null)}>All categories</Chip>
            {CATEGORIES.map((c) => (
              <Chip key={c} active={category === c} tone={CATEGORY_META[c]} onClick={() => setCategory(category === c ? null : c)}>
                {CATEGORY_META[c].short}
              </Chip>
            ))}
          </ChipRow>
        </FilterGroup>

        <FilterGroup label="Topic">
          <ChipRow scroll>
            <Chip active={topic === null} onClick={() => setTopic(null)}>All topics</Chip>
            {topicsByCategory.map((t) => (
              <Chip key={t} active={topic === t} onClick={() => setTopic(topic === t ? null : t)}>
                {formatTopicName(t)}
              </Chip>
            ))}
          </ChipRow>
        </FilterGroup>

        <FilterGroup label="Difficulty">
          <ChipRow>
            <Chip active={difficulty === null} onClick={() => setDifficulty(null)}>Adaptive</Chip>
            {DIFFICULTIES.map((d) => (
              <Chip key={d} active={difficulty === d} tone={DIFFICULTY_META[d]} onClick={() => setDifficulty(difficulty === d ? null : d)}>
                {d}
              </Chip>
            ))}
          </ChipRow>
        </FilterGroup>

        <FilterGroup label="Question count">
          <ChipRow>
            {COUNTS.map((n) => (
              <Chip key={n} active={count === n} onClick={() => setCount(n)}>{n}</Chip>
            ))}
          </ChipRow>
        </FilterGroup>

        {error && <p style={{ fontSize: 12.5, color: "var(--red)", marginTop: 4 }}>{error}</p>}

        <button
          onClick={startPractice}
          disabled={starting}
          className="cv-button-primary"
          style={{ marginTop: 18, padding: "11px 20px", fontSize: 13.5, width: "100%" }}
        >
          {starting ? <Loader2 size={16} className="animate-spin" /> : <Play size={15} />}
          {starting ? "Building your set…" : "Start practice"}
        </button>
      </Card>
    </div>
  );
}

function FilterGroup({ label, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 9 }}>{label}</div>
      {children}
    </div>
  );
}

function ChipRow({ children, scroll }) {
  return (
    <div style={{ display: "flex", flexWrap: scroll ? "nowrap" : "wrap", overflowX: scroll ? "auto" : "visible", gap: 8, paddingBottom: scroll ? 4 : 0 }}>
      {children}
    </div>
  );
}

function Chip({ active, onClick, children, tone }) {
  const color = active ? (tone?.color || "var(--accent-strong)") : "var(--text-secondary)";
  const bg = active ? (tone?.bg || "var(--accent-soft)") : "var(--bg-elevated)";
  const border = active ? (tone?.color || "var(--accent)") : "var(--border-subtle)";
  return (
    <button
      onClick={onClick}
      style={{
        flexShrink: 0,
        fontSize: 12,
        fontWeight: 700,
        padding: "6px 13px",
        borderRadius: 100,
        color,
        background: bg,
        border: `1.5px solid ${border}`,
        cursor: "pointer",
        transition: "all 150ms ease",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </button>
  );
}
