const mongoose = require('mongoose');

const ExperimentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  hypothesis: {
    type: String,
    required: true,
  },
  methodology: {
    type: String,
    required: true,
  },
  expectedOutcome: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['Draft', 'Pending', 'Approved', 'Rejected', 'Revision Requested'],
    default: 'Pending',
  },
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  fileUrl: {
    type: String,
  },
  tags: [
    {
      type: String,
      trim: true,
    },
  ],
}, {
  timestamps: true,
});

module.exports = mongoose.model('Experiment', ExperimentSchema);
