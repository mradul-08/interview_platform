const User = require("../models/User");

const LEADERBOARD_LIMIT = 50;

function toPublicRow(user, rank) {
    return {
        rank,
        id: user._id,
        name: user.name,
        college: user.college || "—",
        points: user.points || 0,
        problemsSolved: user.problemsSolved || 0,
        currentStreak: user.currentStreak || 0,
    };
}

async function getLeaderboardSnapshot(limit = LEADERBOARD_LIMIT) {
    const users = await User.find({ role: "student" })
        .select("name college points problemsSolved currentStreak")
        .sort({ points: -1, _id: 1 })
        .lean();
    const rankByUser = {};
    const ranked = users.map((user, index) => {
        const rank = index + 1;
        rankByUser[String(user._id)] = rank;
        return toPublicRow(user, rank);
    });
    return {
        leaderboard: ranked.slice(0, Math.max(1, Number(limit) || LEADERBOARD_LIMIT)),
        rankByUser,
        totalUsers: ranked.length,
        totalPages: Math.ceil(ranked.length / LEADERBOARD_LIMIT),
    };
}

async function emitLeaderboardUpdate(io, affectedUserId = null) {
    if (!io) return;
    try {
        const snapshot = await getLeaderboardSnapshot();
        io.emit("leaderboard:updated", {
            ...snapshot,
            affectedUserId: affectedUserId ? String(affectedUserId) : null,
        });
    } catch (error) {
        // A leaderboard notification must never turn a successful submission
        // into a failed request. The next reconnect/manual refresh can resync.
        console.error("Leaderboard realtime update failed:", error.message);
    }
}

// GET /api/leaderboard?scope=global&page=1&limit=20
const getLeaderboard = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const snapshot = await getLeaderboardSnapshot(skip + limit);
        const ranked = snapshot.leaderboard.slice(skip, skip + limit);
        const myRank = snapshot.rankByUser[String(req.user._id)] || null;

        res.status(200).json({
            leaderboard: ranked,
            page,
            totalPages: Math.ceil(snapshot.totalUsers / limit),
            totalUsers: snapshot.totalUsers,
            myRank,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server Error" });
    }
};

module.exports = { getLeaderboard, getLeaderboardSnapshot, emitLeaderboardUpdate };
