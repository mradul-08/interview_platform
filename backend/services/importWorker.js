const { createRun, appendLog, completeRun, updateRun, updateState } = require("./importStore");
const { parseImportRequest } = require("../validation/importValidation");
const { upsertProblems } = require("./ImportService");
const { fetchCodeforcesProblemsWithRetry } = require("./CodeforcesImporter");
const { fetchLeetCodeProblemsWithRetry } = require("./LeetCodeImporter");
const { problems: bundledProblems } = require("../seed/seedProblems");
const { generateProblem } = require("./LocalAiGenerator");

async function processCodeforces(run, payload) {
    await appendLog({ runId: run._id, source: "codeforces", step: "fetch", message: "Fetching Codeforces problems" });
    const problems = await fetchCodeforcesProblemsWithRetry();
    await updateRun(run._id, { total: problems.length, fetched: problems.length, progress: 20, status: "running", startedAt: new Date() });
    await appendLog({ runId: run._id, source: "codeforces", step: "normalize", message: "Normalizing fetched problems", details: { count: problems.length } });
    const result = await upsertProblems(problems, payload.batchSize || 100);
    await appendLog({ runId: run._id, source: "codeforces", step: "save", message: "Saved normalized problems", details: result });
    return { fetched: problems.length, ...result };
}

async function processLeetCode(run, payload) {
    await appendLog({ runId: run._id, source: "leetcode", step: "fetch", message: "Fetching LeetCode problems" });
    const problems = await fetchLeetCodeProblemsWithRetry();
    await updateRun(run._id, { total: problems.length, fetched: problems.length, progress: 20, status: "running", startedAt: new Date() });
    await appendLog({ runId: run._id, source: "leetcode", step: "normalize", message: "Normalizing fetched problems", details: { count: problems.length } });
    const result = await upsertProblems(problems, payload.batchSize || 100);
    await appendLog({ runId: run._id, source: "leetcode", step: "save", message: "Saved normalized problems", details: result });
    return { fetched: problems.length, ...result };
}

async function processBundled(run, payload) {
    await appendLog({ runId: run._id, source: "bundled", step: "bootstrap", message: "Bootstrapping bundled problems", details: { count: bundledProblems.length } });
    await updateRun(run._id, { total: bundledProblems.length, fetched: bundledProblems.length, progress: 20, status: "running", startedAt: new Date() });
    const result = await upsertProblems(bundledProblems, payload.batchSize || 100);
    await appendLog({ runId: run._id, source: "bundled", step: "save", message: "Saved bundled problems", details: result });
    return { fetched: bundledProblems.length, ...result };
}

async function processSync(run, payload) {
    await appendLog({ runId: run._id, source: "sync", step: "start", message: "Starting sync across all external sources" });
    const [codeforces, leetcode] = await Promise.all([
        processCodeforces(run, payload).catch((error) => ({ error: error.message, fetched: 0, saved: 0 })),
        processLeetCode(run, payload).catch((error) => ({ error: error.message, fetched: 0, saved: 0 })),
    ]);
    return { codeforces, leetcode };
}

async function processAi(run, payload) {
    const generated = await generateProblem(payload.meta || {});
    const result = await upsertProblems([generated], 1);
    await appendLog({ runId: run._id, source: "ai", step: "save", message: "Saved AI-generated problem", details: { generated: generated.slug } });
    return { fetched: 1, ...result };
}

async function processImportJob(rawPayload = {}, runtime = {}) {
    const payload = parseImportRequest(rawPayload);
    const run = runtime.run || await createRun({
        source: payload.source,
        mode: payload.source,
        requestedBy: payload.requestedBy || "",
        requestMeta: payload.meta || {},
    });

    try {
        await updateState(payload.source, { status: "running", currentRunId: run._id, lastMessage: "running", lastProgress: 0 });
        await updateRun(run._id, { status: "running", startedAt: new Date(), progress: 0 });

        let result;
        if (payload.source === "codeforces") result = await processCodeforces(run, payload);
        else if (payload.source === "leetcode") result = await processLeetCode(run, payload);
        else if (payload.source === "bundled") result = await processBundled(run, payload);
        else if (payload.source === "sync") result = await processSync(run, payload);
        else if (payload.source === "ai") result = await processAi(run, payload);
        else throw new Error(`Unsupported import source: ${payload.source}`);

        await completeRun(run._id, payload.source, {
            status: "completed",
            fetched: result.fetched || 0,
            saved: result.saved || result.imported || 0,
            progress: 100,
            finishedAt: new Date(),
        });
        await appendLog({ runId: run._id, source: payload.source, step: "complete", message: "Import completed", details: result });
        return { runId: run._id.toString(), ...result };
    } catch (error) {
        await completeRun(run._id, payload.source, {
            status: "failed",
            error: error.message,
            finishedAt: new Date(),
        });
        await appendLog({ runId: run._id, source: payload.source, level: "error", step: "failed", message: error.message });
        throw error;
    }
}

module.exports = { processImportJob };
