// frontend/src/api/api.js
import axios from "axios";
import { getRealtimeSocket } from "../realtime/socket";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "http://localhost:5001",
    withCredentials: true,
    timeout: 15000,
});

let refreshPromise = null;

function readCookie(name) {
    const escaped = name.replace(/([.$?*|{}()[\]\\/+^])/g, "\\$1");
    const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : "";
}

// Auto-attach JWT token
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    const method = String(config.method || "get").toLowerCase();
    const csrfToken = readCookie("csrfToken");
    if (csrfToken && !["get", "head", "options"].includes(method)) {
        config.headers["x-csrf-token"] = csrfToken;
    }
    return config;
});

// Auto-logout on 401
api.interceptors.response.use(
    (res) => res,
    async (err) => {
        if (err.response?.status === 401 && !err.config?._authRetry && !String(err.config?.url || "").includes("/api/auth/refresh")) {
            try {
                if (!refreshPromise) {
                    refreshPromise = axios.post(
                        `${import.meta.env.VITE_API_URL || "http://localhost:5001"}/api/auth/refresh`,
                        {},
                        { withCredentials: true }
                    ).finally(() => { refreshPromise = null; });
                }
                const refreshRes = await refreshPromise;
                if (refreshRes.data?.token) {
                    localStorage.setItem("token", refreshRes.data.token);
                    if (refreshRes.data.user) {
                        localStorage.setItem("user", JSON.stringify(refreshRes.data.user));
                    }
                    err.config._authRetry = true;
                    err.config.headers = err.config.headers || {};
                    err.config.headers.Authorization = `Bearer ${refreshRes.data.token}`;
                    window.dispatchEvent(new Event("auth:refreshed"));
                    return api.request(err.config);
                }
            } catch {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                getRealtimeSocket().disconnect();
                window.location.href = "/login";
            }
        }
        return Promise.reject(err);
    }
);

export default api;
