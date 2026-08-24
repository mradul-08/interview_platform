import { useState, useEffect, useCallback } from "react";
import api from "../api/api";
import useRealtimeSocket from "../realtime/useRealtimeSocket";

export function useDashboard() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchDashboard = useCallback(async ({ background = false } = {}) => {
        if (!background) setLoading(true);
        const controller = new AbortController();
        // The dashboard aggregates submissions, problems, streaks, sheets,
        // leaderboard data, and interview counts. Five seconds is too short
        // for a cold database connection and leaves the page with no data
        // while hiding the cancellation as if the request never failed.
        const timeout = window.setTimeout(() => controller.abort(), 30000);
        try {
            const res = await api.get("/api/dashboard", { signal: controller.signal, timeout: 30000 });
            setData(res.data);
            setError(null);
        } catch (err) {
            if (!background) {
                const timedOut = err.name === "CanceledError" || err.code === "ERR_CANCELED";
                setError(timedOut
                    ? "Dashboard is taking longer than expected. Please try again."
                    : err.response?.data?.message || "Failed to load dashboard");
            }
        } finally {
            window.clearTimeout(timeout);
            if (!background) setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDashboard();
    }, [fetchDashboard]);

    useRealtimeSocket({
        "realtime:ready": () => fetchDashboard({ background: true }),
        "coding:analytics-updated": () => fetchDashboard({ background: true }),
        "aptitude:analytics-updated": () => fetchDashboard({ background: true }),
        "gamification:updated": () => fetchDashboard({ background: true }),
        "leaderboard:updated": () => fetchDashboard({ background: true }),
        "mock-interview:ended": () => fetchDashboard({ background: true }),
    });

    return { data, loading, error, refetch: fetchDashboard };
}
