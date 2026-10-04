const express = require('express');
const router = express.Router();
const aiController = require('../controllers/ai.controller');
const { authMiddleware } = require('../middleware/auth.middleware');
const { rateLimiter } = require('../middleware/rateLimit.middleware');

router.post('/resume-analysis/:resumeId', authMiddleware, rateLimiter({ maxRequests: 20 }), aiController.startResumeAnalysis);
router.get('/resume-analysis/:resumeId', authMiddleware, aiController.getResumeAnalysis);

module.exports = router;
