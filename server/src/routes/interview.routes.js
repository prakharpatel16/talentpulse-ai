const express = require('express');
const router = express.Router();
const interviewController = require('../controllers/interview.controller');
const { authMiddleware } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const { validate } = require('../middleware/validation.middleware');
const {
  createInterviewSchema,
  submitAnswerSchema,
  addNoteSchema
} = require('../validators/interview.validator');

// Recruiter actions
router.post('/', authMiddleware, requireRole('recruiter'), validate(createInterviewSchema), interviewController.createInterview);
router.get('/recruiter/all', authMiddleware, requireRole('recruiter'), interviewController.getRecruiterInterviews);
router.post('/:id/evaluate', authMiddleware, requireRole('recruiter'), interviewController.evaluateInterview);
router.post('/:id/notes', authMiddleware, requireRole('recruiter'), validate(addNoteSchema), interviewController.addNote);

// Candidate actions
router.get('/candidate/me', authMiddleware, requireRole('candidate'), interviewController.getMyInterviews);
router.post('/:id/answer', authMiddleware, requireRole('candidate'), validate(submitAnswerSchema), interviewController.submitAnswer);
router.post('/:id/submit', authMiddleware, requireRole('candidate'), interviewController.submitInterview);

// Shared
router.get('/:id', authMiddleware, interviewController.getInterview);
router.get('/:id/report', authMiddleware, interviewController.getReport);

module.exports = router;
