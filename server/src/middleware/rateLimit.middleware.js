const ApiResponse = require("../utils/apiResponse");

const rateLimitStore = new Map();

// Periodic cleanup every 5 minutes
const cleanupInterval = setInterval(
  () => {
    const now = Date.now();
    for (const [key, data] of rateLimitStore.entries()) {
      if (now > data.resetTime) {
        rateLimitStore.delete(key);
      }
    }
  },
  5 * 60 * 1000,
);
cleanupInterval.unref();

const rateLimiter = ({
  windowMs = 60 * 1000,
  maxRequests = 60,
  message = "Too many requests",
} = {}) => {
  return (req, res, next) => {
    const ip =
      req.ip ||
      req.headers["x-forwarded-for"] ||
      req.socket.remoteAddress ||
      "unknown";
    const key = `${ip}_${req.baseUrl || req.path}`;
    const now = Date.now();

    let record = rateLimitStore.get(key);

    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + windowMs,
      };
      rateLimitStore.set(key, record);
    } else {
      record.count += 1;
    }

    res.setHeader("X-RateLimit-Limit", maxRequests);
    res.setHeader(
      "X-RateLimit-Remaining",
      Math.max(0, maxRequests - record.count),
    );
    res.setHeader("X-RateLimit-Reset", Math.ceil(record.resetTime / 1000));

    if (record.count > maxRequests) {
      return ApiResponse.tooManyRequests(res, message);
    }

    next();
  };
};

module.exports = {
  rateLimiter,
};
