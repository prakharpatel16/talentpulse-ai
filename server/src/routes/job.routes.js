const express = require('express');
const router = express.Router();
const jobController = require('../controllers/job.controller');
const { authMiddleware, optionalAuth } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const { validate } = require('../middleware/validation.middleware');
const { createJobSchema, updateJobSchema } = require('../validators/job.validator');

// Public
router.get('/', optionalAuth, jobController.getJobs);

// Recruiter specific
router.get('/recruiter/all', authMiddleware, requireRole('recruiter'), jobController.getRecruiterJobs);
router.post('/', authMiddleware, requireRole('recruiter'), validate(createJobSchema), jobController.createJob);
router.patch('/:id', authMiddleware, requireRole('recruiter'), validate(updateJobSchema), jobController.updateJob);
router.patch('/:id/publish', authMiddleware, requireRole('recruiter'), jobController.publishJob);
router.patch('/:id/close', authMiddleware, requireRole('recruiter'), jobController.closeJob);
router.delete('/:id', authMiddleware, requireRole('recruiter'), jobController.deleteJob);

// Public by ID
router.get('/:id', optionalAuth, jobController.getJobById);

module.exports = router;
