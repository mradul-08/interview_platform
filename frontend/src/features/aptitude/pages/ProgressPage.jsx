import { useEffect, useState } from "react";
import { Radar, Gauge, BrainCircuit, History, CheckCircle2, XCircle } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import aptitudeApi from "../lib/api";
import { Card, SectionHeader, EmptyState, ProgressBar, PageLoading, ErrorNote, Pill } from "../lib/ui";
import { DIFFICULTY_META } from "../lib/format";
import TopicMasteryGrid from "../components/TopicMasteryGrid";
import useRealtimeSocket from "../../../realtime/useRealtimeSocket";

const METRIC_LABELS = {
  accuracy: "Accuracy",
  speed: "Speed",
  consistency: "Consistency",
  pressureHandling: "Under pressure",
  confidence: "High-confidence accuracy",
};

export default function ProgressPage() {
  const [state, setState] = useState({ loading: true, error: "" });
  const [dashboard, setDashboard] = useState(null);
  const [skillDna, setSkillDna] = useState(null);
  const [speedAccuracy, setSpeedAccuracy] = useState(null);
  const [calibration, setCalibration] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [mistakes, setMistakes] = useState(null);
  const [topicIndex, setTopicIndex] = useState(0);
  const focusTopics = mistakes?.focusTopics || (mistakes?.focusTopic ? [mistakes.focusTopic] : []);
  const activeTopic = focusTopics.length ? focusTopics[topicIndex % focusTopics.length]?.topic : null;

  const load = () => {
    setState({ loading: true, error: "" });
    const controller = new AbortController();
    Promise.all([
      aptitudeApi.dashboard(controller.signal),
      aptitudeApi.skillDna(controller.signal),
      aptitudeApi.speedAccuracy(controller.signal),
      aptitudeApi.confidenceCalibration(controller.signal),
      aptitudeApi.analytics(controller.signal, activeTopic),
      aptitudeApi.mistakes(controller.signal),
    ])
      .then(([d, sd, sa, cc, a, m]) => {
        setDashboard(d.data?.data || null);
        setSkillDna(sd.data?.data || null);
        setSpeedAccuracy(sa.data?.data || null);
        setCalibration(cc.data?.data || null);
        setAnalytics(a.data?.data || null);
        setMistakes(m.data?.data || null);
        setState({ loading: false, error: "" });
      })
      .catch((e) => {
        if (e.name === "CanceledError") return;
        setState({ loading: false, error: "Couldn't load your progress data." });
      });
    return controller;
  };

  useEffect(() => {
    const controller = load();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTopic]);

  useEffect(() => setTopicIndex(0), [focusTopics.length]);
  useEffect(() => {
    if (focusTopics.length < 2) return undefined;
    const timer = window.setInterval(() => setTopicIndex((value) => (value + 1) % focusTopics.length), 8000);
    return () => window.clearInterval(timer);
  }, [focusTopics.length]);

  useRealtimeSocket({
    "realtime:ready": load,
    "aptitude:analytics-updated": load,
    "gamification:updated": load,
  });

  if (state.loading) return <PageLoading />;
  if (state.error) return <ErrorNote message={state.error} onRetry={load} />;

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        <Card>
          <SectionHeader icon={<Radar size={16} />} title="Skill DNA" sub="Each metric needs its own sample size before it shows" />
          {!skillDna?.hasData ? (
            <EmptyState icon={<Radar size={20} />} title="Keep practicing" description={`Answer at least ${skillDna?.minRequired || 10} questions to build your skill profile.`} />
          ) : (
            <div style={{ display: "grid", gap: 11 }}>
              {Object.entries(skillDna.metrics).map(([key, m]) => (
                <div key={key}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>{METRIC_LABELS[key] || key}</span>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
                      {m.value == null ? "—" : `${m.value}%`}
                    </span>
                  </div>
                  {m.value == null ? (
                    <div style={{ fontSize: 10.5, color: "var(--text-tertiary)" }}>Needs more attempts ({m.sample} so far)</div>
                  ) : (
                    <ProgressBar value={m.value} color="var(--cyan)" />
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <SectionHeader icon={<Gauge size={16} />} title="Speed vs accuracy" />
          {!speedAccuracy?.hasData ? (
            <EmptyState icon={<Gauge size={20} />} title="Not enough timed attempts yet" description="Once you have enough timed answers, we'll classify your pattern here." />
          ) : (
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 800, color: "var(--text-primary)", marginBottom: 4 }}>{speedAccuracy.overall.label}</div>
              <p style={{ fontSize: 12, color: "var(--text-tertiary)", lineHeight: 1.6, marginBottom: 12 }}>{speedAccuracy.overall.description}</p>
              <div style={{ display: "flex", gap: 16 }}>
                <div>
                  <div style={{ fontSize: 10.5, color: "var(--text-tertiary)" }}>Accuracy</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>{speedAccuracy.overall.accuracy}%</div>
                </div>
                <div>
                  <div style={{ fontSize: 10.5, color: "var(--text-tertiary)" }}>Pace vs expected</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>{speedAccuracy.overall.avgPaceRatio}x</div>
                </div>
              </div>
            </div>
          )}
        </Card>

        <Card>
          <SectionHeader icon={<BrainCircuit size={16} />} title="Confidence calibration" />
          {!calibration?.hasData ? (
            <EmptyState icon={<BrainCircuit size={20} />} title="Not enough confidence data" description="Rate your confidence while answering — we'll compare it against your actual accuracy." />
          ) : (
            <div>
              <Pill
                color={calibration.verdict === "WELL_CALIBRATED" ? "var(--green)" : "var(--amber)"}
                bg={calibration.verdict === "WELL_CALIBRATED" ? "var(--green-soft)" : "var(--amber-soft)"}
              >
                {calibration.verdict === "OVERCONFIDENT" ? "Overconfident" : calibration.verdict === "UNDERCONFIDENT" ? "Underconfident" : "Well calibrated"}
              </Pill>
              <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
                {calibration.levels.map((l) => (
                  <div key={l.level} style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{l.level} confidence</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>{l.accuracy == null ? "—" : `${l.accuracy}% correct`}</span>
                  </div>
                ))}
              </div>
              {calibration.overconfidentTopic && (
                <p style={{ fontSize: 11.5, color: "var(--amber)", marginTop: 10, lineHeight: 1.5 }}>
                  Most overconfident in <strong>{calibration.overconfidentTopic.topic}</strong> — only {calibration.overconfidentTopic.accuracy}% correct despite high confidence.
                </p>
              )}
            </div>
          )}
        </Card>
      </div>

      <TopicMasteryGrid topics={dashboard?.topicMastery || []} />

      <Card>
        <SectionHeader icon={<History size={16} />} title={activeTopic ? `${activeTopic} accuracy trend` : "Accuracy trend"} sub={`${activeTopic ? "Priority topic" : "Overall performance"} · last ${analytics?.rangeDays || 30} days · live from saved attempts`} />
        {!analytics?.hasData ? (
          <EmptyState icon={<History size={20} />} title="No trend data yet" description="Complete a few aptitude questions to see your accuracy change over time." />
        ) : (
          <div style={{ width: "100%", height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics.dailyTrend || []} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fill: "var(--text-tertiary)", fontSize: 10 }} tickFormatter={(date) => date.slice(5)} minTickGap={24} />
                <YAxis domain={[0, 100]} tick={{ fill: "var(--text-tertiary)", fontSize: 10 }} tickFormatter={(value) => `${value}%`} width={38} />
                <Tooltip contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)", borderRadius: 8, color: "var(--text-primary)", fontSize: 12 }} formatter={(value) => [`${value}%`, activeTopic ? `${activeTopic} accuracy` : "Accuracy"]} labelFormatter={(date) => date} />
                <Line type="monotone" dataKey="accuracy" stroke="var(--accent)" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card>
        <SectionHeader icon={<History size={16} />} title="Recent activity" />
        {!dashboard?.recentAttempts?.length ? (
          <EmptyState icon={<History size={20} />} title="No attempts yet" description="Your recent answers will show up here." />
        ) : (
          <div style={{ display: "grid", gap: 6 }}>
            {dashboard.recentAttempts.map((a) => {
              const diffMeta = DIFFICULTY_META[a.difficulty] || {};
              return (
                <div key={a._id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 9, background: "var(--bg-elevated)" }}>
                  {a.isCorrect ? <CheckCircle2 size={15} color="var(--green)" /> : <XCircle size={15} color="var(--red)" />}
                  <span style={{ fontSize: 12.5, color: "var(--text-primary)", flex: 1 }}>{a.topic}</span>
                  <Pill color={diffMeta.color} bg={diffMeta.bg}>{a.difficulty}</Pill>
                  <span style={{ fontSize: 11, color: "var(--text-tertiary)", width: 44, textAlign: "right" }}>{a.timeSpent}s</span>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
