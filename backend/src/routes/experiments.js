const express = require('express');
const Experiment = require('../models/Experiment');
const User = require('../models/User');
const { authenticateJWT, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { sendEmailAlert } = require('../services/email');

const router = express.Router();

// Helper to check if string tags should be converted to array
const parseTags = (tags) => {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags;
  try {
    const parsed = JSON.parse(tags);
    if (Array.isArray(parsed)) return parsed;
  } catch (e) {
    // Treat as comma separated string
  }
  return tags.split(',').map((t) => t.trim()).filter(Boolean);
};

// @route   GET /api/experiments
// @desc    Get experiments (role-restricted)
// @access  Private
router.get('/', authenticateJWT, async (req, res) => {
  try {
    let query = {};

    if (req.user.role === 'viewer') {
      query = { status: 'Approved' };
    } else if (req.user.role === 'researcher') {
      query = {
        $or: [
          { status: 'Approved' },
          { submittedBy: req.user._id }
        ]
      };
    } // Admin gets all (query is empty)

    const experiments = await Experiment.find(query)
      .populate('submittedBy', 'name email institution')
      .populate('reviewedBy', 'name email')
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      message: 'Experiments retrieved successfully',
      data: experiments,
    });
  } catch (error) {
    console.error('Fetch experiments error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching experiments',
      error: error.message,
    });
  }
});

// @route   POST /api/experiments
// @desc    Submit or Draft a new experiment
// @access  Private (Researcher only)
router.post('/', authenticateJWT, requireRole(['researcher']), (req, res) => {
  upload.single('file')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: 'File upload failed',
        error: err.message,
      });
    }

    try {
      const { title, hypothesis, methodology, expectedOutcome, tags, status } = req.body;

      if (!title || !hypothesis || !methodology || !expectedOutcome) {
        return res.status(400).json({
          success: false,
          message: 'Please fill in all required fields (title, hypothesis, methodology, expectedOutcome)',
        });
      }

      const experimentStatus = status === 'Draft' ? 'Draft' : 'Pending';

      // File path if uploaded
      let fileUrl = '';
      if (req.file) {
        // Store relative path so front-end can display or fetch it
        fileUrl = `/uploads/${req.file.filename}`;
      }

      const experiment = await Experiment.create({
        title,
        hypothesis,
        methodology,
        expectedOutcome,
        status: experimentStatus,
        submittedBy: req.user._id,
        tags: parseTags(tags),
        fileUrl,
      });

      return res.status(201).json({
        success: true,
        message: experimentStatus === 'Draft' ? 'Experiment saved as Draft' : 'Experiment submitted for review',
        data: experiment,
      });
    } catch (error) {
      console.error('Create experiment error:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Server error while creating experiment',
        error: error.message,
      });
    }
  });
});

// @route   GET /api/experiments/:id
// @desc    Get details of an experiment
// @access  Private
router.get('/:id', authenticateJWT, async (req, res) => {
  try {
    const experiment = await Experiment.findById(req.id || req.params.id)
      .populate('submittedBy', 'name email institution')
      .populate('reviewedBy', 'name email');

    if (!experiment) {
      return res.status(404).json({
        success: false,
        message: 'Experiment not found',
      });
    }

    // Role-based validation
    if (req.user.role === 'viewer' && experiment.status !== 'Approved') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Experiment is not approved yet',
      });
    }

    if (
      req.user.role === 'researcher' &&
      experiment.status !== 'Approved' &&
      experiment.submittedBy._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You are not authorized to view this experiment',
      });
    }

    return res.json({
      success: true,
      message: 'Experiment retrieved successfully',
      data: experiment,
    });
  } catch (error) {
    console.error('Fetch experiment by ID error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching experiment details',
      error: error.message,
    });
  }
});

// @route   PATCH /api/experiments/:id
// @desc    Update experiment (researcher edits draft/revision, admin approves/rejects)
// @access  Private
router.patch('/:id', authenticateJWT, (req, res) => {
  upload.single('file')(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: 'File upload failed',
        error: err.message,
      });
    }

    try {
      const experimentId = req.params.id;
      const experiment = await Experiment.findById(experimentId).populate('submittedBy', 'name email');

      if (!experiment) {
        return res.status(404).json({
          success: false,
          message: 'Experiment not found',
        });
      }

      // CASE 1: USER IS ADMIN (Approving / Rejecting / Revision Requests)
      if (req.user.role === 'admin') {
        const { status } = req.body;
        if (!status || !['Approved', 'Rejected', 'Revision Requested'].includes(status)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid status update by admin. Must be Approved, Rejected, or Revision Requested.',
          });
        }

        experiment.status = status;
        experiment.reviewedBy = req.user._id;
        await experiment.save();

        // Send Email Alert to Researcher
        const researcherEmail = experiment.submittedBy.email;
        const researcherName = experiment.submittedBy.name;
        const subject = `Experiment Review Update: ${experiment.title}`;
        const text = `Hello ${researcherName},\n\nYour experiment proposal titled "${experiment.title}" has been reviewed by the administrator.\nStatus: ${status}.\n\nBest regards,\nAnti-Gravity Research Team`;
        const html = `<p>Hello <strong>${researcherName}</strong>,</p>
                      <p>Your experiment proposal titled "<em>${experiment.title}</em>" has been reviewed by the administrator.</p>
                      <p><strong>Status:</strong> <span style="font-size: 1.1em; color: ${status === 'Approved' ? '#10B981' : '#EF4444'};">${status}</span></p>
                      <br/>
                      <p>Best regards,<br/>Anti-Gravity Research Team</p>`;

        await sendEmailAlert(researcherEmail, subject, text, html);

        return res.json({
          success: true,
          message: `Experiment status updated to ${status} and researcher notified.`,
          data: experiment,
        });
      }

      // CASE 2: USER IS RESEARCHER (Editing draft or revision requested)
      if (req.user.role === 'researcher') {
        if (experiment.submittedBy._id.toString() !== req.user._id.toString()) {
          return res.status(403).json({
            success: false,
            message: 'Not authorized to edit this experiment',
          });
        }

        if (experiment.status !== 'Draft' && experiment.status !== 'Revision Requested') {
          return res.status(400).json({
            success: false,
            message: 'You can only edit experiments that are Drafts or require Revision.',
          });
        }

        const { title, hypothesis, methodology, expectedOutcome, tags, status } = req.body;

        if (title) experiment.title = title;
        if (hypothesis) experiment.hypothesis = hypothesis;
        if (methodology) experiment.methodology = methodology;
        if (expectedOutcome) experiment.expectedOutcome = expectedOutcome;
        if (tags) experiment.tags = parseTags(tags);

        // If file uploaded, update fileUrl
        if (req.file) {
          experiment.fileUrl = `/uploads/${req.file.filename}`;
        }

        // Change status if submitting
        if (status === 'Pending') {
          experiment.status = 'Pending';
        } else if (status === 'Draft') {
          experiment.status = 'Draft';
        }

        await experiment.save();

        return res.json({
          success: true,
          message: experiment.status === 'Pending' ? 'Experiment submitted for review' : 'Draft updated successfully',
          data: experiment,
        });
      }

      return res.status(403).json({
        success: false,
        message: 'Role not permitted to perform this action',
      });
    } catch (error) {
      console.error('Update experiment error:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Server error during experiment update',
        error: error.message,
      });
    }
  });
});

// @route   DELETE /api/experiments/:id
// @desc    Delete an experiment (draft for researchers, or any for admins)
// @access  Private
router.delete('/:id', authenticateJWT, async (req, res) => {
  try {
    const experiment = await Experiment.findById(req.params.id);

    if (!experiment) {
      return res.status(404).json({
        success: false,
        message: 'Experiment not found',
      });
    }

    // Authorization
    if (req.user.role === 'admin') {
      await Experiment.findByIdAndDelete(req.params.id);
      return res.json({
        success: true,
        message: 'Experiment deleted by Admin',
      });
    }

    if (req.user.role === 'researcher') {
      if (experiment.submittedBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to delete this experiment',
        });
      }

      if (experiment.status !== 'Draft') {
        return res.status(400).json({
          success: false,
          message: 'Can only delete experiments that are in Draft state',
        });
      }

      await Experiment.findByIdAndDelete(req.params.id);
      return res.json({
        success: true,
        message: 'Draft experiment deleted successfully',
      });
    }

    return res.status(403).json({
      success: false,
      message: 'Unauthorized operation',
    });
  } catch (error) {
    console.error('Delete experiment error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error during experiment deletion',
      error: error.message,
    });
  }
});

module.exports = router;
