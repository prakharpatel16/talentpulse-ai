const { connectDB, disconnectDB } = require("./config/db");
const { closeRedis } = require("./config/redis");
const { createResumeWorker } = require("./workers");
const { createBullMQRedisConnection } = require("./queues/redisClient");
const logger = require("./utils/logger");

let worker;
let workerRedisConnection;

const startWorker = async () => {
  await connectDB({ allowMemoryFallback: false });
  workerRedisConnection = createBullMQRedisConnection({ worker: true });
  await workerRedisConnection.waitUntilReady();
  worker = createResumeWorker({ connection: workerRedisConnection.connection });
  logger.info("TalentPulse background worker is running.");
};

const stopWorker = async (signal) => {
  logger.info(`${signal} received. Closing worker and database connections...`);
  await worker?.close();
  if (!worker) await workerRedisConnection?.close();
  await disconnectDB();
  await closeRedis();
  process.exit(0);
};

process.on("SIGTERM", () => void stopWorker("SIGTERM"));
process.on("SIGINT", () => void stopWorker("SIGINT"));

if (require.main === module) {
  startWorker().catch((error) => {
    logger.error(`Failed to launch background worker: ${error.message}`);
    process.exit(1);
  });
}

module.exports = { startWorker, stopWorker };
