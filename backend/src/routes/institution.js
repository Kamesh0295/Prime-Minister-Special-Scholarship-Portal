const express = require('express');
const { protect, institutionOfficerOnly } = require('../middleware/auth');
const Application = require('../models/Application');
const User = require('../models/User');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');

const router = express.Router();

router.use(protect, institutionOfficerOnly);

// @route   GET /api/institution/applications
// @desc    Get all student applications for this officer's institution
router.get('/applications', async (req, res) => {
  try {
    const search = req.query.search || '';

    // 1. Find all students belonging to this officer's institution
    const query = {
      institution: req.user.institution,
      role: 'student',
    };

    if (search) {
      query.fullName = { $regex: search, $options: 'i' };
    }

    const students = await User.find(query).select('_id');
    const studentIds = students.map((s) => s._id);

    // 2. Fetch applications for these students (only those submitted or beyond draft)
    const applications = await Application.find({
      studentId: { $in: studentIds },
      status: { $ne: 'draft' },
    })
      .populate('studentId', 'fullName email phone rollNumber course yearOfStudy')
      .sort({ updatedAt: -1 });

    return res.json({
      success: true,
      message: `Applications for ${req.user.institution} fetched.`,
      data: applications,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error.', error: error.message });
  }
});

// @route   PATCH /api/institution/applications/:id/verify
// @desc    Verify student enrollment and bonafide certificate
router.patch('/applications/:id/verify', async (req, res) => {
  try {
    const { remarks } = req.body;

    const application = await Application.findById(req.params.id).populate('studentId');
    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    // Verify student belongs to officer's college
    if (application.studentId.institution !== req.user.institution) {
      return res.status(403).json({ success: false, message: 'Access denied. Student belongs to another college.' });
    }

    application.status = 'institution_verified';
    application.institutionRemarks = remarks || 'Verified by college officer.';
    application.institutionVerifier = req.user._id;
    application.statusHistory.push({
      status: 'institution_verified',
      changedAt: new Date(),
      changedBy: req.user._id,
      remark: remarks || 'Verified by college officer.',
    });

    await application.save();

    // Create Audit Log
    await AuditLog.create({
      userId: req.user._id,
      action: 'institution_verify',
      ipAddress: req.ip,
      details: { applicationId: application._id, studentName: application.studentId.fullName },
    });

    // Create Notification for Student
    await Notification.create({
      recipientId: application.studentId._id,
      title: 'Institution Verification Approved',
      message: `Your application has been verified by ${req.user.institution}. It is now submitted to the Central Administration for final review.`,
      type: 'success',
    });

    return res.json({
      success: true,
      message: 'Application verified and forwarded to admin.',
      data: application,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error.', error: error.message });
  }
});

// @route   PATCH /api/institution/applications/:id/reject
// @desc    Reject or request revision from the student
router.patch('/applications/:id/reject', async (req, res) => {
  try {
    const { remarks } = req.body;

    if (!remarks) {
      return res.status(400).json({ success: false, message: 'Remarks are required to request revision.' });
    }

    const application = await Application.findById(req.params.id).populate('studentId');
    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    // Verify student belongs to officer's college
    if (application.studentId.institution !== req.user.institution) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    // Revert status to draft so student can edit
    application.status = 'draft';
    application.institutionRemarks = remarks;
    application.institutionVerifier = req.user._id;
    application.statusHistory.push({
      status: 'draft',
      changedAt: new Date(),
      changedBy: req.user._id,
      remark: `Revision Requested by Institution: ${remarks}`,
    });

    await application.save();

    // Create Audit Log
    await AuditLog.create({
      userId: req.user._id,
      action: 'institution_reject',
      ipAddress: req.ip,
      details: { applicationId: application._id, studentName: application.studentId.fullName, remarks },
    });

    // Create Notification for Student
    await Notification.create({
      recipientId: application.studentId._id,
      title: 'Revision Required by College',
      message: `Your college has requested a revision on your application. Reason: ${remarks}. Please edit your application and resubmit.`,
      type: 'warning',
    });

    return res.json({
      success: true,
      message: 'Application sent back to student for revision.',
      data: application,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error.', error: error.message });
  }
});

module.exports = router;
