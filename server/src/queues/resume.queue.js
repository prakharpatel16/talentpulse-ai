const { Queue } = require("bullmq");
const logger = require("../utils/logger");
const { RESUME_QUEUE_NAME, resumeJobOptions } = require("./constants");
const { createBullMQRedisConnection } = require("./redisClient");
const {
  connectRedisWithTimeout,
  getRedisClient,
} = require("../config/redis");

const waitForProducerRedis = () =>
  connectRedisWithTimeout(getRedisClient(), 1200);

const createResumeQueue = ({ QueueClass = Queue, connection } = {}) => {
  const redisConnection = connection
    ? null
    : createBullMQRedisConnection();
  const queue = new QueueClass(RESUME_QUEUE_NAME, {
    connection: connection || redisConnection.connection,
    defaultJobOptions: resumeJobOptions,
  });
  queue.on?.("error", (error) => {
    logger.error(`Resume queue connection error (${error.name || "QueueError"}).`);
  });

  return {
    queue,

    async enqueueResumeAnalysis(resumeId, candidateId) {
      if (redisConnection) await redisConnection.waitUntilReady(1200);
      const jobId = `resume-analysis-${resumeId}`;
      const previous = await queue.getJob(jobId);
      if (previous) {
        const state = await previous.getState();
        if (["waiting", "active", "delayed", "waiting-children"].includes(state)) {
          return previous;
        }
        await previous.remove();
      }

      return queue.add(
        "process-resume",
        { resumeId: String(resumeId), candidateId: String(candidateId) },
        { jobId },
      );
    },

    close() {
      return queue.close().finally(() => redisConnection?.close());
    },
  };
};

let sharedQueue;
const getSharedQueue = () => {
  if (!sharedQueue) sharedQueue = createResumeQueue();
  return sharedQueue;
};
const resumeQueue = {
  async enqueueResumeAnalysis(...args) {
    await waitForProducerRedis();
    return getSharedQueue().enqueueResumeAnalysis(...args);
  },
  async close() {
    const queue = sharedQueue;
    sharedQueue = null;
    if (queue) await queue.close();
  },
};

module.exports = {
  RESUME_QUEUE_NAME,
  resumeJobOptions,
  createResumeQueue,
  resumeQueue,
};
