const cache = new Map();

function setCache(key, value, ttlMs = 60000) {
    cache.set(key, {
        value,
        expiresAt: Date.now() + ttlMs,
    });
}

function getCache(key) {
    const entry = cache.get(key);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
        cache.delete(key);
        return null;
    }
    return entry.value;
}

function clearCache(prefix = "") {
    for (const key of cache.keys()) {
        if (!prefix || key.startsWith(prefix)) cache.delete(key);
    }
}

module.exports = { setCache, getCache, clearCache };
