const test = require("node:test");
const assert = require("node:assert/strict");
const { toUtcDateKey, addDays } = require("../utils/streakDates");
const { calculateStreakStats, uniqueSortedKeys } = require("../services/streakService");
const { BADGE_DEFINITIONS } = require("../config/badges");

test("normalizes timestamps to one UTC calendar day", () => {
    assert.equal(toUtcDateKey("2026-08-04T23:59:59.000Z"), "2026-08-04");
    assert.equal(toUtcDateKey("2026-08-05T00:00:00.000Z"), "2026-08-05");
    assert.equal(addDays("2026-08-04", 1), "2026-08-05");
});

test("deduplicates multiple accepted submissions on the same day", () => {
    const dates = uniqueSortedKeys([
        { createdAt: "2026-08-01T09:00:00Z" },
        { createdAt: "2026-08-01T12:00:00Z" },
        { createdAt: "2026-08-02T12:00:00Z" },
    ]);
    assert.deepEqual(dates, ["2026-08-01", "2026-08-02"]);
});

test("calculates current and longest streaks with today completed", () => {
    const stats = calculateStreakStats(["2026-08-01", "2026-08-02", "2026-08-04", "2026-08-05"], new Date("2026-08-05T12:00:00Z"), 6);
    assert.equal(stats.currentStreak, 2);
    assert.equal(stats.longestStreak, 2);
    assert.equal(stats.todayCompleted, true);
    assert.equal(stats.currentStreakStart, "2026-08-04");
});

test("calculates yesterday's streak while today's activity is still missing", () => {
    const stats = calculateStreakStats(["2026-08-01", "2026-08-02"], new Date("2026-08-03T12:00:00Z"), 2);
    assert.equal(stats.currentStreak, 2);
    assert.equal(stats.todayCompleted, false);
    assert.equal(stats.todayAcceptedCount, 0);
});

test("returns zeroes for no accepted activity", () => {
    const stats = calculateStreakStats([], new Date("2026-08-03T12:00:00Z"), 0);
    assert.equal(stats.currentStreak, 0);
    assert.equal(stats.longestStreak, 0);
    assert.equal(stats.activeDays, 0);
});

test("badge definitions are ordered milestones", () => {
    assert.deepEqual(BADGE_DEFINITIONS.map((badge) => badge.requirement), [3, 7, 14, 30, 60, 100, 180, 365]);
});
