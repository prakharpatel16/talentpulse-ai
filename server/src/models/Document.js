const mongoose = require('mongoose');

const DocumentSchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  sourceType: {
    type: String,
    enum: ['resume', 'job', 'candidate', 'application'],
    required: true,
    index: true
  },
  sourceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    index: true
  },
  title: {
    type: String,
    default: ''
  },
  content: {
    type: String,
    required: true
  },
  embedding: {
    type: [Number],
    default: []
  },
  metadata: {
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    candidateName: String,
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job' },
    jobTitle: String,
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' },
    recruiterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    documentType: String,
    chunkIndex: { type: Number, default: 0 }
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Document', DocumentSchema);
