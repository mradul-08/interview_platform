import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Medal, RefreshCcw, Trophy } from "lucide-react";
import api from "../../api/api";
import useRealtimeSocket from "../../realtime/useRealtimeSocket";

export default function LeaderboardPage() {
  const [state, setState] = useState({ rows: [], myRank: null, loading: true, error: "", changedIds: [] });
  const currentRowsRef = useRef([]);
  const currentUserId = useMemo(() => { try { const user = JSON.parse(localStorage.getItem("user") || "{}"); return String(user._id || user.id || user.userId || ""); } catch { return ""; } }, []);
  const load = useCallback(async () => { try { const response = await api.get("/api/leaderboard", { params: { page: 1, limit: 50 } }); const rows = response.data?.leaderboard || []; currentRowsRef.current = rows; setState({ rows, myRank: response.data?.myRank || null, loading: false, error: "", changedIds: [] }); } catch (error) { setState((current) => ({ ...current, loading: false, error: error.response?.data?.message || "Unable to load leaderboard" })); } }, []);
  const applyRealtimeSnapshot = useCallback((snapshot) => {
    if (!Array.isArray(snapshot?.leaderboard)) return;
    const changedIds = snapshot.leaderboard.filter((nextRow) => {
      const previous = currentRowsRef.current.find((row) => String(row.id) === String(nextRow.id));
      return previous && (previous.rank !== nextRow.rank || previous.points !== nextRow.points || previous.problemsSolved !== nextRow.problemsSolved || previous.currentStreak !== nextRow.currentStreak);
    }).map((row) => String(row.id));
    currentRowsRef.current = snapshot.leaderboard;
    setState((current) => ({
      ...current,
      rows: snapshot.leaderboard,
      myRank: snapshot.rankByUser?.[currentUserId] || current.myRank,
      loading: false,
      error: "",
      changedIds,
    }));
    window.setTimeout(() => setState((current) => ({ ...current, changedIds: [] })), 1200);
  }, [currentUserId]);
  useEffect(() => { load(); }, [load]);
  useRealtimeSocket({ "leaderboard:updated": applyRealtimeSnapshot });
  return <main className="cv-page-shell study-leaderboard-page"><div className="study-leaderboard-header"><div><span className="study-eyebrow"><Trophy size={13} /> Live ranking</span><h1>Global leaderboard</h1><p>Points and accepted problem progress from CodeVerse learners.</p></div><button className="study-secondary" onClick={load}><RefreshCcw size={14} /> Refresh</button></div>{state.myRank && <div className="study-my-rank"><Medal size={18} /><strong>Your current rank: #{state.myRank}</strong><span>Ranking refreshes automatically after accepted submissions.</span></div>}{state.loading ? <div className="study-loading">Loading live ranking…</div> : state.error ? <div className="study-empty"><strong>{state.error}</strong><button className="study-secondary" onClick={load}>Try again</button></div> : <div className="study-ranking-table"><div className="study-ranking-head"><span>Rank</span><span>Learner</span><span>Points</span><span>Solved</span><span>Streak</span></div>{state.rows.map((row) => <div className={`study-ranking-row ${state.changedIds.includes(String(row.id)) ? "is-live-updated" : ""}`} key={row.id}><b>#{row.rank}</b><span><strong>{row.name}</strong><small>{row.college}</small></span><strong>{row.points || 0}</strong><span>{row.problemsSolved || 0}</span><span>{row.currentStreak || 0}d</span></div>)}</div>}</main>;
}
