const { createClient } = require("redis");
const logger = require("../utils/logger");
const { REDIS_URL } = require("./env");

let client;
let connectPromise;

const redisReconnectStrategy = (retries) =>
  Math.min(250 * 2 ** Math.min(retries, 5), 5000);

const createRedisClient = () => {
  if (client) return client;

  client = createClient({
    url: REDIS_URL,
    disableOfflineQueue: true,
    socket: {
      connectTimeout: 3000,
      reconnectStrategy: redisReconnectStrategy,
    },
  });
  client.on("error", (error) => {
    logger.warn(`Redis client error (${error.name || "RedisError"}).`);
  });
  return client;
};

const getRedisClient = () => createRedisClient();

const createRedisSubscriber = () => createRedisClient().duplicate();

const waitForRedisReady = (redisClient) =>
  new Promise((resolve, reject) => {
    const cleanup = () => {
      redisClient.off("ready", onReady);
      redisClient.off("error", onError);
      redisClient.off("end", onEnd);
    };
    const onReady = () => {
      cleanup();
      resolve(redisClient);
    };
    const onError = (error) => {
      cleanup();
      reject(error);
    };
    const onEnd = () => {
      cleanup();
      reject(new Error("Redis connection closed before becoming ready"));
    };
    redisClient.once("ready", onReady);
    redisClient.once("error", onError);
    redisClient.once("end", onEnd);
  });

const connectRedis = async (redisClient = createRedisClient()) => {
  if (redisClient.isReady) return redisClient;
  if (redisClient.isOpen) return waitForRedisReady(redisClient);
  if (redisClient === client && connectPromise) return connectPromise;

  const promise = redisClient.connect();
  if (redisClient === client) connectPromise = promise;
  try {
    await promise;
  } finally {
    if (redisClient === client) connectPromise = null;
  }
  return redisClient;
};

const connectRedisWithTimeout = async (
  redisClient = createRedisClient(),
  timeoutMs = 1200,
) => {
  let timeout;
  try {
    return await Promise.race([
      connectRedis(redisClient),
      new Promise((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error("Redis connection timed out")),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    clearTimeout(timeout);
  }
};

const publishRedisMessage = async (channel, message) => {
  const redisClient = createRedisClient();
  await connectRedisWithTimeout(redisClient);
  return redisClient.publish(channel, message);
};

const closeRedis = async () => {
  if (client?.isOpen) {
    await client.quit().catch(() => client.disconnect());
  }
  client = null;
  connectPromise = null;
};

module.exports = {
  REDIS_URL,
  createRedisClient,
  redisReconnectStrategy,
  connectRedis,
  connectRedisWithTimeout,
  createRedisSubscriber,
  getRedisClient,
  publishRedisMessage,
  closeRedis,
};
