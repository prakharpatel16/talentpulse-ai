const mongoose = require('mongoose');

const CompanySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  description: {
    type: String,
    default: ''
  },
  logo: {
    type: String,
    default: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80'
  },
  website: {
    type: String,
    trim: true
  },
  location: {
    type: String,
    default: 'San Francisco, CA'
  },
  industry: {
    type: String,
    default: 'Artificial Intelligence & SaaS'
  },
  companySize: {
    type: String,
    default: '50-200'
  },
  recruiterId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Company', CompanySchema);
