const express = require('express');
const { protect, adminOnly } = require('../middleware/auth');
const Application = require('../models/Application');
const User = require('../models/User');
const emailService = require('../services/email');
const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');
const { syncAnalyticsDb } = require('../utils/syncHelper');

const router = express.Router();

// All routes require admin
router.use(protect, adminOnly);

// @route   GET /api/admin/applications
// Search, filter, paginate
router.get('/applications', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      status,
      state,
      category,
      dateFrom,
      dateTo,
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build match for user search
    let studentIds;
    if (search) {
      const users = await User.find({
        $or: [
          { fullName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { institution: { $regex: search, $options: 'i' } },
        ],
      }).select('_id');
      studentIds = users.map((u) => u._id);
    }

    const filter = {};
    if (studentIds) filter.studentId = { $in: studentIds };
    if (status) filter.status = status;
    if (state) filter['personalDetails.state'] = { $regex: state, $options: 'i' };
    if (category) filter['personalDetails.category'] = category;
    if (dateFrom || dateTo) {
      filter.submittedAt = {};
      if (dateFrom) filter.submittedAt.$gte = new Date(dateFrom);
      if (dateTo) filter.submittedAt.$lte = new Date(dateTo);
    }

    const total = await Application.countDocuments(filter);
    const applications = await Application.find(filter)
      .populate('studentId', 'fullName email phone institution')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .select('studentId personalDetails.category personalDetails.state academicDetails.courseName academicDetails.institutionName status fraudFlags submittedAt createdAt');

    return res.json({
      success: true,
      message: 'Applications fetched.',
      data: {
        applications,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error.', error: error.message });
  }
});

// @route   GET /api/admin/applications/:id
router.get('/applications/:id', async (req, res) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate('studentId', '-passwordHash')
      .populate('reviewedBy', 'fullName email');

    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    return res.json({ success: true, message: 'Application fetched.', data: application });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error.', error: error.message });
  }
});

// @route   PATCH /api/admin/applications/:id/status
router.patch('/applications/:id/status', async (req, res) => {
  try {
    const { status, remarks, internalRemarks } = req.body;

    const validStatuses = ['submitted', 'institution_verified', 'under_review', 'approved', 'rejected', 'disbursed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value.' });
    }

    const application = await Application.findById(req.params.id).populate(
      'studentId',
      'fullName email phone'
    );

    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    const prevStatus = application.status;
    application.status = status;
    application.reviewerRemarks = remarks || application.reviewerRemarks;
    if (internalRemarks) application.internalRemarks = internalRemarks;
    application.reviewedBy = req.user._id;
    application.statusHistory.push({
      status,
      changedAt: new Date(),
      changedBy: req.user._id,
      remark: remarks || `Status updated to ${status.replace(/_/g, ' ')}`,
    });

    await application.save();

    syncAnalyticsDb().catch(err => console.error('Failed to sync analytics:', err.message));

    // Audit Log
    await AuditLog.create({
      userId: req.user._id,
      action: `admin_change_status_${status}`,
      ipAddress: req.ip,
      details: { applicationId: application._id, studentName: application.studentId.fullName, prevStatus, remarks },
    });

    // Create Notification
    const friendlyStatusNames = {
      submitted: 'Submitted',
      institution_verified: 'Verified by Institution',
      under_review: 'Under Review',
      approved: 'Approved',
      rejected: 'Rejected',
      disbursed: 'Scholarship Disbursed',
    };
    
    await Notification.create({
      recipientId: application.studentId._id,
      title: `Application Status: ${friendlyStatusNames[status]}`,
      message: remarks || `Your application status has been updated to ${friendlyStatusNames[status]}.`,
      type: status === 'approved' || status === 'disbursed' ? 'success' : status === 'rejected' ? 'error' : 'info',
    });

    // Send email notifications
    const student = application.studentId;
    if (prevStatus !== status) {
      if (status === 'under_review') {
        emailService.sendUnderReview(student).catch(console.error);
      } else if (status === 'approved') {
        emailService.sendApproved(student).catch(console.error);
      } else if (status === 'rejected') {
        emailService.sendRejected(student, remarks).catch(console.error);
      } else if (status === 'submitted' && prevStatus !== 'submitted') {
        emailService.sendRevisionRequested(student, remarks).catch(console.error);
      }
    }

    return res.json({ success: true, message: `Application status updated to '${status}'.`, data: application });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error.', error: error.message });
  }
});

// @route   PATCH /api/admin/applications/:id/documents/:docField
// Approve, reject, and comment on individual documents
router.patch('/applications/:id/documents/:docField', async (req, res) => {
  try {
    const { status, remarks } = req.body;
    const { id, docField } = req.params;

    if (!['pending', 'verified', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid document verification status.' });
    }

    const application = await Application.findById(id).populate('studentId', 'fullName email phone');
    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    // Update status and remarks in Map
    application.documentStatuses.set(docField, { status, remarks: remarks || '' });
    application.markModified('documentStatuses');
    await application.save();

    // Sync to corresponding StudentProfile if it exists
    const StudentProfile = require('../models/StudentProfile');
    const profile = await StudentProfile.findOne({ studentId: application.studentId._id });
    if (profile) {
      profile.documentStatuses.set(docField, { status, remarks: remarks || '' });
      profile.markModified('documentStatuses');
      await profile.save();
    }

    // Create Notification for Student
    const friendlyDocNames = {
      aadhaar: 'Aadhaar Card',
      incomeCertificate: 'Income Certificate',
      casteCertificate: 'Caste Certificate',
      marksheet: 'Class 12 / Qualifying Marksheet',
      bankPassbook: 'Bank Passbook / cancelled cheque',
      bonafide: 'Bonafide College Certificate',
      photo: 'Passport Size Photo',
    };
    const docName = friendlyDocNames[docField] || docField;
    const statusLabel = status.toUpperCase();

    await Notification.create({
      recipientId: application.studentId._id,
      title: `Document Verification: ${docName}`,
      message: `Your document '${docName}' status is now: ${statusLabel}.${remarks ? ` Remarks: ${remarks}` : ''}`,
      type: status === 'verified' ? 'success' : status === 'rejected' ? 'error' : 'info',
    });

    // Create Audit Log
    await AuditLog.create({
      userId: req.user._id,
      action: `admin_verify_document_${docField}_${status}`,
      ipAddress: req.ip,
      details: { applicationId: application._id, studentId: application.studentId._id, docField, status, remarks },
    });

    return res.json({
      success: true,
      message: `Document '${docName}' verification updated to '${status}'.`,
      data: application,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error.', error: error.message });
  }
});

// @route   GET /api/admin/users
router.get('/users', async (req, res) => {
  try {
    const { search = '', page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    const filter = { role: 'student' };
    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    return res.json({
      success: true,
      message: 'Users fetched.',
      data: {
        users,
        pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error.', error: error.message });
  }
});

// @route   PATCH /api/admin/users/:id
router.patch('/users/:id', async (req, res) => {
  try {
    const { isActive } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true }
    ).select('-passwordHash');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    // Audit Log
    await AuditLog.create({
      userId: req.user._id,
      action: isActive ? 'admin_activate_user' : 'admin_deactivate_user',
      ipAddress: req.ip,
      details: { targetUserId: user._id, targetUserName: user.fullName },
    });

    return res.json({
      success: true,
      message: `Account ${isActive ? 'activated' : 'deactivated'}.`,
      data: user,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error.', error: error.message });
  }
});

// @route   GET /api/admin/stats
router.get('/stats', async (req, res) => {
  try {
    const [total, pending, underReview, institutionVerified, approved, rejected, disbursed, totalStudents] =
      await Promise.all([
        Application.countDocuments(),
        Application.countDocuments({ status: 'submitted' }),
        Application.countDocuments({ status: 'under_review' }),
        Application.countDocuments({ status: 'institution_verified' }),
        Application.countDocuments({ status: 'approved' }),
        Application.countDocuments({ status: 'rejected' }),
        Application.countDocuments({ status: 'disbursed' }),
        User.countDocuments({ role: 'student' }),
      ]);

    return res.json({
      success: true,
      message: 'Stats fetched.',
      data: { total, pending, underReview, institutionVerified, approved, rejected, disbursed, totalStudents },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error.', error: error.message });
  }
});

// @route   GET /api/admin/reports
router.get('/reports', async (req, res) => {
  try {
    const format = req.query.format; // 'json' | 'csv'

    // Approvals by state
    const byState = await Application.aggregate([
      { $match: { status: { $in: ['approved', 'disbursed'] } } },
      { $group: { _id: '$personalDetails.state', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Approvals by category
    const byCategory = await Application.aggregate([
      { $match: { status: { $in: ['approved', 'disbursed'] } } },
      { $group: { _id: '$personalDetails.category', count: { $sum: 1 } } },
    ]);

    // Monthly applications (last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
    const monthly = await Application.aggregate([
      { $match: { createdAt: { $gte: twelveMonthsAgo } } },
      {
        $group: {
          _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          total: { $sum: 1 },
          approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
          rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    if (format === 'csv') {
      const { stringify } = require('csv-stringify/sync');
      const rows = [
        ['Type', 'Label', 'Count'],
        ...byState.map((r) => ['By State', r._id || 'Unknown', r.count]),
        ...byCategory.map((r) => ['By Category', r._id || 'Unknown', r.count]),
        ...monthly.map((r) => [
          'Monthly',
          `${r._id.year}-${String(r._id.month).padStart(2, '0')}`,
          r.total,
        ]),
      ];
      const csv = stringify(rows);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="pmss_report.csv"');
      return res.send(csv);
    }

    return res.json({
      success: true,
      message: 'Reports fetched.',
      data: { byState, byCategory, monthly },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error.', error: error.message });
  }
});

// @route   GET /api/admin/applications/:id/letter
// Generate PDF letter for approved application
router.get('/applications/:id/letter', async (req, res) => {
  try {
    const application = await Application.findOne({
      _id: req.params.id,
      status: { $in: ['approved', 'disbursed'] },
    }).populate('studentId', '-passwordHash');

    if (!application) {
      return res.status(404).json({ success: false, message: 'Approved or disbursed application not found.' });
    }

    const { generateApprovalLetter } = require('../services/pdf');
    generateApprovalLetter(res, application, application.studentId);
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error.', error: error.message });
  }
});

const StudentProfile = require('../models/StudentProfile');

// @route   GET /api/admin/profiles
router.get('/profiles', async (req, res) => {
  try {
    const { search = '', verificationStatus, deleteRequested, page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Search match
    let studentIds;
    if (search) {
      const users = await User.find({
        $or: [
          { fullName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ]
      }).select('_id');
      studentIds = users.map(u => u._id);
    }

    const filter = {};
    if (studentIds) filter.studentId = { $in: studentIds };
    if (verificationStatus) filter.verificationStatus = verificationStatus;
    if (deleteRequested !== undefined) filter.deleteRequested = deleteRequested === 'true';

    const total = await StudentProfile.countDocuments(filter);
    const profiles = await StudentProfile.find(filter)
      .populate('studentId', 'fullName email phone institution')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limitNum);

    return res.json({
      success: true,
      message: 'Student profiles fetched.',
      data: {
        profiles,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        }
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error.', error: error.message });
  }
});

// @route   GET /api/admin/profiles/:id
router.get('/profiles/:id', async (req, res) => {
  try {
    const profile = await StudentProfile.findById(req.params.id)
      .populate('studentId', '-passwordHash');
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Student profile not found.' });
    }
    return res.json({ success: true, message: 'Student profile fetched.', data: profile });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error.', error: error.message });
  }
});

// @route   PATCH /api/admin/profiles/:id/verify
router.patch('/profiles/:id/verify', async (req, res) => {
  try {
    const { status, remarks } = req.body;
    if (!['verified', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid verification status.' });
    }
    const profile = await StudentProfile.findById(req.params.id);
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Student profile not found.' });
    }
    profile.verificationStatus = status;
    profile.verificationRemarks = remarks || '';
    profile.verifiedBy = req.user._id;
    profile.verifiedAt = new Date();
    await profile.save();

    // Audit log
    await AuditLog.create({
      userId: req.user._id,
      action: `admin_verify_profile_${status}`,
      ipAddress: req.ip,
      details: { profileId: profile._id, studentId: profile.studentId, remarks },
    });

    // Create Notification
    await Notification.create({
      recipientId: profile.studentId,
      title: `Profile Verification: ${status === 'verified' ? 'Approved' : 'Rejected'}`,
      message: remarks || `Your profile verification has been updated to ${status}.`,
      type: status === 'verified' ? 'success' : 'error',
    });

    return res.json({ success: true, message: `Profile verification updated to '${status}'.`, data: profile });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error.', error: error.message });
  }
});

// @route   DELETE /api/admin/profiles/:id
router.delete('/profiles/:id', async (req, res) => {
  try {
    const profile = await StudentProfile.findById(req.params.id);
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Student profile not found.' });
    }
    const studentId = profile.studentId;
    await StudentProfile.findByIdAndDelete(req.params.id);

    // Audit log
    await AuditLog.create({
      userId: req.user._id,
      action: 'admin_delete_profile',
      ipAddress: req.ip,
      details: { profileId: req.params.id, studentId },
    });

    // Create Notification
    await Notification.create({
      recipientId: studentId,
      title: 'Profile Deleted',
      message: 'Your student profile has been deleted by the administrator as requested.',
      type: 'info',
    });

    return res.json({ success: true, message: 'Student profile deleted successfully.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error.', error: error.message });
  }
});

// @route   GET /api/admin/logs
// Retrieve recent audit logs for the audit trail panel
router.get('/logs', async (req, res) => {
  try {
    const logs = await AuditLog.find()
      .populate('userId', 'fullName role email')
      .sort({ createdAt: -1 })
      .limit(10);
    return res.json({ success: true, data: logs });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error.', error: error.message });
  }
});

module.exports = router;
