const express = require('express');
const router = express.Router();
const matchingController = require('../controllers/matching.controller');
const { authMiddleware } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');

router.post('/', authMiddleware, matchingController.matchResumeWithJob);
router.get('/job/:jobId', authMiddleware, requireRole('recruiter'), matchingController.getJobMatches);
router.post('/compare', authMiddleware, requireRole('recruiter'), matchingController.compareCandidates);

module.exports = router;
