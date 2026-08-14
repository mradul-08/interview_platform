const User = require("../models/User");

// GET /api/dashboard
// Returns ONLY real data that currently exists in the DB.
// Sections with no backing data yet return isReady: false instead of fake numbers.
const getDashboard = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select("-password");
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Placement readiness — real formula based on actual stored stats.
        // (No magic numbers — this is a transparent weighted calc you can tune later.)
        const problemsTarget = 300; // tune this later when you add a config model
        const problemScore = Math.min(user.problemsSolved / problemsTarget, 1) * 60;
        const streakScore = Math.min(user.currentStreak / 30, 1) * 20;
        const mockScore = Math.min(user.mockInterviewsAttended / 10, 1) * 20;
        const placementReadiness = Math.round(problemScore + streakScore + mockScore);

        const payload = {
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                avatarUrl: user.avatarUrl,
                college: user.college,
            },
            stats: {
                problemsSolved: user.problemsSolved,
                currentStreak: user.currentStreak,
                longestStreak: user.longestStreak,
                points: user.points,
                rank: user.rank,
                mockInterviewsAttended: user.mockInterviewsAttended,
                placementReadiness,
            },
            // Sections below have no real backing data/models yet.
            // isReady:false tells the frontend to render a genuine
            // "not built yet" state instead of a fake widget.
            resumeLearning: { isReady: false },
            dsaProgress: { isReady: false },
            companySheets: { isReady: false },
            aptitude: { isReady: false },
            aiCoach: { isReady: false },
            heatmap: { isReady: false },
            interviews: { isReady: false },
            contests: { isReady: false },
            leaderboard: { isReady: false },
            network: { isReady: false },
            activity: { isReady: false },
        };

        res.status(200).json(payload);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
};

module.exports = { getDashboard };