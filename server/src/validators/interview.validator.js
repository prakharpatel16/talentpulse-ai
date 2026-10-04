const { z } = require('zod');

const createInterviewSchema = z.object({
  jobId: z.string().min(1, 'Job ID is required'),
  candidateId: z.string().min(1, 'Candidate ID is required'),
  experienceLevel: z.enum(['entry', 'mid', 'senior', 'staff']).default('senior'),
  requiredSkills: z.array(z.string()).default([]),
  interviewType: z.enum(['technical', 'system_design', 'behavioral', 'mixed']).default('technical'),
  numberOfQuestions: z.number().int().min(1).max(10).default(5)
});

const submitAnswerSchema = z.object({
  questionId: z.string().min(1, 'Question ID is required'),
  answer: z.string().min(1, 'Answer is required')
});

const addNoteSchema = z.object({
  content: z.string().min(1, 'Note content cannot be empty')
});

module.exports = {
  createInterviewSchema,
  submitAnswerSchema,
  addNoteSchema
};
