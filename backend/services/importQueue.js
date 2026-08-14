const { processImportJob } = require("./importWorker");
const { Queue, Worker } = require("bullmq");
const { createRedisConnection, getRedisConnection } = require("./redis");

const queueName = "importQueue";

let importQueue = null;
let importWorker = null;
let startupPromise = null;

function isRedisAvailable() {
    // Redis is optional. The platform runs imports synchronously in fallback
    // mode unless the operator explicitly enables BullMQ/Redis.
    return process.env.ENABLE_REDIS === "true" && Boolean(process.env.REDIS_URL);
}

function initializeQueue(connection) {
    if (importQueue) return importQueue;
    importQueue = new Queue(queueName, {
        connection,
        defaultJobOptions: {
            attempts: 3,
            removeOnComplete: 50,
            removeOnFail: 100,
            backoff: { type: "exponential", delay: 2000 },
        },
    });
    return importQueue;
}

function initializeWorker(connection) {
    if (importWorker) return importWorker;
    importWorker = new Worker(
        queueName,
        async (job) => processImportJob(job.data, { jobId: job.id }),
        { connection, concurrency: Number(process.env.IMPORT_CONCURRENCY || 2) }
    );

    importWorker.on("completed", (job) => {
        console.log(`[importQueue] job ${job.id} completed`);
    });

    importWorker.on("failed", (job, error) => {
        console.error(`[importQueue] job ${job?.id} failed:`, error.message);
    });

    console.log("BullMQ Worker Started");
    return importWorker;
}

async function enqueueImport(payload) {
    if (importQueue) {
        const job = await importQueue.add(payload.mode, payload);
        return { queued: true, jobId: job.id, provider: "bullmq" };
    }

    const result = await processImportJob(payload);
    return { queued: false, provider: "fallback", result };
}

async function startImportWorker() {
    if (!isRedisAvailable()) {
        console.log("Redis disabled, using fallback import mode");
        return null;
    }

    if (startupPromise) return startupPromise;

    startupPromise = (async () => {
        try {
            const connection = createRedisConnection();

            await connection.ping();
            console.log("Redis Connected");
            initializeQueue(connection);
            initializeWorker(connection);

            console.log("Import Queue Ready");
            return importWorker;
        } catch (error) {
            console.error("Redis connection failed, using fallback mode");
            console.error(error.message);
            importQueue = null;
            importWorker = null;
            return null;
        } finally {
            startupPromise = null;
        }
    })();

    return startupPromise;
}

module.exports = {
    enqueueImport,
    startImportWorker,
    getRedisConnection,
    get importQueue() {
        return importQueue;
    },
    get importWorker() {
        return importWorker;
    },
};
