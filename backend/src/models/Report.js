const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
  experimentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Experiment',
    required: true,
  },
  generatedAt: {
    type: Date,
    default: Date.now,
  },
  fileUrl: {
    type: String,
    required: true,
  },
  format: {
    type: String,
    enum: ['pdf', 'csv'],
    required: true,
  },
});

module.exports = mongoose.model('Report', ReportSchema);
