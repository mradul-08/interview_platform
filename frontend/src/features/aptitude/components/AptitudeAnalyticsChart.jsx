import { useEffect, useState } from "react";
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import aptitudeApi from "../lib/api";
import { Card, EmptyState, SectionHeader } from "../lib/ui";

export default function AptitudeAnalyticsChart({ refreshKey = 0 }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showReport, setShowReport] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    aptitudeApi.analytics(controller.signal)
      .then((response) => { setData(response.data?.data || null); setLastUpdated(new Date()); })
      .catch((error) => {
        if (error.name !== "CanceledError" && error.code !== "ERR_CANCELED") setData(null);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [refreshKey]);

  const chartData = (data?.dailyTrend || []).map((day) => ({
    date: day.date.slice(5),
    attempts: day.attempts,
    correct: day.correct,
    accuracy: day.accuracy,
  }));
  const accuracy = data?.summary?.accuracy || 0;
  const activeDays = chartData.filter((day) => day.attempts > 0);
  const bestDay = activeDays.reduce((best, day) => (!best || day.accuracy > best.accuracy ? day : best), null);
  const selectedDay = chartData.find((day) => day.date === selectedDate) || activeDays[activeDays.length - 1] || null;
  const report = { activeDays: activeDays.length, bestDay, selectedDay, incorrect: Math.max(0, (data?.summary?.totalAttempts || 0) - (data?.summary?.totalCorrect || 0)) };

  return (
    <Card>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <SectionHeader icon={<span style={{ color: "var(--accent-strong)", fontWeight: 900 }}>↗</span>} title="Aptitude performance" sub="Daily answers and accuracy from your saved attempts" />
        <button type="button" onClick={() => setShowReport((value) => !value)} style={reportButton}>{showReport ? "Hide report" : "Explore chart"}</button>
      </div>
      {showReport && (
        <div style={reportCard}>
          <strong style={{ color: "var(--text-primary)", fontSize: 12.5 }}>Aptitude report card</strong>
          <div style={reportGrid}>
            <ReportStat label="Total attempts" value={data?.summary?.totalAttempts || 0} />
            <ReportStat label="Correct" value={data?.summary?.totalCorrect || 0} color="var(--green)" />
            <ReportStat label="Incorrect" value={report.incorrect} color="var(--red)" />
            <ReportStat label="Active days" value={report.activeDays} />
            <ReportStat label="Overall accuracy" value={`${accuracy}%`} color="var(--accent-strong)" />
            <ReportStat label="Best day" value={report.bestDay ? `${report.bestDay.accuracy}%` : "—"} color="var(--pink)" />
          </div>
          {report.selectedDay && <div style={focusDay}><b>{selectedDate ? `Selected ${report.selectedDay.date}` : "Latest active day"}</b><span>{report.selectedDay.attempts} attempts · {report.selectedDay.correct} correct · {report.selectedDay.accuracy}% accuracy</span></div>}
          <p style={reportText}>Orange bars show all questions attempted, green bars show correct answers, and the pink line shows daily accuracy. Click any date/bar to inspect that day. Values are fetched from saved attempts and refresh live.</p>
          {lastUpdated && <small style={updatedText}>Live data updated {lastUpdated.toLocaleTimeString()}</small>}
        </div>
      )}
      {loading && !data ? (
        <div className="cv-aptitude-skeleton" style={{ height: 260 }} aria-label="Loading aptitude analytics" />
      ) : !data?.hasData ? (
        <EmptyState title="Build your aptitude baseline" description="Answer a few questions to see attempts, correct answers, and accuracy here." />
      ) : (
        <>
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap", marginBottom: 12, fontSize: 11.5, color: "var(--text-tertiary)" }}>
            <span><b style={{ color: "var(--text-primary)", fontSize: 16 }}>{data.summary.totalAttempts}</b> total attempts</span>
            <span><b style={{ color: "var(--green)", fontSize: 16 }}>{data.summary.totalCorrect}</b> correct</span>
            <span><b style={{ color: "var(--accent-strong)", fontSize: 16 }}>{accuracy}%</b> overall accuracy</span>
          </div>
          <div style={{ width: "100%", height: 230 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }} onClick={(state) => state?.activeLabel && setSelectedDate(state.activeLabel)}>
                <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fill: "var(--text-tertiary)", fontSize: 10 }} minTickGap={24} />
                <YAxis yAxisId="count" allowDecimals={false} tick={{ fill: "var(--text-tertiary)", fontSize: 10 }} width={28} />
                <YAxis yAxisId="percent" orientation="right" domain={[0, 100]} tick={{ fill: "var(--text-tertiary)", fontSize: 10 }} tickFormatter={(value) => `${value}%`} width={38} />
                <Tooltip
                  labelFormatter={(label) => `Date: ${label}`}
                  formatter={(value, name) => [name === "accuracy" ? `${value}%` : value, name === "accuracy" ? "Accuracy" : name === "attempts" ? "Attempts" : "Correct"]}
                  contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)", borderRadius: 8, color: "var(--text-primary)", fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 11, color: "var(--text-secondary)" }} formatter={(value) => value === "accuracy" ? "Accuracy" : value === "attempts" ? "Attempts" : "Correct"} />
                <Bar yAxisId="count" dataKey="attempts" fill="var(--accent-soft)" stroke="var(--accent)" radius={[3, 3, 0, 0]} name="attempts" />
                <Bar yAxisId="count" dataKey="correct" fill="var(--green-soft)" stroke="var(--green)" radius={[3, 3, 0, 0]} name="correct" />
                <Line yAxisId="percent" type="monotone" dataKey="accuracy" stroke="var(--pink)" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} name="accuracy" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </Card>
  );
}

function ReportStat({ label, value, color }) {
  return <div><div style={{ color: "var(--text-tertiary)", fontSize: 10 }}>{label}</div><b style={{ color: color || "var(--text-primary)", fontSize: 15, fontFamily: "var(--font-mono)" }}>{value}</b></div>;
}

const reportButton = { border: "1px solid var(--border-default)", background: "var(--bg-elevated)", color: "var(--accent-strong)", borderRadius: 8, padding: "6px 9px", cursor: "pointer", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" };
const reportCard = { margin: "0 0 14px", padding: "12px 14px", borderRadius: 10, background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)" };
const reportGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 10, marginTop: 10 };
const reportText = { margin: "11px 0 0", color: "var(--text-secondary)", fontSize: 11.5, lineHeight: 1.55 };
const focusDay = { display: "flex", flexWrap: "wrap", gap: 8, marginTop: 11, padding: "8px 10px", borderRadius: 8, background: "var(--bg-surface)", color: "var(--text-secondary)", fontSize: 11.5 };
const updatedText = { display: "block", marginTop: 8, color: "var(--text-tertiary)", fontSize: 10.5 };
