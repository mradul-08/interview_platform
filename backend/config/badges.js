const STREAK_BADGES = [
    { id: "first-flame", name: "First Flame", description: "Complete a 3-day coding streak", category: "streak", requirement: 3, rarity: "common", icon: "🔥" },
    { id: "week-warrior", name: "Week Warrior", description: "Complete a 7-day coding streak", category: "streak", requirement: 7, rarity: "uncommon", icon: "⚡" },
    { id: "dedicated", name: "Dedicated", description: "Complete a 14-day coding streak", category: "streak", requirement: 14, rarity: "rare", icon: "💎" },
    { id: "disciplined", name: "Disciplined", description: "Complete a 30-day coding streak", category: "streak", requirement: 30, rarity: "epic", icon: "🛡️" },
    { id: "elite-coder", name: "Elite Coder", description: "Complete a 60-day coding streak", category: "streak", requirement: 60, rarity: "legendary", icon: "👑" },
    { id: "unstoppable", name: "Unstoppable", description: "Complete a 100-day coding streak", category: "streak", requirement: 100, rarity: "legendary", icon: "🐉" },
    { id: "code-master", name: "Code Master", description: "Complete a 180-day coding streak", category: "streak", requirement: 180, rarity: "legendary", icon: "🌌" },
    { id: "codeverse-legend", name: "CodeVerse Legend", description: "Complete a 365-day coding streak", category: "streak", requirement: 365, rarity: "mythic", icon: "🏆" },
];

const BADGE_DEFINITIONS = STREAK_BADGES;

module.exports = { STREAK_BADGES, BADGE_DEFINITIONS };
