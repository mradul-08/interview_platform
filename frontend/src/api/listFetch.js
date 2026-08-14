// frontend/src/api/listFetch.js
//
// Why this file exists:
// ProblemsPage.jsx had to write `res.data.problems || res.data` because the
// shape of list responses wasn't guaranteed. That's a symptom, not a fix —
// the next page you write will hit the exact same bug in a new place.
//
// Fix: ALL list-fetching goes through here. This is the only place that's
// allowed to know/guess about response shape. Every page gets back the same
// guaranteed shape: { items: [], total: 0, page: 1, totalPages: 1 }.
// If the backend shape ever changes again, you fix it in ONE file, not five.

import api from "./api";

function normalizeListResponse(data) {
    if (!data) return { items: [], total: 0, page: 1, limit: 0, totalPages: 1 };

    // New canonical shape (sheets, and any new endpoint going forward)
    if (Array.isArray(data.items)) {
        return {
            items: data.items,
            total: data.total ?? data.items.length,
            page: data.page ?? 1,
            limit: data.limit ?? data.items.length,
            totalPages: data.totalPages ?? 1,
        };
    }

    // Legacy shape from /api/problems: { problems, total, page, totalPages }
    if (Array.isArray(data.problems)) {
        return {
            items: data.problems,
            total: data.total ?? data.problems.length,
            page: data.page ?? 1,
            limit: data.problems.length,
            totalPages: data.totalPages ?? 1,
        };
    }

    // Bare array fallback (e.g. /api/problems/topics, /api/problems/companies)
    if (Array.isArray(data)) {
        return { items: data, total: data.length, page: 1, limit: data.length, totalPages: 1 };
    }

    // Unknown shape — fail loudly in dev instead of silently rendering nothing.
    if (import.meta.env.DEV) {
        console.warn("listFetch: unrecognized response shape", data);
    }
    return { items: [], total: 0, page: 1, limit: 0, totalPages: 1 };
}

// fetchList("/api/problems", { difficulty: "Easy" }) -> normalized shape, never throws on shape mismatch
export async function fetchList(url, params = {}) {
    const res = await api.get(url, { params });
    return normalizeListResponse(res.data);
}

// For non-list single-object endpoints (e.g. GET /api/sheets/:name) — just pass through,
// but still centralizes error handling so callers don't each need their own try/catch shape.
export async function fetchOne(url, params = {}) {
    const res = await api.get(url, { params });
    return res.data;
}
