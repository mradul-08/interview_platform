const User = require("../models/User");

// GET /api/leaderboard?scope=global&page=1&limit=20
const getLeaderboard = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const [users, total] = await Promise.all([
            User.find({ role: "student" })
                .select("name college points problemsSolved currentStreak")
                .sort({ points: -1 })
                .skip(skip)
                .limit(limit),
            User.countDocuments({ role: "student" }),
        ]);

        const ranked = users.map((u, i) => ({
            rank: skip + i + 1,
            id: u._id,
            name: u.name,
            college: u.college || "—",
            points: u.points,
            problemsSolved: u.problemsSolved,
            currentStreak: u.currentStreak,
        }));

        // Find requesting user's own rank even if outside the current page
        const myRankCount = await User.countDocuments({ role: "student", points: { $gt: req.user.points } });
        const myRank = myRankCount + 1;

        res.status(200).json({
            leaderboard: ranked,
            page,
            totalPages: Math.ceil(total / limit),
            totalUsers: total,
            myRank,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server Error" });
    }
};

module.exports = { getLeaderboard };