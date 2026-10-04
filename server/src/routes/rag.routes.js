const express = require('express');
const router = express.Router();
const ragController = require('../controllers/rag.controller');
const asyncHandler = require('../middleware/asyncHandler');
const { authMiddleware } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const { rateLimiter } = require('../middleware/rateLimit.middleware');

router.post('/query', authMiddleware, requireRole('recruiter'), rateLimiter({ maxRequests: 25 }), asyncHandler(ragController.queryAssistant));
router.get('/threads', authMiddleware, requireRole('recruiter'), asyncHandler(ragController.getThreads));
router.get('/threads/:id', authMiddleware, requireRole('recruiter'), asyncHandler(ragController.getThreadById));
router.post('/threads', authMiddleware, requireRole('recruiter'), asyncHandler(ragController.createThread));

module.exports = router;
