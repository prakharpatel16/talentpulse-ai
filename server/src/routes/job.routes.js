const express = require('express');
const router = express.Router();
const jobController = require('../controllers/job.controller');
const asyncHandler = require('../middleware/asyncHandler');
const { authMiddleware, optionalAuth } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const { validate } = require('../middleware/validation.middleware');
const { createJobSchema, updateJobSchema } = require('../validators/job.validator');

// Public
router.get('/', optionalAuth, asyncHandler(jobController.getJobs));

// Recruiter specific
router.get('/recruiter/all', authMiddleware, requireRole('recruiter'), asyncHandler(jobController.getRecruiterJobs));
router.post('/', authMiddleware, requireRole('recruiter'), validate(createJobSchema), asyncHandler(jobController.createJob));
router.patch('/:id', authMiddleware, requireRole('recruiter'), validate(updateJobSchema), asyncHandler(jobController.updateJob));
router.patch('/:id/publish', authMiddleware, requireRole('recruiter'), asyncHandler(jobController.publishJob));
router.patch('/:id/close', authMiddleware, requireRole('recruiter'), asyncHandler(jobController.closeJob));
router.delete('/:id', authMiddleware, requireRole('recruiter'), asyncHandler(jobController.deleteJob));

// Public by ID
router.get('/:id', optionalAuth, asyncHandler(jobController.getJobById));

module.exports = router;
