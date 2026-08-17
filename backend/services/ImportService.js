const Problem = require("../models/Problem");
const { fetchCodeforcesProblemsWithRetry } = require("./CodeforcesImporter");
const { fetchLeetCodeProblemsWithRetry } = require("./LeetCodeImporter");
const { normalizeOriginal, slugify, buildContentStatus } = require("./ProblemNormalizer");

const POINTS_BY_DIFFICULTY = { Easy: 10, Medium: 20, Hard: 30 };

function mergeImportedFields(existing, incoming) {
    const next = {
        title: incoming.title,
        slug: incoming.slug,
        source: incoming.source,
        sourceId: incoming.sourceId,
        sourceUrl: incoming.sourceUrl,
        difficulty: incoming.difficulty,
        rating: incoming.rating,
        topic: incoming.topic || [],
        tags: incoming.tags || incoming.topic || [],
        companies: incoming.companies || [],
        acceptanceRate: incoming.acceptanceRate || 0,
        points: POINTS_BY_DIFFICULTY[incoming.difficulty] || existing?.points || 10,
        isImported: true,
        isOriginal: false,
        description: existing?.description || incoming.description || "",
        statement: existing?.statement || incoming.statement || "",
        constraints: existing?.constraints || incoming.constraints || [],
        examples: existing?.examples || incoming.examples || [],
        hints: existing?.hints || incoming.hints || [],
        editorial: existing?.editorial || incoming.editorial || "",
        starterCode: existing?.starterCode || incoming.starterCode || {},
        testCases: existing?.testCases || incoming.testCases || [],
        timeLimit: existing?.timeLimit || incoming.timeLimit || 2000,
        memoryLimit: existing?.memoryLimit || incoming.memoryLimit || 256,
        testcaseValidator: existing?.testcaseValidator || incoming.testcaseValidator || "standard",
        articleLinks: existing?.articleLinks || incoming.articleLinks || [],
        videoLinks: existing?.videoLinks || incoming.videoLinks || [],
        createdBy: existing?.createdBy || incoming.createdBy || "system",
    };
    const contentStatus = buildContentStatus(next);
    return {
        $set: {
            ...next,
            isPublished: contentStatus.isComplete ? (existing?.isPublished ?? true) : false,
        },
        $setOnInsert: {
            createdAt: new Date(),
        },
    };
}

async function saveProblem(normalized) {
    const existing = await Problem.findOne({ source: normalized.source, sourceId: normalized.sourceId });
    if (existing) {
        const update = mergeImportedFields(existing, normalized);
        return Problem.findByIdAndUpdate(existing._id, update, { returnDocument: "after" });
    }

    const slugTaken = await Problem.findOne({ slug: normalized.slug });
    const contentStatus = buildContentStatus(normalized);
        const payload = {
        ...normalized,
        slug: slugTaken ? `${normalized.slug}-${Date.now()}` : normalized.slug,
        points: POINTS_BY_DIFFICULTY[normalized.difficulty] || 10,
        isPublished: contentStatus.isComplete ? (normalized.isPublished ?? true) : false,
    };
    return Problem.create(payload);
}

async function upsertProblems(normalizedProblems, batchSize = 100) {
    let saved = 0;
    const batches = [];
    for (let i = 0; i < normalizedProblems.length; i += batchSize) {
        batches.push(normalizedProblems.slice(i, i + batchSize));
    }

    for (const batch of batches) {
        const ops = [];
        for (const normalized of batch) {
            ops.push({
                updateOne: {
                    filter: { source: normalized.source, sourceId: normalized.sourceId },
                    update: {
                        $set: {
                            ...normalized,
                            points: POINTS_BY_DIFFICULTY[normalized.difficulty] || 10,
                            timeLimit: normalized.timeLimit || 2000,
                            memoryLimit: normalized.memoryLimit || 256,
                            testcaseValidator: normalized.testcaseValidator || "standard",
                            isPublished: buildContentStatus(normalized).isComplete ? (normalized.isPublished ?? true) : false,
                        },
                        $setOnInsert: {
                            createdAt: new Date(),
                        },
                    },
                    upsert: true,
                },
            });
        }
        if (ops.length > 0) {
            const result = await Problem.bulkWrite(ops, { ordered: false });
            saved += (result.upsertedCount || 0) + (result.modifiedCount || 0);
        }
    }
    return { saved };
}

async function importCodeforces() {
    const problems = await fetchCodeforcesProblemsWithRetry();
    const { saved } = await upsertProblems(problems);
    return { fetched: problems.length, saved, imported: saved };
}

async function importLeetCode() {
    const problems = await fetchLeetCodeProblemsWithRetry();
    const { saved } = await upsertProblems(problems);
    return { fetched: problems.length, saved, imported: saved };
}

async function syncMetadata() {
    const imported = await Promise.allSettled([importCodeforces(), importLeetCode()]);
    return {
        codeforces: imported[0].status === "fulfilled"
            ? imported[0].value
            : { fetched: 0, saved: 0, imported: 0, error: imported[0].reason.message },
        leetcode: imported[1].status === "fulfilled"
            ? imported[1].value
            : { fetched: 0, saved: 0, imported: 0, error: imported[1].reason.message },
    };
}

async function removeDuplicates() {
    const docs = await Problem.find({}).sort({ createdAt: 1 });
    const seen = new Map();
    const removed = [];

    for (const doc of docs) {
        const key = `${doc.source || "original"}:${doc.sourceId || doc.slug}`;
        if (seen.has(key)) {
            removed.push(doc._id);
            continue;
        }
        seen.set(key, doc._id);
    }

    if (removed.length > 0) {
        await Problem.deleteMany({ _id: { $in: removed } });
    }

    return { removed: removed.length };
}

async function createOrUpdateProblem(payload, currentUserId) {
    const normalized = normalizeOriginal(payload, currentUserId);
    if (!normalized.title) {
        throw new Error("Title is required");
    }

    const existing = await Problem.findOne({ slug: normalized.slug });
    if (existing) {
        return Problem.findByIdAndUpdate(
            existing._id,
            { $set: { ...normalized, isOriginal: true, isImported: false } },
            { returnDocument: "after", runValidators: true }
        );
    }

    return Problem.create(normalized);
}

module.exports = {
    importCodeforces,
    importLeetCode,
    syncMetadata,
    saveProblem,
    upsertProblems,
    removeDuplicates,
    createOrUpdateProblem,
};
