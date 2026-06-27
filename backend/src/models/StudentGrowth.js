const mongoose = require('mongoose');

const StudentGrowthSchema = new mongoose.Schema({
  date: {
    type: String, // 'YYYY-MM-DD' format, e.g. '2026-06-24'
    required: true,
    unique: true
  },
  count: {
    type: Number, // Cumulative total of students up to this date
    default: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('StudentGrowth', StudentGrowthSchema);
