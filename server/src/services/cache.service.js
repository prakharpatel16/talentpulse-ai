const {
  connectRedisWithTimeout,
  getRedisClient,
} = require("../config/redis");
const logger = require("../utils/logger");

const createCacheService = ({ clientProvider = getRedisClient } = {}) => {
  const withClient = async (operation, fallback) => {
    try {
      const client = clientProvider();
      await connectRedisWithTimeout(client);
      return await operation(client);
    } catch (error) {
      logger.warn(`Redis cache operation unavailable (${error.name || "RedisError"}).`);
      return fallback;
    }
  };

  return {
    get(key) {
      return withClient(async (client) => {
        const value = await client.get(key);
        if (value === null) return null;
        try {
          return JSON.parse(value);
        } catch {
          await client.del(key).catch(() => {});
          return null;
        }
      }, null);
    },

    set(key, value, ttlSeconds = 300) {
      let serialized;
      try {
        serialized = JSON.stringify(value);
      } catch (error) {
        logger.warn(`Skipping non-serializable Redis cache value (${error.name}).`);
        return Promise.resolve(false);
      }
      if (serialized === undefined) return Promise.resolve(false);
      const ttl =
        Number.isFinite(ttlSeconds) && ttlSeconds > 0
          ? Math.ceil(ttlSeconds)
          : 300;

      return withClient(async (client) => {
        await client.set(key, serialized, { EX: ttl });
        return true;
      }, false);
    },

    del(key) {
      return withClient((client) => client.del(key), 0);
    },

    exists(key) {
      return withClient(async (client) => (await client.exists(key)) > 0, false);
    },

    async delPattern(pattern) {
      return withClient(async (client) => {
        let cursor = 0;
        let deleted = 0;
        do {
          const result = await client.scan(cursor, {
            MATCH: pattern,
            COUNT: 100,
          });
          cursor = Number(result.cursor);
          if (result.keys.length) deleted += await client.del(result.keys);
        } while (cursor !== 0);
        return deleted;
      }, 0);
    },
  };
};

module.exports = createCacheService();
module.exports.createCacheService = createCacheService;
