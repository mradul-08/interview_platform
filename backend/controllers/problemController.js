const Problem = require("../models/Problem");
const Submission = require("../models/Submission");
const { createOrUpdateProblem } = require("../services/ImportService");
const { canonicalizeProblem } = require("../services/ProblemNormalizer");
const { setCache, getCache, clearCache } = require("../services/cache");

function computeContentStatus(problem) {
    const hasStatement = Boolean(String(problem.statement || problem.description || "").trim());
    const hasExamples = Array.isArray(problem.examples) && problem.examples.length > 0;
    const hasConstraints = Array.isArray(problem.constraints) && problem.constraints.some((item) => String(item || "").trim());
    const hasStarterCode = problem.starterCode && Object.values(problem.starterCode).some((item) => String(item || "").trim());
    const hasTestCases = Array.isArray(problem.testCases) && problem.testCases.some((tc) => String(tc?.input || "").trim());
    const missing = [];
    if (!hasStatement) missing.push("statement");
    if (!hasExamples) missing.push("examples");
    if (!hasConstraints) missing.push("constraints");
    if (!hasStarterCode) missing.push("starterCode");
    if (!hasTestCases) missing.push("testCases");
    return { hasStatement, hasExamples, hasConstraints, hasStarterCode, hasTestCases, isComplete: missing.length === 0, missing };
}

function escapeRegex(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function searchTokens(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .map((token) => token.replace(/[^a-z0-9+#.-]/g, ""))
        .filter((token) => token.length >= 2)
        .slice(0, 6);
}

function searchScore(problem, value) {
    const query = String(value || "").trim().toLowerCase();
    const tokens = searchTokens(value);
    const title = String(problem.title || "").toLowerCase();
    const slug = String(problem.slug || "").toLowerCase();
    const fields = [
        title,
        slug,
        String(problem.difficulty || "").toLowerCase(),
        ...(problem.topic || []).map((item) => String(item).toLowerCase()),
        ...(problem.tags || []).map((item) => String(item).toLowerCase()),
        ...(problem.companies || []).map((item) => String(item).toLowerCase()),
    ];
    let score = 0;
    if (title === query) score += 1000;
    if (slug === query || slug.replaceAll("-", " ") === query) score += 900;
    if (title.startsWith(query)) score += 700;
    if (slug.startsWith(query)) score += 600;
    if (title.includes(query)) score += 400;
    tokens.forEach((token) => {
        fields.forEach((field, index) => {
            if (!field.includes(token)) return;
            score += index === 0 ? 80 : index === 1 ? 65 : index < 4 ? 45 : 25;
            if (field === token) score += 35;
        });
    });
    return score;
}

function buildFilter(query) {
    const { difficulty, topic, tag, company, sheet, source, search, published } = query;
    const filter = {};
    const and = [];

    if (difficulty) filter.difficulty = difficulty;
    if (topic) filter.topic = topic;
    if (tag) filter.tags = tag;
    if (company) filter.companies = company;
    if (sheet) filter.sheet = sheet;
    if (source) filter.source = source;
    if (published === "all") {
        // no-op for admin views
    } else if (published !== undefined) {
        const showPublished = published === "true" || published === true;
        if (showPublished) {
            and.push({ $or: [{ isPublished: true }, { isPublished: { $exists: false } }] });
        } else {
            and.push({ isPublished: false });
        }
    } else {
        and.push({ $or: [{ isPublished: true }, { isPublished: { $exists: false } }] });
    }
    const tokens = searchTokens(search);
    if (tokens.length) {
        and.push(...tokens.map((token) => ({
            $or: [
                { title: { $regex: escapeRegex(token), $options: "i" } },
                { slug: { $regex: escapeRegex(token), $options: "i" } },
                { difficulty: { $regex: escapeRegex(token), $options: "i" } },
                { topic: { $regex: escapeRegex(token), $options: "i" } },
                { tags: { $regex: escapeRegex(token), $options: "i" } },
                { companies: { $regex: escapeRegex(token), $options: "i" } },
            ],
        })));
    }

    if (and.length === 1) return { ...filter, ...and[0] };
    if (and.length > 1) filter.$and = and;

    return filter;
}

const getProblems = async (req, res) => {
    try {
        const cacheKey = `problems:${JSON.stringify(req.query)}`;
        const cached = getCache(cacheKey);
        if (cached) return res.json(cached);

        const page = Math.max(parseInt(req.query.page || "1", 10), 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit || "50", 10), 1), 1000);
        const filter = buildFilter(req.query);
        const isAdminView = String(req.query.published || "") === "all";

        const problems = await Problem.find(filter)
            .select("title slug difficulty topic tags companies acceptanceRate points source sourceId sourceUrl isPublished createdAt updatedAt statement description inputFormat outputFormat examples constraints starterCode testCases executionMode contractVersion")
            .sort({ isPublished: -1, updatedAt: -1, createdAt: -1 })
            .lean();

        const visibleProblems = isAdminView
            ? problems
            : problems.filter((problem) => computeContentStatus(problem).isComplete);

        const rankedProblems = searchTokens(req.query.search).length
            ? visibleProblems.sort((a, b) => searchScore(b, req.query.search) - searchScore(a, req.query.search))
            : visibleProblems;
        const total = rankedProblems.length;
        const start = (page - 1) * limit;
        const paged = rankedProblems.slice(start, start + limit);

        const payload = {
            problems: paged.map((problem) => canonicalizeProblem(problem, { includeHidden: isAdminView })),
            items: paged.map((problem) => canonicalizeProblem(problem, { includeHidden: isAdminView })),
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
        setCache(cacheKey, payload, 30000);
        res.json(payload);
    } catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
};

const getProblemBySlug = async (req, res) => {
    try {
        const problem = await Problem.findOne({ slug: req.params.slug });
        if (!problem) return res.status(404).json({ message: "Problem not found" });

        const submissions = req.user?._id
            ? await Submission.find({
                user: req.user._id,
                problem: problem._id,
            }).select("verdict language createdAt runtime memory").sort({ createdAt: -1 }).limit(10)
            : [];

        res.json({
            ...canonicalizeProblem(problem, { includeHidden: req.user?.role === "admin" }),
            userSubmissions: submissions,
        });
    } catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
};

const getProblemContentAudit = async (req, res) => {
    try {
        const missingFilter = String(req.query.missing || "").trim();
        const problems = await Problem.find({})
            .select("title slug statement description inputFormat outputFormat examples constraints starterCode testCases executionMode contractVersion source sourceId isImported isOriginal isPublished")
            .sort({ updatedAt: -1 })
            .lean();

        const audited = problems.map((problem) => {
            return {
                ...problem,
                contentStatus: computeContentStatus(problem),
            };
        });

        const filtered = missingFilter
            ? audited.filter((problem) => (problem.contentStatus?.missing || []).includes(missingFilter))
            : audited;

        res.json({ items: filtered, total: filtered.length, filter: missingFilter || null });
    } catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
};

const repairImportedProblemContent = async (req, res) => {
    try {
        const problems = await Problem.find({ isImported: true }).lean();
        const report = [];
        let updated = 0;

        for (const problem of problems) {
            const patch = {};
            const contentStatusBefore = computeContentStatus(problem);
            const statement = String(problem.statement || "").trim();
            const description = String(problem.description || "").trim();

            if (!statement && description) patch.statement = description;
            if (!description && statement) patch.description = statement;
            if (!contentStatusBefore.isComplete) patch.isPublished = false;

            if (Object.keys(patch).length > 0) {
                await Problem.findByIdAndUpdate(problem._id, { $set: patch }, { new: false });
                updated += 1;
                report.push({
                    _id: problem._id,
                    slug: problem.slug,
                    title: problem.title,
                    before: contentStatusBefore,
                    applied: patch,
                });
            }
        }

        clearCache("problems:");
        clearCache("problem-stats");

        const refreshed = await Problem.find({ isImported: true })
            .select("title slug statement description inputFormat outputFormat examples constraints starterCode testCases executionMode contractVersion source sourceId isImported isOriginal isPublished")
            .sort({ updatedAt: -1 })
            .lean();

        res.json({
            updated,
            report,
            items: refreshed.map((problem) => ({
                ...problem,
                contentStatus: computeContentStatus(problem),
            })),
        });
    } catch (error) {
        console.error("Repair imported problems error:", error.message);
        res.status(500).json({ message: "Server Error" });
    }
};

const repairImportedProblemById = async (req, res) => {
    try {
        const { id } = req.params;
        const problem = await Problem.findOne({ _id: id, isImported: true }).lean();
        if (!problem) {
            return res.status(404).json({ message: "Imported problem not found" });
        }

        const contentStatusBefore = computeContentStatus(problem);
        const patch = {};
        const statement = String(problem.statement || "").trim();
        const description = String(problem.description || "").trim();
        if (!statement && description) patch.statement = description;
        if (!description && statement) patch.description = statement;
        if (!contentStatusBefore.isComplete) patch.isPublished = false;

        if (Object.keys(patch).length > 0) {
            await Problem.findByIdAndUpdate(problem._id, { $set: patch }, { new: false });
        }

        clearCache("problems:");
        clearCache("problem-stats");

        const refreshed = await Problem.findById(problem._id)
            .select("title slug statement description inputFormat outputFormat examples constraints starterCode testCases executionMode contractVersion source sourceId isImported isOriginal isPublished")
            .lean();

        res.json({
            updated: Object.keys(patch).length > 0 ? 1 : 0,
            item: refreshed ? { ...refreshed, contentStatus: computeContentStatus(refreshed) } : null,
            applied: patch,
            before: contentStatusBefore,
        });
    } catch (error) {
        console.error("Repair imported problem by id error:", error.message);
        res.status(500).json({ message: "Server Error" });
    }
};

const republishCompleteImportedProblems = async (req, res) => {
    try {
        const problems = await Problem.find({ isImported: true }).lean();
        const report = [];
        let updated = 0;

        for (const problem of problems) {
            const status = computeContentStatus(problem);
            if (!status.isComplete || problem.isPublished) continue;
            await Problem.findByIdAndUpdate(problem._id, { $set: { isPublished: true } }, { new: false });
            updated += 1;
            report.push({
                _id: problem._id,
                slug: problem.slug,
                title: problem.title,
                contentStatus: status,
            });
        }

        clearCache("problems:");
        clearCache("problem-stats");

        res.json({ updated, report });
    } catch (error) {
        console.error("Republish imported problems error:", error.message);
        res.status(500).json({ message: "Server Error" });
    }
};

const republishImportedProblemById = async (req, res) => {
    try {
        const { id } = req.params;
        const problem = await Problem.findOne({ _id: id, isImported: true }).lean();
        if (!problem) {
            return res.status(404).json({ message: "Imported problem not found" });
        }

        const status = computeContentStatus(problem);
        if (!status.isComplete) {
            return res.status(400).json({ message: "Problem is still incomplete" });
        }
        if (problem.isPublished) {
            return res.json({ updated: 0, item: { ...problem, contentStatus: status } });
        }

        await Problem.findByIdAndUpdate(problem._id, { $set: { isPublished: true } }, { new: false });
        clearCache("problems:");
        clearCache("problem-stats");
        const refreshed = await Problem.findById(problem._id)
            .select("title slug statement description inputFormat outputFormat examples constraints starterCode testCases executionMode contractVersion source sourceId isImported isOriginal isPublished")
            .lean();

        res.json({
            updated: 1,
            item: refreshed ? { ...refreshed, contentStatus: computeContentStatus(refreshed) } : null,
        });
    } catch (error) {
        console.error("Republish imported problem by id error:", error.message);
        res.status(500).json({ message: "Server Error" });
    }
};

const searchProblems = async (req, res) => {
    req.query.search = req.query.q || req.query.search;
    return getProblems(req, res);
};

const randomProblem = async (req, res) => {
    try {
        const filter = buildFilter(req.query);
        const count = await Problem.countDocuments(filter);
        if (!count) return res.status(404).json({ message: "No problems found" });
        const random = Math.floor(Math.random() * count);
        const problem = await Problem.find(filter).skip(random).limit(1).then((docs) => docs[0]);
        res.json({ problem });
    } catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
};

const getTopics = async (req, res) => {
    try {
        const cached = getCache("topics");
        if (cached) return res.json(cached);
        const topics = await Problem.distinct("topic");
        const payload = topics.filter(Boolean).sort();
        setCache("topics", payload, 300000);
        res.json(payload);
    } catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
};

const getCompaniesFromProblems = async (req, res) => {
    try {
        const cached = getCache("companies");
        if (cached) return res.json(cached);
        const companies = await Problem.distinct("companies");
        const payload = companies.filter(Boolean).sort();
        setCache("companies", payload, 300000);
        res.json(payload);
    } catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
};

const getTagList = async (req, res) => {
    try {
        const cached = getCache("tags");
        if (cached) return res.json(cached);
        const tags = await Problem.distinct("tags");
        const payload = tags.filter(Boolean).sort();
        setCache("tags", payload, 300000);
        res.json(payload);
    } catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
};

const getSourceList = async (req, res) => {
    try {
        const cached = getCache("sources");
        if (cached) return res.json(cached);
        const sources = await Problem.distinct("source");
        const payload = sources.filter(Boolean).sort();
        setCache("sources", payload, 300000);
        res.json(payload);
    } catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
};

const getProblemStats = async (req, res) => {
    try {
        // Students should see only the working/public problem bank. Admins
        // still need the full database totals for content management.
        const isAdmin = req.user?.role === "admin";
        const statsFilter = isAdmin ? {} : { isPublished: true };
        const cacheKey = `problem-stats:${isAdmin ? "admin" : "student"}`;
        const cached = getCache(cacheKey);
        if (cached) return res.json(cached);
        const [total, easy, medium, hard, imported, original] = await Promise.all([
            Problem.countDocuments(statsFilter),
            Problem.countDocuments({ ...statsFilter, difficulty: "Easy" }),
            Problem.countDocuments({ ...statsFilter, difficulty: "Medium" }),
            Problem.countDocuments({ ...statsFilter, difficulty: "Hard" }),
            Problem.countDocuments({ ...statsFilter, isImported: true }),
            Problem.countDocuments({ ...statsFilter, isOriginal: true }),
        ]);

        const payload = {
            total,
            easy,
            medium,
            hard,
            imported,
            original,
            published: await Problem.countDocuments({ isPublished: true }),
        };
        setCache(cacheKey, payload, 300000);
        res.json(payload);
    } catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
};

const createProblem = async (req, res) => {
    try {
        const problem = await createOrUpdateProblem(req.body, req.user?._id);
        clearCache("problems:");
        clearCache("topics");
        clearCache("companies");
        clearCache("tags");
        clearCache("sources");
        clearCache("problem-stats");
        res.status(201).json(problem);
    } catch (error) {
        res.status(400).json({ message: error.message || "Invalid problem payload" });
    }
};

const updateProblem = async (req, res) => {
    try {
        const problem = await Problem.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { returnDocument: "after", runValidators: true }
        );
        if (!problem) return res.status(404).json({ message: "Problem not found" });
        clearCache("problems:");
        clearCache("topics");
        clearCache("companies");
        clearCache("tags");
        clearCache("sources");
        clearCache("problem-stats");
        res.json(problem);
    } catch (error) {
        res.status(400).json({ message: error.message || "Update failed" });
    }
};

const deleteProblem = async (req, res) => {
    try {
        const problem = await Problem.findByIdAndDelete(req.params.id);
        if (!problem) return res.status(404).json({ message: "Problem not found" });
        clearCache("problems:");
        clearCache("topics");
        clearCache("companies");
        clearCache("tags");
        clearCache("sources");
        clearCache("problem-stats");
        res.json({ message: "Problem deleted" });
    } catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
};

module.exports = {
    getProblems,
    getProblemBySlug,
    searchProblems,
    randomProblem,
    getTopics,
    getTagList,
    getCompaniesFromProblems,
    getSourceList,
    getProblemStats,
    getProblemContentAudit,
    repairImportedProblemContent,
    repairImportedProblemById,
    republishCompleteImportedProblems,
    republishImportedProblemById,
    createProblem,
    updateProblem,
    deleteProblem,
};
