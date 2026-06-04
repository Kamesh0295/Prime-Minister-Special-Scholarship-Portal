const express = require('express');
const Application = require('../models/Application');
const User = require('../models/User');

const router = express.Router();

// @route   GET /api/public/transparency
// @desc    Get aggregated statistical metrics for the public portal
router.get('/transparency', async (req, res) => {
  try {
    const totalStudents = await User.countDocuments({ role: 'student' });
    const totalApplications = await Application.countDocuments({ status: { $ne: 'draft' } });
    const totalApproved = await Application.countDocuments({ status: 'approved' });
    const totalDisbursed = await Application.countDocuments({ status: 'disbursed' });

    // Aggregate by State
    const stateStats = await Application.aggregate([
      { $match: { status: { $in: ['approved', 'disbursed'] } } },
      { $group: { _id: '$personalDetails.state', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Aggregate by Category
    const categoryStats = await Application.aggregate([
      { $match: { status: { $in: ['approved', 'disbursed'] } } },
      { $group: { _id: '$personalDetails.category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Aggregate by Gender
    const genderStats = await Application.aggregate([
      { $match: { status: { $in: ['approved', 'disbursed'] } } },
      { $group: { _id: '$personalDetails.gender', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    return res.json({
      success: true,
      data: {
        totals: {
          registeredStudents: totalStudents,
          submittedApplications: totalApplications,
          approvedScholarships: totalApproved,
          disbursedScholarships: totalDisbursed,
        },
        stateWise: stateStats.map((item) => ({ state: item._id || 'Unknown', count: item.count })),
        categoryWise: categoryStats.map((item) => ({ category: item._id || 'General', count: item.count })),
        genderWise: genderStats.map((item) => ({ gender: item._id || 'Unspecified', count: item.count })),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error.', error: error.message });
  }
});

// @route   GET /api/public/verify/:id
// @desc    Verify the authenticity of an approved scholarship letter (QR Code verification target)
router.get('/verify/:id', async (req, res) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate('studentId', 'fullName email phone state district')
      .select('studentId academicDetails personalDetails status statusHistory createdAt updatedAt');

    if (!application) {
      return res.status(404).json({
        success: false,
        verified: false,
        message: 'Invalid Verification Link. No scholarship records found matching this Reference ID.',
      });
    }

    const isApproved = ['approved', 'disbursed'].includes(application.status);

    return res.json({
      success: true,
      verified: isApproved,
      message: isApproved
        ? 'Verification Successful. This is a certified and approved PMSS Scholarship award.'
        : `Application found but it is currently in status: ${application.status.replace(/_/g, ' ').toUpperCase()}`,
      data: {
        refNumber: `PMSS/${application.createdAt.getFullYear()}/${application._id.toString().slice(-6).toUpperCase()}`,
        studentName: application.personalDetails?.fullName || application.studentId?.fullName,
        institution: application.academicDetails?.institutionName || 'N/A',
        course: application.academicDetails?.courseName || 'N/A',
        yearOfStudy: application.academicDetails?.yearOfStudy || 'N/A',
        status: application.status,
        dateSubmitted: application.submittedAt || application.createdAt,
        verifiedAt: application.updatedAt,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      verified: false,
      message: 'Verification process failed due to server error.',
      error: error.message,
    });
  }
});

module.exports = router;
