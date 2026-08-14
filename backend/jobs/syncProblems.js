const importQueueService = require("../services/importQueue");
const { enqueueImport, startImportWorker } = importQueueService;
const ImportState = require("../models/ImportState");

async function scheduleNightlySync() {
    const queue = importQueueService.importQueue;
    if (queue) {
        await queue.add(
            "sync",
            { source: "sync", meta: { scheduled: true }, requestedBy: "system" },
            {
                repeat: { pattern: "0 2 * * *" },
                jobId: "nightly-sync",
                removeOnComplete: true,
                removeOnFail: false,
            }
        );
        console.log("[syncProblems] BullMQ nightly sync scheduled at 2:00 AM");
        return;
    }

    console.log("[syncProblems] Redis/BullMQ not configured, using fallback interval scheduler");
    const run = async () => {
        try {
            await enqueueImport({ source: "sync", requestedBy: "system", meta: { scheduled: true } });
            await ImportState.findOneAndUpdate(
                { source: "sync" },
                { $set: { status: "completed", lastMessage: "scheduled sync complete", updatedAt: new Date() } },
                { upsert: true, new: true }
            );
            console.log("[syncProblems] Nightly sync completed");
        } catch (error) {
            console.error("[syncProblems] Nightly sync failed:", error.message);
        } finally {
            scheduleNext();
        }
    };

    const scheduleNext = () => {
        const now = new Date();
        const next = new Date(now);
        next.setHours(2, 0, 0, 0);
        if (next <= now) next.setDate(next.getDate() + 1);
        setTimeout(run, next.getTime() - now.getTime());
    };

    scheduleNext();
}

module.exports = { scheduleNightlySync };
