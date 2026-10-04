const express = require('express');
const router = express.Router();
const ragController = require('../controllers/rag.controller');
const { authMiddleware } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const { rateLimiter } = require('../middleware/rateLimit.middleware');

router.post('/query', authMiddleware, requireRole('recruiter'), rateLimiter({ maxRequests: 25 }), ragController.queryAssistant);
router.get('/threads', authMiddleware, requireRole('recruiter'), ragController.getThreads);
router.get('/threads/:id', authMiddleware, requireRole('recruiter'), ragController.getThreadById);
router.post('/threads', authMiddleware, requireRole('recruiter'), ragController.createThread);

module.exports = router;
