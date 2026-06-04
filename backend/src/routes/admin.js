const express = require('express');
const { protect, adminOnly } = require('../middleware/auth');
const Application = require('../models/Application');
const User = require('../models/User');
const emailService = require('../services/email');
const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');

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
