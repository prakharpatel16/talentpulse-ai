const express = require('express');
const router = express.Router();
const interviewController = require('../controllers/interview.controller');
const asyncHandler = require('../middleware/asyncHandler');
const { authMiddleware } = require('../middleware/auth.middleware');
const { requireRole } = require('../middleware/role.middleware');
const { validate } = require('../middleware/validation.middleware');
const {
  createInterviewSchema,
  submitAnswerSchema,
  addNoteSchema
} = require('../validators/interview.validator');

// Recruiter actions
router.post('/', authMiddleware, requireRole('recruiter'), validate(createInterviewSchema), asyncHandler(interviewController.createInterview));
router.get('/recruiter/all', authMiddleware, requireRole('recruiter'), asyncHandler(interviewController.getRecruiterInterviews));
router.post('/:id/evaluate', authMiddleware, requireRole('recruiter'), asyncHandler(interviewController.evaluateInterview));
router.post('/:id/notes', authMiddleware, requireRole('recruiter'), validate(addNoteSchema), asyncHandler(interviewController.addNote));

// Candidate actions
router.get('/candidate/me', authMiddleware, requireRole('candidate'), asyncHandler(interviewController.getMyInterviews));
router.post('/:id/answer', authMiddleware, requireRole('candidate'), validate(submitAnswerSchema), asyncHandler(interviewController.submitAnswer));
router.post('/:id/submit', authMiddleware, requireRole('candidate'), asyncHandler(interviewController.submitInterview));

// Shared
router.get('/:id', authMiddleware, asyncHandler(interviewController.getInterview));
router.get('/:id/report', authMiddleware, asyncHandler(interviewController.getReport));

module.exports = router;
