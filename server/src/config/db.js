const mongoose = require("mongoose");
const logger = require("../utils/logger");
const { MONGODB_URI, NODE_ENV } = require("./env");

let memoryServer = null;

const connectDB = async ({ allowMemoryFallback = NODE_ENV !== "production" } = {}) => {
  try {
    mongoose.set("strictQuery", false);

    // First attempt connecting to configured URI with short timeout
    logger.info("Attempting MongoDB connection...");
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 3000,
      connectTimeoutMS: 3000,
    });
    logger.info("MongoDB connected successfully via URI.");
    return;
  } catch (err) {
    if (NODE_ENV === "production" || !allowMemoryFallback) {
      logger.error(`MongoDB connection failed: ${err.message}`);
      throw err;
    }

    logger.warn(
      `Could not connect to external MongoDB: ${err.message}. Initializing embedded memory server...`,
    );
    try {
      const { MongoMemoryServer } = require("mongodb-memory-server");
      memoryServer = await MongoMemoryServer.create();
      const memUri = memoryServer.getUri();
      await mongoose.connect(memUri);
      logger.info(`Connected to embedded MongoDB Memory Server at: ${memUri}`);
    } catch (memErr) {
      logger.error(`Failed to start MongoDB Memory Server: ${memErr.message}`);
      throw memErr;
    }
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    if (memoryServer) {
      await memoryServer.stop();
    }
    logger.info("MongoDB disconnected.");
  } catch (err) {
    logger.error(`Error disconnecting MongoDB: ${err.message}`);
  }
};

module.exports = {
  connectDB,
  disconnectDB,
};
