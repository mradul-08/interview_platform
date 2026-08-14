const axios = require("axios");
const { normalizeCodeforces } = require("./ProblemNormalizer");

const CODEFORCES_API = "https://codeforces.com/api/problemset.problems";

async function fetchCodeforcesProblems() {
    const { data } = await axios.get(CODEFORCES_API, {
        timeout: 20000,
        headers: { "User-Agent": "codeverse-importer" },
    });

    if (!data || data.status !== "OK" || !data.result) {
        throw new Error("Unexpected Codeforces API response");
    }

    const contestMap = new Map();
    for (const contest of data.result.problemStatistics || []) {
        const key = `${contest.contestId}-${contest.index}`;
        contestMap.set(key, contest);
    }

    return (data.result.problems || []).map((problem) => {
        const contestId = problem.contestId || problem.problemsetName || "cf";
        const normalized = normalizeCodeforces(problem, contestId);
        const statsKey = `${problem.contestId || contestId}-${problem.index}`;
        const stats = contestMap.get(statsKey);
        return {
            ...normalized,
            sourceId: `${problem.contestId || contestId}-${problem.index}`,
            acceptanceRate: stats && typeof stats.solvedCount === "number"
                ? stats.solvedCount
                : 0,
        };
    });
}

async function fetchCodeforcesProblemsWithRetry(attempts = 3) {
    let lastError;
    for (let i = 1; i <= attempts; i += 1) {
        try {
            return await fetchCodeforcesProblems();
        } catch (error) {
            lastError = error;
            if (i < attempts) {
                await new Promise((resolve) => setTimeout(resolve, 500 * i));
            }
        }
    }
    throw lastError;
}

module.exports = { fetchCodeforcesProblems, fetchCodeforcesProblemsWithRetry };
