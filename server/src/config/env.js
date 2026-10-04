const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const NODE_ENV = process.env.NODE_ENV || "development";
const JWT_SECRET = process.env.JWT_SECRET;
const COOKIE_SECRET = process.env.COOKIE_SECRET;
const MONGODB_URI = process.env.MONGODB_URI;
const CLIENT_URL = process.env.CLIENT_URL;
const REDIS_URL = process.env.REDIS_URL;
const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.resolve(__dirname, "../../uploads");

if (
  NODE_ENV === "production" &&
  (!JWT_SECRET ||
    JWT_SECRET.length < 32 ||
    !COOKIE_SECRET ||
    COOKIE_SECRET.length < 32 ||
    !MONGODB_URI ||
    !CLIENT_URL ||
    !REDIS_URL)
) {
  throw new Error(
    "Production requires MONGODB_URI, REDIS_URL, CLIENT_URL, and signing secrets of at least 32 characters.",
  );
}

module.exports = {
  PORT: process.env.PORT || 5000,
  NODE_ENV,
  CLIENT_URL: CLIENT_URL || "http://localhost:5173",
  CLIENT_URLS: (CLIENT_URL || "http://localhost:5173")
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean),
  JWT_SECRET: JWT_SECRET || "development-only-jwt-secret-change-before-deploy",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  COOKIE_SECRET:
    COOKIE_SECRET || "development-only-cookie-secret-change-before-deploy",
  MONGODB_URI: MONGODB_URI || "mongodb://localhost:27017/talentpulse",
  REDIS_URL: REDIS_URL || "redis://localhost:6379",
  UPLOAD_DIR,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || "",
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || "",
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || "",
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || "",
};
