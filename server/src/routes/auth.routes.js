const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
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
router.post('/register', rateLimiter({ maxRequests: 20 }), validate(registerSchema), authController.register);
router.post('/login', rateLimiter({ maxRequests: 30 }), validate(loginSchema), authController.login);

// Protected
router.post('/logout', authMiddleware, authController.logout);
router.get('/me', authMiddleware, authController.getMe);
router.patch('/profile', authMiddleware, validate(updateProfileSchema), authController.updateProfile);
router.patch('/change-password', authMiddleware, validate(changePasswordSchema), authController.changePassword);

module.exports = router;
