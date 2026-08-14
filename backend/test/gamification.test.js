const test = require("node:test");
const assert = require("node:assert/strict");
const { DIFFICULTY_POINTS, getLevel, REWARD_COST } = require("../config/gamification");

test("difficulty rewards are fixed backend rules", () => {
    assert.deepEqual(DIFFICULTY_POINTS, { Easy: 10, Medium: 20, Hard: 30 });
});

test("levels derive from the real balance thresholds", () => {
    assert.equal(getLevel(0).level, 1);
    assert.equal(getLevel(100).level, 2);
    assert.equal(getLevel(500).level, 4);
    assert.equal(getLevel(640).pointsToNextLevel, 160);
});

test("reward price is a configured rule", () => assert.equal(REWARD_COST, 500));
