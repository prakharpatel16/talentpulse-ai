const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  sender: {
    type: String,
    enum: ['user', 'assistant'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  sources: [{
    type: { type: String }, // 'resume' | 'job' | 'candidate'
    sourceId: String,
    title: String,
    candidateId: String,
    candidateName: String,
    snippet: String,
    score: Number
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const ThreadSchema = new mongoose.Schema({
  recruiterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  requisitionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job'
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  summary: {
    type: String,
    default: ''
  },
  messages: [MessageSchema]
}, {
  timestamps: true
});

module.exports = mongoose.model('Thread', ThreadSchema);
