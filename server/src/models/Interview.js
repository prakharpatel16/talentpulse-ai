const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  question: {
    type: String,
    required: true
  },
  answer: {
    type: String,
    default: ''
  },
  evaluation: {
    relevance: { type: Number, default: 0 },
    technicalUnderstanding: { type: Number, default: 0 },
    completeness: { type: Number, default: 0 },
    clarity: { type: Number, default: 0 },
    feedback: { type: String, default: '' }
  }
}, { _id: false });

const InterviewSchema = new mongoose.Schema({
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true,
    index: true
  },
  candidateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  recruiterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  experienceLevel: {
    type: String,
    enum: ['entry', 'mid', 'senior', 'staff'],
    default: 'senior'
  },
  requiredSkills: [{
    type: String
  }],
  interviewType: {
    type: String,
    enum: ['technical', 'system_design', 'behavioral', 'mixed'],
    default: 'technical'
  },
  numberOfQuestions: {
    type: Number,
    default: 5
  },
  questions: [QuestionSchema],
  overallEvaluation: {
    summary: { type: String, default: '' },
    recommendation: {
      type: String,
      enum: ['Strong Hire', 'Hire', 'Consider', 'No Hire', 'Pending'],
      default: 'Pending'
    },
    score: { type: Number, default: 0 },
    strengths: [{ type: String }],
    weakAreas: [{ type: String }],
    technicalAssessment: { type: String, default: '' }
  },
  notes: [{
    authorName: { type: String, required: true },
    role: { type: String, default: 'Recruiter' },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  }],
  status: {
    type: String,
    enum: ['created', 'in_progress', 'completed'],
    default: 'created',
    index: true
  },
  startedAt: Date,
  completedAt: Date
}, {
  timestamps: true
});

module.exports = mongoose.model('Interview', InterviewSchema);
