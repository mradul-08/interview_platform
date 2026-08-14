const IORedis = require("ioredis");

let redisConnection = null;

function createRedisConnection() {
    if (redisConnection) return redisConnection;

    const url = process.env.REDIS_URL;
    if (!url) {
        throw new Error("REDIS_URL is missing");
    }

    redisConnection = new IORedis(url, {
        maxRetriesPerRequest: null,
        enableReadyCheck: true,
    });

    redisConnection.on("error", (error) => {
        console.error("Redis connection error:", error.message);
    });

    return redisConnection;
}

function getRedisConnection() {
    return redisConnection || createRedisConnection();
}

async function closeRedisConnection() {
    if (!redisConnection) return;
    await redisConnection.quit();
    redisConnection = null;
}

module.exports = {
    createRedisConnection,
    getRedisConnection,
    closeRedisConnection,
};
