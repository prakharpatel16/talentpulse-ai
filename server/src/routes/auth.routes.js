const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const asyncHandler = require('../middleware/asyncHandler');
const { authMiddleware } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validation.middleware');
const { rateLimiter } = require('../middleware/rateLimit.middleware');
const {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema
} = require('../validators/auth.validator');

// Public
router.post('/register', rateLimiter({ maxRequests: 20 }), validate(registerSchema), asyncHandler(authController.register));
router.post('/login', rateLimiter({ maxRequests: 30 }), validate(loginSchema), asyncHandler(authController.login));

// Protected
router.post('/logout', authMiddleware, asyncHandler(authController.logout));
router.get('/me', authMiddleware, asyncHandler(authController.getMe));
router.patch('/profile', authMiddleware, validate(updateProfileSchema), asyncHandler(authController.updateProfile));
router.patch('/change-password', authMiddleware, validate(changePasswordSchema), asyncHandler(authController.changePassword));

module.exports = router;
