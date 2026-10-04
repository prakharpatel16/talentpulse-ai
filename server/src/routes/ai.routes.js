const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai.controller');
const asyncHandler = require('../middleware/asyncHandler');
const { authMiddleware } = require('../middleware/auth.middleware');
const { rateLimiter } = require('../middleware/rateLimit.middleware');

router.post('/resume-analysis/:resumeId', authMiddleware, rateLimiter({ maxRequests: 20 }), asyncHandler(aiController.startResumeAnalysis));
router.get('/resume-analysis/:resumeId', authMiddleware, asyncHandler(aiController.getResumeAnalysis));

module.exports = router;
