const mongoose = require('mongoose');

const ApplicationSchema = new mongoose.Schema({
  candidateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true,
    index: true
  },
  resumeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resume',
    required: true
  },
  coverLetter: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['applied', 'under_review', 'shortlisted', 'interview', 'selected', 'rejected'],
    default: 'applied',
    index: true
  },
  matchPercentage: {
    type: Number,
    default: 0
  },
  matchData: {
    matchingSkills: [{ type: String }],
    missingSkills: [{ type: String }],
    relevantExperience: [{ type: String }],
    relevantProjects: [{ type: String }],
    explanation: { type: String, default: '' }
  },
  appliedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

ApplicationSchema.index({ candidateId: 1, jobId: 1 }, { unique: true });

module.exports = mongoose.model('Application', ApplicationSchema);
