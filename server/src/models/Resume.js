const mongoose = require('mongoose');

const ResumeSchema = new mongoose.Schema({
  candidateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  fileUrl: {
    type: String,
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  fileType: {
    type: String,
    default: 'application/pdf'
  },
  fileSize: {
    type: Number,
    default: 0
  },
  isPrimary: {
    type: Boolean,
    default: false
  },
  processingStatus: {
    type: String,
    enum: ['uploaded', 'queued', 'processing', 'completed', 'failed'],
    default: 'uploaded',
    index: true
  },
  parsedText: {
    type: String,
    default: ''
  },
  structuredData: {
    name: String,
    email: String,
    phone: String,
    location: String,
    summary: String,
    skills: [String],
    education: [{
      institution: String,
      degree: String,
      year: String
    }],
    experience: [{
      company: String,
      position: String,
      duration: String,
      highlights: [String]
    }],
    projects: [{
      title: String,
      description: String,
      technologies: [String]
    }],
    certifications: [String]
  },
  embedding: {
    type: [Number],
    default: []
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Resume', ResumeSchema);
