import { useEffect, useState } from "react";
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import api from "../../api/api";
import useRealtimeSocket from "../../realtime/useRealtimeSocket";

export default function CodingAnalyticsChart() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [showReport, setShowReport] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    setError("");
    api.get("/api/dashboard/coding-analytics?days=30", { signal: controller.signal })
      .then((response) => { setData(response.data); setLastUpdated(new Date()); })
      .catch((requestError) => {
        if (requestError.name !== "CanceledError" && requestError.code !== "ERR_CANCELED") setError("Unable to load coding analytics.");
      });
    return () => controller.abort();
  }, [reloadKey]);

  useRealtimeSocket({
    "realtime:ready": () => setReloadKey((value) => value + 1),
    "coding:analytics-updated": () => setReloadKey((value) => value + 1),
  });

  const summary = data?.summary || {};
  const chartData = (data?.dailyTrend || []).map((day) => ({
    date: day.date.slice(5),
    accepted: day.accepted,
    submissions: day.submissions,
    accuracy: day.submissions ? Math.round((day.accepted / day.submissions) * 100) : 0,
  }));
  const activeDays = chartData.filter((day) => day.submissions > 0);
  const selectedDay = chartData.find((day) => day.date === selectedDate) || activeDays[activeDays.length - 1] || null;
  const report = {
    activeDays: activeDays.length,
    incorrect: Math.max(0, (summary.submissions || 0) - (summary.accepted || 0)),
    bestDay: chartData.reduce((best, day) => (!best || day.accuracy > best.accuracy ? day : best), null),
    selectedDay,
  };

  return (
    <section style={{ background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: "18px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
        <div>
          <div style={{ color: "var(--accent-strong)", fontSize: 10, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase" }}>Live coding analytics</div>
          <h3 style={{ color: "var(--text-primary)", fontSize: 16, margin: "5px 0 0" }}>Last 30 days</h3>
        </div>
        <div style={{ display: "flex", gap: 14, color: "var(--text-tertiary)", fontSize: 11 }}>
          <span><b style={{ color: "var(--text-primary)" }}>{summary.submissions || 0}</b> submissions</span>
          <span><b style={{ color: "var(--green)" }}>{summary.accepted || 0}</b> accepted</span>
          <span><b style={{ color: "var(--accent-strong)" }}>{summary.acceptanceRate || 0}%</b> rate</span>
        </div>
        <button type="button" onClick={() => setShowReport((value) => !value)} style={reportButton}>{showReport ? "Hide report" : "Explore chart"}</button>
      </div>
      {showReport && (
        <div style={reportCard}>
          <strong style={{ color: "var(--text-primary)", fontSize: 12.5 }}>Coding report card</strong>
          <div style={reportGrid}>
            <ReportStat label="Submissions" value={summary.submissions || 0} />
            <ReportStat label="Accepted" value={summary.accepted || 0} color="var(--green)" />
            <ReportStat label="Not accepted" value={report.incorrect} color="var(--red)" />
            <ReportStat label="Active days" value={report.activeDays} />
            <ReportStat label="Acceptance rate" value={`${summary.acceptanceRate || 0}%`} color="var(--accent-strong)" />
            <ReportStat label="Best day" value={report.bestDay ? `${report.bestDay.accuracy}%` : "—"} color="var(--pink)" />
          </div>
          {report.selectedDay && <div style={focusDay}><b>{selectedDate ? `Selected ${report.selectedDay.date}` : "Latest active day"}</b><span>{report.selectedDay.submissions} submissions · {report.selectedDay.accepted} accepted · {report.selectedDay.accuracy}% acceptance</span></div>}
          <p style={reportText}>Orange bars are all code submissions, green bars are accepted submissions, and the pink line is daily acceptance rate. Click any date/bar to inspect that day. Values are fetched from saved submissions and refresh live.</p>
          {lastUpdated && <small style={updatedText}>Live data updated {lastUpdated.toLocaleTimeString()}</small>}
        </div>
      )}
      {error ? <div style={{ color: "var(--red)", fontSize: 12 }}>{error}</div> : !data?.hasData ? (
        <div style={{ color: "var(--text-tertiary)", fontSize: 12, padding: "24px 0" }}>Submit a solution to start your coding trend.</div>
      ) : (
        <div style={{ width: "100%", height: 190 }}>
          <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }} onClick={(state) => state?.activeLabel && setSelectedDate(state.activeLabel)}>
                <CartesianGrid stroke="var(--border-subtle)" strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fill: "var(--text-tertiary)", fontSize: 10 }} minTickGap={24} />
                <YAxis yAxisId="count" allowDecimals={false} tick={{ fill: "var(--text-tertiary)", fontSize: 10 }} width={28} />
                <YAxis yAxisId="percent" orientation="right" domain={[0, 100]} tick={{ fill: "var(--text-tertiary)", fontSize: 10 }} tickFormatter={(value) => `${value}%`} width={38} />
                <Tooltip labelFormatter={(label) => `Date: ${label}`} formatter={(value, name) => [name === "accuracy" ? `${value}%` : value, name === "accuracy" ? "Acceptance" : name === "submissions" ? "Submissions" : "Accepted"]} contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--border-default)", borderRadius: 8, color: "var(--text-primary)", fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} formatter={(value) => value === "accuracy" ? "Acceptance" : value === "submissions" ? "Submissions" : "Accepted"} />
                <Bar yAxisId="count" dataKey="submissions" fill="var(--accent-soft)" stroke="var(--accent)" radius={[3, 3, 0, 0]} name="submissions" />
                <Bar yAxisId="count" dataKey="accepted" fill="var(--green-soft)" stroke="var(--green)" radius={[3, 3, 0, 0]} name="accepted" />
                <Line yAxisId="percent" type="monotone" dataKey="accuracy" stroke="var(--pink)" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} name="accuracy" />
              </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
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
