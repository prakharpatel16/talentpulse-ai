const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");

const { CLIENT_URLS, NODE_ENV } = require("./config/env");
const apiRoutes = require("./routes/index");
const errorHandler = require("./middleware/error.middleware");
const { swaggerUi, swaggerDocument } = require("./config/swagger");
const ApiResponse = require("./utils/apiResponse");

const app = express();

// Security HTTP headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

// CORS configuration supporting HTTP-only credentials
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (CLIENT_URLS.includes(origin)) {
        return callback(null, true);
      }
      if (NODE_ENV !== "production") {
        try {
          const { hostname, protocol } = new URL(origin);
          if (
            protocol === "http:" &&
            ["localhost", "127.0.0.1"].includes(hostname)
          ) {
            return callback(null, true);
          }
        } catch (err) {
          return callback(err);
        }
      }
      return callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
    ],
  }),
);

// Request body and cookie parsers
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// Swagger API Documentation
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Mount main API routes
app.use("/api", apiRoutes);

// Catch-all 404 handler for undefined endpoints
app.use((req, res) => {
  return ApiResponse.notFound(res, `Cannot ${req.method} ${req.originalUrl}`);
});

// Centralized error handling
app.use(errorHandler);

module.exports = app;
