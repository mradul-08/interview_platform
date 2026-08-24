// backend/controllers/dashboardController.js
const User = require("../models/User");
const Problem = require("../models/Problem");
const Submission = require("../models/submission");
const MockInterview = require("../models/MockInterview");
const { getStreakStats } = require("../services/streakService");

const TOPIC_LIST = [
    "Array", "String", "Linked List", "Stack", "Queue",
    "Tree", "Graph", "Heap", "Two Pointers", "Sliding Window",
    "Topological Sort", "BFS", "DFS", "Hashing", "Binary Search",
    "Dynamic Programming", "Sorting", "Recursion", "Divide and Conquer",
    "Math", "Prefix Sum",
];
const SHEET_LIST = ["Blind75", "Striver"];

const getDashboard = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select("-password");
        if (!user) return res.status(404).json({ message: "User not found" });

        const userId = user._id;
        const [mockInterviewsAttended, rankAhead] = await Promise.all([
            MockInterview.countDocuments({
                status: "ENDED",
                $or: [
                    { attendedByIds: userId },
                    {
                        attendedByIds: { $exists: false },
                        $or: [{ hostId: userId }, { participantIds: userId }],
                    },
                ],
            }),
            User.countDocuments({
                role: "student",
                $or: [
                    { points: { $gt: user.points } },
                    { points: user.points, _id: { $lt: userId } },
                ],
            }),
        ]);
        const globalRank = rankAhead + 1;
        const streakStats = await getStreakStats(userId);

        // ── All accepted submissions ──────────────────────────────────────
        const acceptedSubs = await Submission.find({ user: userId, verdict: "Accepted" })
            .populate("problem", "title slug difficulty topic sheet points")
            .sort({ createdAt: -1 });

        // De-duplicate to unique solved problems
        const solvedMap = new Map();
        for (const s of acceptedSubs) {
            if (s.problem && !solvedMap.has(String(s.problem._id))) {
                solvedMap.set(String(s.problem._id), s.problem);
            }
        }
        const solvedProblems = Array.from(solvedMap.values());

        // ── Placement readiness ───────────────────────────────────────────
        const problemsTarget = 300;
        const problemScore = Math.min(user.problemsSolved / problemsTarget, 1) * 60;
        const streakScore  = Math.min(streakStats.currentStreak / 30, 1) * 20;
        const mockScore    = Math.min(mockInterviewsAttended / 10, 1) * 20;
        const placementReadiness = Math.round(problemScore + streakScore + mockScore);

        // ── Resume Learning: most recent submission of any verdict ────────
        const lastSub = await Submission.findOne({ user: userId })
            .populate("problem", "title slug difficulty topic points")
            .sort({ createdAt: -1 });

        const resumeLearning = lastSub && lastSub.problem
            ? {
                isReady: true,
                problem: {
                    title:      lastSub.problem.title,
                    slug:       lastSub.problem.slug,
                    difficulty: lastSub.problem.difficulty,
                    tags:       lastSub.problem.topic || [],
                },
                lastVerdict:   lastSub.verdict,
                lastAttemptAt: lastSub.createdAt,
                solved:        lastSub.verdict === "Accepted",
            }
            : { isReady: false };

        // ── DSA Progress: per-topic completion ────────────────────────────
        const allProblems = await Problem.find({}).select("topic").lean();
        const totalByTopic  = {};
        const solvedByTopic = {};
        for (const t of TOPIC_LIST) { totalByTopic[t] = 0; solvedByTopic[t] = 0; }
        for (const p of allProblems) {
            for (const t of (p.topic || [])) {
                if (totalByTopic[t] === undefined) { totalByTopic[t] = 0; solvedByTopic[t] = 0; }
                totalByTopic[t]++;
            }
        }
        for (const p of solvedProblems) {
            for (const t of (p.topic || [])) {
                solvedByTopic[t] = (solvedByTopic[t] || 0) + 1;
            }
        }
        const dsaProgress = {
            isReady: allProblems.length > 0,
            topics:  Object.keys(totalByTopic)
                .filter(t => totalByTopic[t] > 0)
                .map(t => ({
                    name:   t,
                    solved: solvedByTopic[t] || 0,
                    total:  totalByTopic[t],
                    pct:    Math.round(((solvedByTopic[t] || 0) / totalByTopic[t]) * 100),
                }))
                .sort((a, b) => b.total - a.total),
        };

        // ── Company Sheets ────────────────────────────────────────────────
        const companySheets = { isReady: false, sheets: [] };
        for (const sheetName of SHEET_LIST) {
            const sheetProblems = await Problem.find({ sheet: sheetName }).select("_id").lean();
            const total = sheetProblems.length;
            if (total === 0) continue;
            const solvedCount = sheetProblems.filter(p => solvedMap.has(String(p._id))).length;
            companySheets.sheets.push({
                name:   sheetName,
                solved: solvedCount,
                total,
                pct:    Math.round((solvedCount / total) * 100),
            });
        }
        if (companySheets.sheets.length > 0) companySheets.isReady = true;

        // ── Today's Roadmap: 3 unsolved problems ──────────────────────────
        const solvedIds = Array.from(solvedMap.keys());
        const unsolved  = await Problem.find({ _id: { $nin: solvedIds } })
            .select("title slug difficulty")
            .limit(3);
        const todaysRoadmap = {
            isReady: unsolved.length > 0,
            tasks:   unsolved.map(p => ({
                id:    p._id,
                label: `Solve "${p.title}" (${p.difficulty})`,
                done:  false,
                slug:  p.slug,
            })),
        };

        // ── Daily Challenge ───────────────────────────────────────────────
        const totalProblems = await Problem.countDocuments();
        let dailyChallenge = { isReady: false };
        if (totalProblems > 0) {
            const dayIndex  = Math.floor(Date.now() / 86400000) % totalProblems;
            const challenge = await Problem.find({}).skip(dayIndex).limit(1).lean().then((docs) => docs[0]);
            if (challenge) {
                dailyChallenge = {
                    isReady: true,
                    problem: {
                        title:          challenge.title,
                        slug:           challenge.slug,
                        difficulty:     challenge.difficulty,
                        tags:           challenge.topic || [],
                        acceptanceRate: challenge.acceptanceRate,
                    },
                    solvedByMe: solvedMap.has(String(challenge._id)),
                };
            }
        }

        // ── Coding Heatmap ────────────────────────────────────────────────
        const topProblemDocs = await Problem.find({ isPublished: { $ne: false } })
            .select("title slug difficulty topic companies acceptanceRate points source sourceId sourceUrl")
            .sort({ points: -1, acceptanceRate: -1, updatedAt: -1, createdAt: -1 })
            .limit(100)
            .lean();
        const topProblems = {
            isReady: topProblemDocs.length > 0,
            total: topProblemDocs.length,
            items: topProblemDocs.map((problem, index) => ({
                rank: index + 1,
                title: problem.title,
                slug: problem.slug,
                difficulty: problem.difficulty,
                topic: problem.topic || [],
                companies: problem.companies || [],
                acceptanceRate: problem.acceptanceRate || 0,
                points: problem.points || 10,
                source: problem.source,
                sourceId: problem.sourceId,
                sourceUrl: problem.sourceUrl,
            })),
        };

        const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000);
        const recentSubs    = await Submission.find({
            user: userId, createdAt: { $gte: ninetyDaysAgo },
        }).select("createdAt");
        const countByDate = {};
        for (const s of recentSubs) {
            const key = s.createdAt.toISOString().slice(0, 10);
            countByDate[key] = (countByDate[key] || 0) + 1;
        }
        const heatmap = {
            isReady: recentSubs.length > 0,
            days:    Object.entries(countByDate).map(([date, count]) => ({ date, count })),
        };

        // ── Leaderboard preview (top 5 by points) ────────────────────────
        const topUsers    = await User.find({ role: "student" })
            .select("name college points problemsSolved currentStreak")
            .sort({ points: -1, _id: 1 })
            .limit(5);
        const myRankCount = rankAhead;
        const leaderboard = {
            isReady: topUsers.length > 0,
            top:     topUsers.map((u, i) => ({
                rank:   i + 1,
                name:   u.name,
                college:u.college || "—",
                points: u.points,
                isMe:   String(u._id) === String(userId),
            })),
            myRank: myRankCount + 1,
        };

        const uniqueSolvedCount = solvedProblems.length;

        // ── Final payload ─────────────────────────────────────────────────
        const payload = {
            user: {
                id:       user._id,
                name:     user.name,
                email:    user.email,
                avatarUrl:user.avatarUrl,
                college:  user.college,
                role:     user.role,
            },
            stats: {
                problemsSolved:       uniqueSolvedCount,
                currentStreak:        streakStats.currentStreak,
                longestStreak:        streakStats.longestStreak,
                points:               user.points,
                rank:                 globalRank,
                mockInterviewsAttended,
                placementReadiness,
            },
            resumeLearning,
            todaysRoadmap,
            dailyChallenge,
            topProblems,
            dsaProgress,
            companySheets,
            heatmap,
            leaderboard,
            // Not built yet
            aptitude:   { isReady: false },
            aiCoach:    { isReady: false },
            interviews: { isReady: false },
            contests:   { isReady: false },
            network:    { isReady: false },
            activity:   { isReady: false },
        };

        res.status(200).json(payload);
    } catch (error) {
        console.error("Dashboard Error:", error);
        res.status(500).json({ message: "Server Error" });
    }
};

// Year-scoped activity data for the Coding Intelligence dashboard. This keeps
// raw submission history behind the authenticated API and sends only the
// aggregates/details needed by the heatmap UI.
const getCodingActivity = async (req, res) => {
    try {
        const requestedYear = Number.parseInt(req.query.year, 10);
        const year = Number.isFinite(requestedYear) && requestedYear >= 2000 && requestedYear <= 2100
            ? requestedYear
            : new Date().getUTCFullYear();
        const start = new Date(Date.UTC(year, 0, 1));
        const end = new Date(Date.UTC(year + 1, 0, 1));

        const submissions = await Submission.find({
            user: req.user._id,
            createdAt: { $gte: start, $lt: end },
        })
            .select("problem verdict createdAt")
            .populate("problem", "title slug difficulty topic")
            .sort({ createdAt: 1 })
            .lean();

        const byDate = new Map();
        const solved = new Map();
        for (const submission of submissions) {
            const date = new Date(submission.createdAt).toISOString().slice(0, 10);
            if (!byDate.has(date)) byDate.set(date, {
                date, submissions: 0, accepted: 0, solved: new Map(),
                difficulty: { Easy: 0, Medium: 0, Hard: 0 }, topics: {},
            });
            const day = byDate.get(date);
            day.submissions += 1;
            if (!submission.problem) continue;
            if (submission.verdict === "Accepted") {
                day.accepted += 1;
                const problemId = String(submission.problem._id);
                if (!day.solved.has(problemId)) {
                    day.solved.set(problemId, submission.problem);
                    const difficulty = submission.problem.difficulty || "Unknown";
                    if (day.difficulty[difficulty] !== undefined) day.difficulty[difficulty] += 1;
                    for (const topic of submission.problem.topic || []) day.topics[topic] = (day.topics[topic] || 0) + 1;
                }
                solved.set(problemId, submission.problem);
            }
        }

        const days = Array.from(byDate.values()).map((day) => ({
            date: day.date,
            submissions: day.submissions,
            accepted: day.accepted,
            solved: day.solved.size,
            difficulty: day.difficulty,
            topics: day.topics,
            problems: Array.from(day.solved.values()).map((problem) => ({
                title: problem.title,
                slug: problem.slug,
                difficulty: problem.difficulty,
            })),
        }));

        const activeDates = new Set(byDate.keys());
        const today = new Date();
        const todayKey = today.toISOString().slice(0, 10);
        const cursor = activeDates.has(todayKey)
            ? new Date(todayKey)
            : new Date(today.getTime() - 86400000);
        let currentStreak = 0;
        while (activeDates.has(cursor.toISOString().slice(0, 10))) {
            currentStreak += 1;
            cursor.setUTCDate(cursor.getUTCDate() - 1);
        }

        const sortedDates = Array.from(activeDates).sort();
        let longestStreak = 0;
        let run = 0;
        let previous = null;
        for (const date of sortedDates) {
            const current = new Date(date);
            if (previous && (current - previous) === 86400000) run += 1;
            else run = 1;
            longestStreak = Math.max(longestStreak, run);
            previous = current;
        }

        const hardProblems = Array.from(solved.values()).filter((problem) => problem.difficulty === "Hard").length;
        res.json({
            year,
            isReady: submissions.length > 0,
            days,
            stats: {
                problemsSolved: solved.size,
                codingDays: activeDates.size,
                currentStreak,
                longestStreak,
                hardProblems,
                totalSubmissions: submissions.length,
            },
        });
    } catch (error) {
        console.error("Coding activity error:", error);
        res.status(500).json({ message: "Unable to load coding activity" });
    }
};

const getCodingAnalytics = async (req, res) => {
    try {
        const requestedDays = Number.parseInt(req.query.days, 10);
        const days = Number.isFinite(requestedDays) ? Math.min(Math.max(requestedDays, 7), 365) : 30;
        const end = new Date();
        const start = new Date(end.getTime() - (days - 1) * 86400000);
        const submissions = await Submission.find({ user: req.user._id, createdAt: { $gte: start, $lte: end } })
            .select("problem verdict language createdAt")
            .populate("problem", "title slug difficulty")
            .sort({ createdAt: 1 })
            .lean();

        const byDate = new Map();
        const solved = new Map();
        const verdicts = {};
        const languages = {};
        const difficulty = { Easy: { attempts: 0, accepted: 0 }, Medium: { attempts: 0, accepted: 0 }, Hard: { attempts: 0, accepted: 0 } };
        for (let index = 0; index < days; index += 1) {
            const date = new Date(start.getTime() + index * 86400000).toISOString().slice(0, 10);
            byDate.set(date, { date, submissions: 0, accepted: 0, solved: 0, solvedProblems: new Set() });
        }
        for (const submission of submissions) {
            const date = new Date(submission.createdAt).toISOString().slice(0, 10);
            const day = byDate.get(date);
            if (!day) continue;
            day.submissions += 1;
            verdicts[submission.verdict] = (verdicts[submission.verdict] || 0) + 1;
            languages[submission.language] = (languages[submission.language] || 0) + 1;
            const level = submission.problem?.difficulty;
            if (difficulty[level]) {
                difficulty[level].attempts += 1;
                if (submission.verdict === "Accepted") difficulty[level].accepted += 1;
            }
            if (submission.verdict === "Accepted" && submission.problem) {
                const problemId = String(submission.problem._id);
                solved.set(problemId, submission.problem);
                if (!day.solvedProblems.has(problemId)) {
                    day.solvedProblems.add(problemId);
                    day.solved += 1;
                }
                day.accepted += 1;
            }
        }
        const accepted = submissions.filter((item) => item.verdict === "Accepted").length;
        res.json({
            rangeDays: days,
            hasData: submissions.length > 0,
            summary: {
                submissions: submissions.length,
                accepted,
                acceptanceRate: submissions.length ? Math.round((accepted / submissions.length) * 100) : 0,
                problemsSolved: solved.size,
            },
            dailyTrend: Array.from(byDate.values()).map(({ solvedProblems, ...day }) => day),
            verdicts,
            languages,
            difficulty: Object.fromEntries(Object.entries(difficulty).map(([key, value]) => [key, {
                ...value,
                accuracy: value.attempts ? Math.round((value.accepted / value.attempts) * 100) : 0,
            }])),
        });
    } catch (error) {
        console.error("Coding analytics error:", error);
        res.status(500).json({ message: "Unable to load coding analytics" });
    }
};

module.exports = { getDashboard, getCodingActivity, getCodingAnalytics };
