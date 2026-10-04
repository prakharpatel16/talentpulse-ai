const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const companyRoutes = require('./company.routes');
const jobRoutes = require('./job.routes');
const applicationRoutes = require('./application.routes');
const resumeRoutes = require('./resume.routes');
const aiRoutes = require('./ai.routes');
const matchingRoutes = require('./matching.routes');
const interviewRoutes = require('./interview.routes');
const dashboardRoutes = require('./dashboard.routes');
const ragRoutes = require('./rag.routes');
const notificationRoutes = require('./notification.routes');

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

router.use('/auth', authRoutes);
router.use('/companies', companyRoutes);
router.use('/jobs', jobRoutes);
router.use('/applications', applicationRoutes);
router.use('/resumes', resumeRoutes);
router.use('/ai', aiRoutes);
router.use('/matching', matchingRoutes);
router.use('/interviews', interviewRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/rag', ragRoutes);
router.use('/notifications', notificationRoutes);

module.exports = router;
