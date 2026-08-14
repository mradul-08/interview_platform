// backend/utils/paginate.js
// Single source of truth for list-endpoint response shape.
// Every controller that returns a list MUST use this, so the frontend
// never has to guess/guard against different shapes from different routes.

function buildPagination(total, page, limit) {
    const p = Math.max(1, parseInt(page) || 1);
    const l = Math.max(1, Math.min(200, parseInt(limit) || 50)); // hard cap protects DB
    return {
        skip: (p - 1) * l,
        limit: l,
        page: p,
        totalPages: Math.max(1, Math.ceil(total / l)),
    };
}

// Wrap any list payload in the canonical shape.
// items: array, total: number, page/limit: from req.query
function paginatedResponse(items, total, page, limit) {
    const { page: p, totalPages, limit: l } = buildPagination(total, page, limit);
    return { items, total, page: p, limit: l, totalPages };
}

module.exports = { buildPagination, paginatedResponse };
