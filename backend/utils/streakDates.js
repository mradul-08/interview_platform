function toUtcDateKey(value) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) throw new TypeError("Invalid date");
    return date.toISOString().slice(0, 10);
}

function dateFromKey(key) {
    return new Date(`${key}T00:00:00.000Z`);
}

function addDays(key, amount) {
    const date = dateFromKey(key);
    date.setUTCDate(date.getUTCDate() + amount);
    return toUtcDateKey(date);
}

module.exports = { toUtcDateKey, dateFromKey, addDays };
