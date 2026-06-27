const mongoose = require('mongoose');

const FAQSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  answer: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    enum: ['eligibility', 'documents', 'process', 'deadlines', 'general'],
    default: 'general'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('FAQ', FAQSchema);
