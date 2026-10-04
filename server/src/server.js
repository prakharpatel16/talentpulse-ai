const http = require("http");
const { Server } = require("socket.io");
const cookie = require("cookie");
const app = require("./app");
const { PORT, CLIENT_URLS, NODE_ENV } = require("./config/env");
const { connectDB, disconnectDB } = require("./config/db");
const logger = require("./utils/logger");
const seedData = require("./utils/seed");
const {
  setSocketIO,
  closeSocketEventSubscriber,
} = require("./services/notification.service");
const { closeRedis } = require("./config/redis");
const { resumeQueue } = require("./queues");
const { verifyToken } = require("./utils/jwt");
const User = require("./models/User");

const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin:
      NODE_ENV === "production"
        ? CLIENT_URLS
        : [...new Set([...CLIENT_URLS, "http://localhost:3000"])],
    credentials: true,
  },
});

setSocketIO(io);

io.use(async (socket, next) => {
  try {
    const token = cookie.parse(
      socket.handshake.headers.cookie || "",
    ).access_token;
    if (!token) return next(new Error("Authentication required"));

    const decoded = verifyToken(token);
    const user = await User.findById(decoded.userId).select("_id");
    if (!user) return next(new Error("Authentication required"));

    socket.data.userId = user._id.toString();
    next();
  } catch {
    next(new Error("Authentication failed"));
  }
});

io.on("connection", (socket) => {
  logger.info(`Socket client connected: ${socket.id}`);
  socket.join(`user_${socket.data.userId}`);

  socket.on("disconnect", () => {
    logger.info(`Socket client disconnected: ${socket.id}`);
  });
});

const startServer = async () => {
  try {
    await connectDB();
    if (NODE_ENV !== "production") {
      await seedData();
    }

    server.listen(PORT, () => {
      logger.info(`=======================================================`);
      logger.info(` TalentPulse Backend Server is RUNNING on port ${PORT}`);
      logger.info(` Base API URL:      http://localhost:${PORT}/api`);
      logger.info(` Swagger Docs:      http://localhost:${PORT}/api/docs`);
      logger.info(` Health Check:      http://localhost:${PORT}/api/health`);
      logger.info(`=======================================================`);
    });
  } catch (err) {
    logger.error(`Failed to launch server: ${err.message}`, {
      stack: err.stack,
    });
    process.exit(1);
  }
};

// Graceful shutdown handling
const handleShutdown = async (signal) => {
  logger.info(
    `${signal} received. Closing HTTP server and database connections...`,
  );
  server.close(async () => {
    await resumeQueue.close();
    await closeSocketEventSubscriber();
    await closeRedis();
    await disconnectDB();
    logger.info("Server gracefully terminated.");
    process.exit(0);
  });
};

process.on("SIGTERM", () => handleShutdown("SIGTERM"));
process.on("SIGINT", () => handleShutdown("SIGINT"));

if (require.main === module) {
  startServer();
}

module.exports = { app, server };
