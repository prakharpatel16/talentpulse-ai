const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const asyncHandler = require('../middleware/asyncHandler');
const { authMiddleware } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');

router.get('/overview', authMiddleware, requireRole('recruiter'), asyncHandler(dashboardController.getOverview));
router.get('/analytics', authMiddleware, requireRole('recruiter'), asyncHandler(dashboardController.getAnalytics));

module.exports = router;
