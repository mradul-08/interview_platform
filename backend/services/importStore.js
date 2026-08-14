const ImportRun = require("../models/ImportRun");
const ImportLog = require("../models/ImportLog");
const ImportState = require("../models/ImportState");
const { clearCache } = require("./cache");

async function createRun({ source, mode, requestedBy = "", requestMeta = {} }) {
    const run = await ImportRun.create({
        source,
        mode,
        requestedBy,
        requestMeta,
        status: "queued",
    });
    await ImportState.findOneAndUpdate(
        { source },
        { $set: { status: "queued", currentRunId: run._id, updatedAt: new Date() } },
        { upsert: true, new: true }
    );
    return run;
}

async function appendLog({ runId, source, level = "info", step = "", message, details = {} }) {
    return ImportLog.create({ runId, source, level, step, message, details });
}

async function updateRun(runId, updates) {
    return ImportRun.findByIdAndUpdate(runId, { $set: updates }, { new: true });
}

async function updateState(source, updates) {
    return ImportState.findOneAndUpdate(
        { source },
        { $set: { ...updates, updatedAt: new Date() } },
        { upsert: true, new: true }
    );
}

async function completeRun(runId, source, updates) {
    await updateRun(runId, updates);
    await updateState(source, {
        status: updates.status || "completed",
        lastRunId: runId,
        currentRunId: null,
        lastProgress: updates.progress ?? 100,
        lastMessage: updates.error ? "" : "completed",
        lastError: updates.error || "",
    });
    clearCache("problems:");
    clearCache("topics");
    clearCache("companies");
    clearCache("tags");
    clearCache("sources");
    clearCache("problem-stats");
}

module.exports = {
    createRun,
    appendLog,
    updateRun,
    updateState,
    completeRun,
};
