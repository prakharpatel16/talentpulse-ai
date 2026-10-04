const express = require('express');
const router = express.Router();
const matchingController = require('../controllers/matching.controller');
const asyncHandler = require('../middleware/asyncHandler');
const { authMiddleware } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');

router.post('/', authMiddleware, asyncHandler(matchingController.matchResumeWithJob));
router.get('/job/:jobId', authMiddleware, requireRole('recruiter'), asyncHandler(matchingController.getJobMatches));
router.post('/compare', authMiddleware, requireRole('recruiter'), asyncHandler(matchingController.compareCandidates));

module.exports = router;
