const mongoose = require('mongoose');

const JobSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
    index: true
  },
  recruiterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    index: 'text'
  },
  requisitionCode: {
    type: String,
    trim: true
  },
  department: {
    type: String,
    default: 'Engineering & Product'
  },
  description: {
    type: String,
    required: true
  },
  responsibilities: [{
    type: String
  }],
  requiredSkills: [{
    type: String,
    index: true
  }],
  preferredSkills: [{
    type: String
  }],
  experience: {
    min: { type: Number, default: 0 },
    max: { type: Number, default: 10 }
  },
  location: {
    type: String,
    default: 'Remote',
    index: true
  },
  employmentType: {
    type: String,
    enum: ['full-time', 'part-time', 'contract', 'internship'],
    default: 'full-time'
  },
  salaryRange: {
    min: { type: Number, default: 0 },
    max: { type: Number, default: 0 },
    currency: { type: String, default: 'USD' }
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'closed'],
    default: 'published',
    index: true
  },
  embedding: {
    type: [Number],
    default: []
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Job', JobSchema);
