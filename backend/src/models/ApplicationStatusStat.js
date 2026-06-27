const mongoose = require('mongoose');

const ApplicationStatusStatSchema = new mongoose.Schema({
  status: {
    type: String, // e.g. 'submitted', 'approved', 'rejected', 'under_review', 'disbursed', 'draft'
    required: true,
    unique: true
  },
  count: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('ApplicationStatusStat', ApplicationStatusStatSchema);
