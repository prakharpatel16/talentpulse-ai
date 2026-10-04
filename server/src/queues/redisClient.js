const { createClient } = require("redis");
const { createNodeRedisClient } = require("bullmq");
const logger = require("../utils/logger");
const { REDIS_URL } = require("../config/env");
const {
  getRedisClient,
  redisReconnectStrategy,
} = require("../config/redis");

const getBullMQRedisClientOptions = ({ worker = false } = {}) => ({
  url: REDIS_URL,
  disableOfflineQueue: !worker,
  socket: {
    connectTimeout: 3000,
    reconnectStrategy: redisReconnectStrategy,
  },
});

const createBullMQRedisConnection = ({
  worker = false,
  redisClient = worker ? null : getRedisClient(),
} = {}) => {
  const rawClient =
    redisClient || createClient(getBullMQRedisClientOptions({ worker }));
  rawClient.on("error", (error) => {
    logger.warn(`BullMQ Redis client error (${error.name || "RedisError"}).`);
  });
  const connection = createNodeRedisClient(rawClient);
  connection.on("error", (error) => {
    logger.warn(`BullMQ Redis adapter error (${error.name || "RedisError"}).`);
  });

  return {
    connection,
    async waitUntilReady(timeoutMs = null) {
      if (rawClient.isReady) return;
      let timeout;
      let cleanup = () => {};
      const ready = new Promise((resolve, reject) => {
        cleanup = () => {
          rawClient.off("ready", onReady);
          rawClient.off("end", onEnd);
        };
        const onReady = () => {
          cleanup();
          resolve();
        };
        const onEnd = () => {
          cleanup();
          reject(new Error("BullMQ Redis connection closed"));
        };
        rawClient.once("ready", onReady);
        rawClient.once("end", onEnd);
      });
      try {
        if (timeoutMs !== null) {
          const timedOut = new Promise((_, reject) => {
            timeout = setTimeout(
              () => reject(new Error("BullMQ Redis connection timed out")),
              timeoutMs,
            );
          });
          await Promise.race([ready, timedOut]);
        } else {
          await ready;
        }
      } finally {
        clearTimeout(timeout);
        cleanup();
      }
    },
    async close() {
      await connection.quit();
    },
  };
};

module.exports = {
  getBullMQRedisClientOptions,
  createBullMQRedisConnection,
};
