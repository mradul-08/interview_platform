import { useCallback, useEffect, useState } from "react";
import { Medal, RefreshCcw, Trophy } from "lucide-react";
import api from "../../api/api";
import useRealtimeSocket from "../../realtime/useRealtimeSocket";

export default function LeaderboardPage() {
  const [state, setState] = useState({ rows: [], myRank: null, loading: true, error: "" });
  const load = useCallback(async () => { try { const response = await api.get("/api/leaderboard", { params: { page: 1, limit: 50 } }); setState({ rows: response.data?.leaderboard || [], myRank: response.data?.myRank || null, loading: false, error: "" }); } catch (error) { setState((current) => ({ ...current, loading: false, error: error.response?.data?.message || "Unable to load leaderboard" })); } }, []);
  useEffect(() => { load(); const timer = window.setInterval(load, 15000); return () => window.clearInterval(timer); }, [load]);
  useRealtimeSocket({ "leaderboard:updated": load, "realtime:ready": load });
  return <main className="cv-page-shell study-leaderboard-page"><div className="study-leaderboard-header"><div><span className="study-eyebrow"><Trophy size={13} /> Live ranking</span><h1>Global leaderboard</h1><p>Points and accepted problem progress from CodeVerse learners.</p></div><button className="study-secondary" onClick={load}><RefreshCcw size={14} /> Refresh</button></div>{state.myRank && <div className="study-my-rank"><Medal size={18} /><strong>Your current rank: #{state.myRank}</strong><span>Ranking refreshes automatically after accepted submissions.</span></div>}{state.loading ? <div className="study-loading">Loading live ranking…</div> : state.error ? <div className="study-empty"><strong>{state.error}</strong><button className="study-secondary" onClick={load}>Try again</button></div> : <div className="study-ranking-table"><div className="study-ranking-head"><span>Rank</span><span>Learner</span><span>Points</span><span>Solved</span><span>Streak</span></div>{state.rows.map((row) => <div className="study-ranking-row" key={row.id}><b>#{row.rank}</b><span><strong>{row.name}</strong><small>{row.college}</small></span><strong>{row.points || 0}</strong><span>{row.problemsSolved || 0}</span><span>{row.currentStreak || 0}d</span></div>)}</div>}</main>;
}
