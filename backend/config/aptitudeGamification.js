const APTITUDE_XP = { Easy: 10, Medium: 20, Hard: 30 };
const DAILY_MISSION_XP = 50;
const RETRY_XP = 5;
const MIN_ATTEMPTS_FOR_ANALYTICS = 5;
const MIN_ATTEMPTS_FOR_TOPIC_MASTERY = 3;
const MIN_ATTEMPTS_FOR_READINESS = 10;
const MIN_ATTEMPTS_FOR_WEAKNESS = 5;
const MIN_MISTAKES_FOR_MISTAKE_LAB = 5;
const MIN_ATTEMPTS_FOR_SKILL_DNA_CATEGORY = 8;
const MIN_ATTEMPTS_FOR_SPEED_ACCURACY = 10;
const MIN_SAMPLE_FOR_SUBMETRIC = 5;
const REVISION_INTERVAL_DAYS = [1, 3, 7, 14];
const READINESS_WEIGHTS = { accuracy: 0.35, difficultyBalance: 0.20, consistency: 0.20, speedEfficiency: 0.15, recentPerformance: 0.10 };
const MASTERY_THRESHOLDS = { MASTERED: 80, LEARNING: 50, WEAK: 0 };
const WEAKNESS_ACCURACY_THRESHOLD = 60;
const APTITUDE_BADGES = [
  { id: "apt-first-solve", name: "First Solve", description: "Solved your first aptitude question", icon: "ðŸŽ¯", rarity: "common", category: "milestone" },
  { id: "apt-speed-demon", name: "Speed Demon", description: "Solved 10 questions under target time", icon: "⚡", rarity: "uncommon", category: "speed", requirement: { underTargetSolves: 10 } },
  { id: "apt-precision", name: "Precision", description: "Achieved 90%+ accuracy across 20+ attempts", icon: "ðŸŽ–ï¸", rarity: "rare", category: "accuracy", requirement: { accuracy: 90, minAttempts: 20 } },
  { id: "apt-quant-master", name: "Quant Master", description: "Achieved 80%+ mastery in Quantitative Aptitude", icon: "ðŸ§®", rarity: "rare", category: "mastery", requirement: { category: "Quantitative Aptitude", mastery: 80 } },
  { id: "apt-logic-beast", name: "Logic Beast", description: "Achieved 80%+ mastery in Logical Reasoning", icon: "ðŸ§ ", rarity: "rare", category: "mastery", requirement: { category: "Logical Reasoning", mastery: 80 } },
  { id: "apt-verbal-master", name: "Verbal Master", description: "Achieved 80%+ mastery in Verbal Ability", icon: "ðŸ“", rarity: "rare", category: "mastery", requirement: { category: "Verbal Ability", mastery: 80 } },
  { id: "apt-seven-day", name: "Seven Day Scholar", description: "Maintained a 7-day aptitude streak", icon: "ðŸ”¥", rarity: "uncommon", category: "streak", requirement: { streak: 7 } },
  { id: "apt-thirty-day", name: "Thirty Day Grind", description: "Maintained a 30-day aptitude streak", icon: "ðŸ’Ž", rarity: "epic", category: "streak", requirement: { streak: 30 } },
  { id: "apt-elite", name: "Aptitude Elite", description: "Earned 1000 Aptitude XP", icon: "ðŸ‘‘", rarity: "legendary", category: "xp", requirement: { xp: 1000 } },
  { id: "apt-centurion", name: "Centurion", description: "Solved 100 aptitude questions", icon: "ðŸ’¯", rarity: "epic", category: "milestone", requirement: { totalSolved: 100 } },
];
module.exports = { APTITUDE_XP, DAILY_MISSION_XP, RETRY_XP, MIN_ATTEMPTS_FOR_ANALYTICS, MIN_ATTEMPTS_FOR_TOPIC_MASTERY, MIN_ATTEMPTS_FOR_READINESS, MIN_ATTEMPTS_FOR_WEAKNESS, MIN_MISTAKES_FOR_MISTAKE_LAB, MIN_ATTEMPTS_FOR_SKILL_DNA_CATEGORY, MIN_ATTEMPTS_FOR_SPEED_ACCURACY, MIN_SAMPLE_FOR_SUBMETRIC, REVISION_INTERVAL_DAYS, READINESS_WEIGHTS, MASTERY_THRESHOLDS, WEAKNESS_ACCURACY_THRESHOLD, APTITUDE_BADGES };
