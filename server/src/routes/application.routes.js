const express = require('express');
const router = express.Router();
const applicationController = require('../controllers/application.controller');
const { authMiddleware } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const { validate } = require('../middleware/validation.middleware');
const { applyJobSchema, updateStatusSchema } = require('../validators/application.validator');

// Candidate routes
router.post('/', authMiddleware, requireRole('candidate'), validate(applyJobSchema), applicationController.applyJob);
router.get('/me', authMiddleware, requireRole('candidate'), applicationController.getMyApplications);

// Recruiter routes
router.get('/', authMiddleware, requireRole('recruiter'), applicationController.getRecruiterApplications);
router.patch('/:id/status', authMiddleware, requireRole('recruiter'), validate(updateStatusSchema), applicationController.updateStatus);

// Shared route (with ownership check)
router.get('/:id', authMiddleware, applicationController.getApplicationById);

module.exports = router;
