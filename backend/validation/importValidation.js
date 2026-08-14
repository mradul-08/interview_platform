function assert(condition, message) {
    if (!condition) throw new Error(message);
}

function parseImportRequest(body = {}) {
    const source = String(body.source || "").trim();
    assert(["codeforces", "leetcode", "bundled", "sync", "ai"].includes(source), "Invalid import source");

    const limit = body.limit === undefined ? undefined : Number(body.limit);
    const batchSize = body.batchSize === undefined ? undefined : Number(body.batchSize);
    if (limit !== undefined) {
        assert(Number.isInteger(limit) && limit >= 1 && limit <= 5000, "limit must be an integer between 1 and 5000");
    }
    if (batchSize !== undefined) {
        assert(Number.isInteger(batchSize) && batchSize >= 1 && batchSize <= 500, "batchSize must be an integer between 1 and 500");
    }

    return {
        source,
        limit,
        batchSize,
        requestedBy: body.requestedBy ? String(body.requestedBy) : "",
        meta: body.meta && typeof body.meta === "object" ? body.meta : {},
    };
}

function parseProblemPayload(body = {}) {
    assert(body && typeof body === "object", "Problem payload must be an object");
    assert(typeof body.title === "string" && body.title.trim(), "Title is required");
    assert(typeof body.source === "string" && body.source.trim(), "Source is required");
    assert(typeof body.sourceId === "string" && body.sourceId.trim(), "Source ID is required");
    const difficulty = String(body.difficulty || "");
    assert(["Easy", "Medium", "Hard"].includes(difficulty), "Difficulty must be Easy, Medium, or Hard");
    return body;
}

module.exports = { parseImportRequest, parseProblemPayload };
