import { useNavigate } from "react-router-dom";
import CodingHeatmap from "../../components/dashboard/CodingHeatmap";
import CodingAnalyticsChart from "../../components/dashboard/CodingAnalyticsChart";
import DashboardStreakCard from "../../components/dashboard/DashboardStreakCard";

// ── Micro stat card ───────────────────────────────────────────────
const StatCard = ({ label, value, sub, color }) => (
  <div className="cv-card" style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 8 }}>
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: color, opacity: 0.7 }} />
    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
    <div style={{ fontSize: 28, fontWeight: 900, color: "var(--text-primary)", fontFamily: "var(--font-mono)", letterSpacing: "-0.04em", lineHeight: 1 }}>{value}</div>
    {sub && <div style={{ fontSize: 11.5, color: "var(--text-tertiary)" }}>{sub}</div>}
  </div>
);

// ── Section header ────────────────────────────────────────────────
const SectionHeader = ({ title, action, onAction }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
    <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", margin: 0, letterSpacing: "-0.01em" }}>{title}</h3>
    {action && <button onClick={onAction} style={{ fontSize: 12, color: "var(--accent-strong)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-sans)" }}>{action} →</button>}
  </div>
);

// ── Card wrapper ──────────────────────────────────────────────────
const Card = ({ children, style }) => (
  <div className="cv-card" style={{ padding: "18px 20px", ...style }}>
    {children}
  </div>
);

// ── Diff badge ────────────────────────────────────────────────────
const DiffBadge = ({ d }) => {
  const cfg = {
    Easy:   { color: "var(--green)",        bg: "var(--green-soft)" },
    Medium: { color: "var(--medium-color)", bg: "var(--medium-soft)" },
    Hard:   { color: "var(--red)",          bg: "var(--red-soft)" },
  }[d] || {};
  return <span style={{ fontSize: 10.5, fontWeight: 700, padding: "2px 7px", borderRadius: 5, color: cfg.color, background: cfg.bg, fontFamily: "var(--font-mono)" }}>{d}</span>;
};

const TopProblemRow = ({ problem, onClick }) => (
  <button
    onClick={onClick}
    className="transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--border-default)] hover:shadow-[var(--shadow-sm)]"
    style={{
      width: "100%",
      display: "grid",
      gridTemplateColumns: "34px 1fr auto",
      gap: 10,
      alignItems: "center",
      padding: "10px 12px",
      borderRadius: "var(--radius-md)",
      border: "1px solid var(--border-subtle)",
      background: "var(--bg-elevated)",
      cursor: "pointer",
      textAlign: "left",
    }}
  >
    <div style={{ width: 24, height: 24, borderRadius: 7, background: "var(--accent-soft)", color: "var(--accent-strong)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, fontFamily: "var(--font-mono)" }}>
      {problem.rank}
    </div>
    <div style={{ minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {problem.title}
        </span>
        <DiffBadge d={problem.difficulty} />
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 5 }}>
        {(problem.topic || []).slice(0, 2).map((t) => (
          <span key={t} style={{ fontSize: 10.5, padding: "2px 7px", borderRadius: 5, background: "var(--bg-elevated-2)", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
            {t}
          </span>
        ))}
      </div>
    </div>
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>{problem.points} pts</span>
      <span style={{ fontSize: 11, color: "var(--text-tertiary)", fontFamily: "var(--font-mono)" }}>{problem.acceptanceRate}%</span>
    </div>
  </button>
);

// ── Coding heatmap ─────────────────────────────────────────────────
// ── Main Overview ──────────────────────────────────────────────────
export default function Overview({ data }) {
  const navigate = useNavigate();
  const { user, stats, resumeLearning, todaysRoadmap, dailyChallenge, dsaProgress, companySheets, leaderboard } = data;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── Hero greeting ── */}
      <div className="cv-card" style={{ borderRadius: "var(--radius-xl)", padding: "24px 28px" }}>
        {/* Accent bar */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "var(--accent-grad)" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <p style={{ fontSize: 11.5, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 4px" }}>Welcome back</p>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: "var(--text-primary)", margin: "0 0 14px", letterSpacing: "-0.035em" }}>
              {user?.name || "Student"} 👋
            </h1>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button className="cv-button-primary" onClick={() => navigate("/dashboard/problems")}>
                Continue Solving →
              </button>
              <button className="cv-button-secondary" onClick={() => navigate("/dashboard/mock")}>
                Mock Interview
              </button>
              <button className="cv-button-secondary" onClick={() => navigate("/dashboard/aptitude")}>
                Aptitude Test
              </button>
            </div>
          </div>
          {/* Placement readiness ring */}
          <div style={{ textAlign: "center" }}>
            <div style={{ position: "relative", width: 90, height: 90 }}>
              <svg width="90" height="90" viewBox="0 0 90 90">
                <circle cx="45" cy="45" r="38" fill="none" stroke="var(--bg-elevated-2)" strokeWidth="8" />
                <circle cx="45" cy="45" r="38" fill="none" stroke="var(--accent)" strokeWidth="8"
                  strokeDasharray={`${(stats.placementReadiness / 100) * 238.76} ${238.76}`}
                  strokeDashoffset={238.76 / 4} strokeLinecap="round" />
              </svg>
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontSize: 18, fontWeight: 900, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>{stats.placementReadiness}%</span>
              </div>
            </div>
            <div style={{ fontSize: 10.5, color: "var(--text-tertiary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 4 }}>Placement<br />Readiness</div>
          </div>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
        <StatCard label="Problems Solved" value={stats.problemsSolved} color="var(--accent)" />
        <StatCard label="Current Streak" value={`${stats.currentStreak}d`} sub={`Longest: ${stats.longestStreak}d`} color="var(--amber)" />
        <StatCard label="Total Points" value={stats.points.toLocaleString()} color="var(--cyan)" />
        <StatCard label="Global Rank" value={stats.rank ? `#${stats.rank}` : "—"} sub="by points" color="var(--green)" />
        <StatCard label="Mock Interviews" value={stats.mockInterviewsAttended} color="var(--red)" />
      </div>

      <DashboardStreakCard />

      {/* ── Main 2-col grid ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16 }}>

        {/* LEFT column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* Resume Learning */}
          {resumeLearning?.isReady ? (
            <Card style={{ borderLeft: "3px solid var(--accent)" }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10, fontWeight: 700, color: "var(--accent-strong)", background: "var(--accent-soft)", borderRadius: 5, padding: "3px 8px", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
                Resume Learning
              </div>
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 8px" }}>{resumeLearning.problem.title}</p>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <DiffBadge d={resumeLearning.problem.difficulty} />
                {(resumeLearning.problem.tags || []).slice(0, 3).map(t => (
                  <span key={t} style={{ fontSize: 10.5, padding: "2px 7px", borderRadius: 5, background: "var(--bg-elevated)", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>{t}</span>
                ))}
                <span style={{ fontSize: 11, color: resumeLearning.solved ? "var(--green)" : "var(--amber)", marginLeft: "auto" }}>
                  Last: {resumeLearning.lastVerdict}
                </span>
              </div>
              <button onClick={() => navigate(`/dashboard/problems/${resumeLearning.problem.slug}`)}
                style={{ padding: "9px 18px", background: "var(--accent)", color: "white", borderRadius: "var(--radius-md)", fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer", fontFamily: "var(--font-sans)" }}>
                Continue Problem →
              </button>
            </Card>
          ) : (
            <Card style={{ borderLeft: "3px solid var(--border-strong)" }}>
              <p style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 4px" }}>Resume Learning</p>
              <p style={{ fontSize: 12.5, color: "var(--text-tertiary)", margin: "0 0 12px" }}>Solve your first problem to continue where you left off.</p>
              <button onClick={() => navigate("/dashboard/problems")} style={{ padding: "7px 14px", background: "var(--accent-soft)", color: "var(--accent-strong)", borderRadius: "var(--radius-sm)", fontSize: 12.5, fontWeight: 600, border: "none", cursor: "pointer" }}>
                Browse Problems →
              </button>
            </Card>
          )}

          {/* Today's Plan */}
          <Card>
            <SectionHeader title="Today's Plan" action="See all problems" onAction={() => navigate("/dashboard/problems")} />
            {todaysRoadmap?.isReady ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {(todaysRoadmap.tasks || []).map((t, i) => (
                  <div key={t.id || i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)", cursor: "pointer", transition: "background 0.12s" }}
                    onClick={() => navigate(`/dashboard/problems/${t.slug}`)}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--bg-elevated)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <div style={{ width: 20, height: 20, borderRadius: 6, background: "var(--bg-elevated-2)", border: "1px solid var(--border-default)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                    </div>
                    <span style={{ fontSize: 13, color: "var(--text-primary)", flex: 1 }}>{t.label}</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 13, color: "var(--text-tertiary)", margin: 0 }}>
                No problems seeded yet. Run <code style={{ fontFamily: "var(--font-mono)", background: "var(--bg-elevated-2)", padding: "1px 5px", borderRadius: 4 }}>node seed/seedProblems.js</code> to populate problems.
              </p>
            )}
          </Card>

          {/* Top 100 Problems */}
          <Card>
            <SectionHeader title={`Top ${data?.topProblems?.total || 0} Problems`} action="Open bank" onAction={() => navigate("/dashboard/problems")} />
            {data?.topProblems?.isReady ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <p style={{ fontSize: 12.5, color: "var(--text-tertiary)", margin: "0 0 4px" }}>
                  The strongest 100 problems from your published bank, ranked by points and freshness.
                </p>
                {(data.topProblems.items || []).slice(0, 12).map((problem) => (
                  <TopProblemRow
                    key={problem.slug}
                    problem={problem}
                    onClick={() => navigate(`/dashboard/problems/${problem.slug}`)}
                  />
                ))}
                {data.topProblems.total > 12 && (
                  <button
                    onClick={() => navigate("/dashboard/problems")}
                    style={{
                      marginTop: 4,
                      padding: "8px 12px",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border-default)",
                      background: "var(--bg-elevated)",
                      color: "var(--text-secondary)",
                      fontSize: 12.5,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    View all {data.topProblems.total} problems
                  </button>
                )}
              </div>
            ) : (
              <p style={{ fontSize: 12.5, color: "var(--text-tertiary)", margin: 0 }}>No published problems yet.</p>
            )}
          </Card>

          {/* Daily Challenge */}
          {dailyChallenge?.isReady && (
            <Card style={{ position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", top: 0, right: 0, padding: "6px 12px", background: "var(--amber-soft)", borderBottomLeftRadius: "var(--radius-md)", fontSize: 11, fontWeight: 700, color: "var(--amber)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Daily
              </div>
              <SectionHeader title="Daily Challenge" />
              <p style={{ fontFamily: "var(--font-mono)", fontSize: 14.5, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 8px" }}>{dailyChallenge.problem.title}</p>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <DiffBadge d={dailyChallenge.problem.difficulty} />
                <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{dailyChallenge.problem.acceptanceRate}% acceptance</span>
              </div>
              <button onClick={() => navigate(`/dashboard/problems/${dailyChallenge.problem.slug}`)}
                disabled={dailyChallenge.solvedByMe}
                style={{ padding: "8px 18px", background: dailyChallenge.solvedByMe ? "var(--green-soft)" : "var(--accent)", color: dailyChallenge.solvedByMe ? "var(--green)" : "white", borderRadius: "var(--radius-md)", fontSize: 13, fontWeight: 700, border: dailyChallenge.solvedByMe ? "1px solid var(--green)" : "none", cursor: dailyChallenge.solvedByMe ? "default" : "pointer" }}>
                {dailyChallenge.solvedByMe ? "✓ Solved Today" : "Solve Now →"}
              </button>
            </Card>
          )}

          <CodingHeatmap />
          <CodingAnalyticsChart />
        </div>

        {/* RIGHT column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* DSA Progress */}
          <Card>
            <SectionHeader title="DSA Progress" action="Problems" onAction={() => navigate("/dashboard/problems")} />
            {dsaProgress?.isReady ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {(dsaProgress.topics || []).slice(0, 8).map(t => (
                  <div key={t.name}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 120 }}>{t.name}</span>
                      <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-tertiary)" }}>{t.solved}/{t.total}</span>
                    </div>
                    <div style={{ height: 5, background: "var(--bg-elevated-2)", borderRadius: 100, overflow: "hidden" }}>
                      <div style={{ width: `${t.pct}%`, height: "100%", background: t.pct === 100 ? "var(--green)" : "var(--accent)", borderRadius: 100, transition: "width 0.6s var(--ease-out)" }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: 12.5, color: "var(--text-tertiary)", margin: 0 }}>No problems in the bank yet.</p>
            )}
          </Card>

          {/* Company Sheets */}
          <Card>
            <SectionHeader title="Sheets" action="View All" onAction={() => navigate("/dashboard/sheets")} />
            {companySheets?.isReady ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {(companySheets.sheets || []).map(s => {
                  const color = s.name === "Blind75" ? "var(--accent)" : "var(--cyan)";
                  return (
                    <div key={s.name} onClick={() => navigate(`/dashboard/sheets?sheet=${s.name}`)}
                      style={{ padding: "12px 14px", background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", cursor: "pointer" }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = "var(--accent)"}
                      onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border-subtle)"}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{s.name}</span>
                        <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--text-tertiary)" }}>{s.solved}/{s.total}</span>
                      </div>
                      <div style={{ height: 4, background: "var(--bg-elevated-2)", borderRadius: 100, overflow: "hidden", marginBottom: 4 }}>
                        <div style={{ width: `${s.pct}%`, height: "100%", background: color, borderRadius: 100 }} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "var(--font-mono)", color }}>{s.pct}%</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p style={{ fontSize: 12.5, color: "var(--text-tertiary)", margin: 0 }}>No sheets seeded yet.</p>
            )}
          </Card>

          {/* Leaderboard */}
          <Card>
            <SectionHeader title="Leaderboard" action="Global" onAction={() => navigate("/dashboard/leaderboard")} />
            {leaderboard?.isReady ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {(leaderboard.top || []).map(u => (
                  <div key={u.rank} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: "var(--radius-sm)", background: u.isMe ? "var(--accent-soft)" : "transparent", border: u.isMe ? "1px solid var(--accent)" : "1px solid transparent" }}>
                    <span style={{ fontSize: 12, fontWeight: 800, color: u.rank <= 3 ? "var(--amber)" : "var(--text-tertiary)", minWidth: 20, fontFamily: "var(--font-mono)" }}>#{u.rank}</span>
                    <div style={{ width: 26, height: 26, borderRadius: "50%", background: "var(--accent-grad)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "white" }}>{u.name[0]}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12.5, fontWeight: 600, color: u.isMe ? "var(--accent-strong)" : "var(--text-primary)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.name}{u.isMe ? " (you)" : ""}</p>
                      <p style={{ fontSize: 10.5, color: "var(--text-tertiary)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.college}</p>
                    </div>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>{u.points.toLocaleString()}</span>
                  </div>
                ))}
                {leaderboard.myRank > 5 && (
                  <p style={{ fontSize: 11, color: "var(--text-tertiary)", textAlign: "center", margin: "4px 0 0", fontFamily: "var(--font-mono)" }}>Your global rank: #{leaderboard.myRank}</p>
                )}
              </div>
            ) : (
              <p style={{ fontSize: 12.5, color: "var(--text-tertiary)", margin: 0 }}>No other students yet.</p>
            )}
          </Card>

          {/* Coming soon placeholders */}
          {[
            { title: "Aptitude Progress", path: "/dashboard/aptitude" },
            { title: "Upcoming Interviews", path: "/dashboard/mock" },
          ].map(it => (
            <div key={it.title} onClick={() => navigate(it.path)} style={{ padding: "14px 16px", background: "var(--bg-surface)", border: "1px dashed var(--border-default)", borderRadius: "var(--radius-lg)", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", margin: "0 0 2px" }}>{it.title}</p>
                <p style={{ fontSize: 11.5, color: "var(--text-tertiary)", margin: 0 }}>Coming soon — click to learn more</p>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
