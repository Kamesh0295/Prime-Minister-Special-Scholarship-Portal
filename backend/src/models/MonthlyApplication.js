const mongoose = require('mongoose');

const MonthlyApplicationSchema = new mongoose.Schema({
  month: {
    type: String, // 'YYYY-MM' format, e.g. '2026-06'
    required: true,
    unique: true
  },
  count: {
    type: Number,
    default: 0
  },
  submitted: {
    type: Number,
    default: 0
  },
  approved: {
    type: Number,
    default: 0
  },
  rejected: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('MonthlyApplication', MonthlyApplicationSchema);
