const LEVEL_THRESHOLDS = [0, 100, 250, 500, 800, 1200, 1800, 2500];
const REWARD_COST = 500;
const DIFFICULTY_POINTS = { Easy: 10, Medium: 20, Hard: 30 };
const STREAK_MILESTONE_BONUSES = { 3: 10, 7: 25, 14: 50, 30: 100, 60: 200, 100: 500 };

function getLevel(points) {
    let level = 1;
    for (let index = 0; index < LEVEL_THRESHOLDS.length; index += 1) {
        if (points >= LEVEL_THRESHOLDS[index]) level = index + 1;
    }
    const currentLevelMinimum = LEVEL_THRESHOLDS[level - 1];
    const nextLevelMinimum = LEVEL_THRESHOLDS[level] ?? null;
    return {
        level,
        currentLevelMinimum,
        nextLevelMinimum,
        pointsToNextLevel: nextLevelMinimum === null ? 0 : Math.max(0, nextLevelMinimum - points),
        progressPercentage: nextLevelMinimum === null ? 100 : Math.round(((points - currentLevelMinimum) / (nextLevelMinimum - currentLevelMinimum)) * 100),
    };
}

module.exports = { LEVEL_THRESHOLDS, REWARD_COST, DIFFICULTY_POINTS, STREAK_MILESTONE_BONUSES, getLevel };
