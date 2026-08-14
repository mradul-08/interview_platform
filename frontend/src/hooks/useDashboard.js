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
        const timeout = window.setTimeout(() => controller.abort(), 5000);
        try {
            const res = await api.get("/api/dashboard", { signal: controller.signal });
            setData(res.data);
            setError(null);
        } catch (err) {
            if (!background && err.name !== "CanceledError" && err.code !== "ERR_CANCELED") {
                setError(err.response?.data?.message || "Failed to load dashboard");
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
    });

    return { data, loading, error, refetch: fetchDashboard };
}
