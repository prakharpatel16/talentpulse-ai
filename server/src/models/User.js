const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  passwordHash: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['candidate', 'recruiter'],
    default: 'candidate',
    index: true
  },
  phone: {
    type: String,
    trim: true
  },
  location: {
    type: String,
    trim: true
  },
  title: {
    type: String,
    trim: true
  },
  profileImage: {
    type: String,
    default: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80'
  },
  profile: {
    bio: { type: String, default: '' },
    skills: [{ type: String, trim: true }],
    education: [{
      institution: String,
      degree: String,
      field: String,
      startYear: Number,
      endYear: Number
    }],
    experience: [{
      company: String,
      position: String,
      startDate: String,
      endDate: String,
      description: String
    }],
    projects: [{
      name: String,
      description: String,
      technologies: [String],
      url: String
    }],
    certifications: [{
      name: String,
      issuer: String,
      issueDate: String
    }]
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', UserSchema);
