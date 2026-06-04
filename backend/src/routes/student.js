const express = require('express');
const { protect, studentOnly } = require('../middleware/auth');
const Application = require('../models/Application');
const User = require('../models/User');
const emailService = require('../services/email');

const router = express.Router();

// All routes require login + student role
router.use(protect, studentOnly);

// @route   GET /api/student/profile
router.get('/profile', async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-passwordHash');
    return res.json({ success: true, message: 'Profile fetched.', data: user });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error.', error: error.message });
  }
});

// @route   PUT /api/student/profile
router.put('/profile', async (req, res) => {
  try {
    const { fullName, phone, state, district, institution, course, yearOfStudy } = req.body;
    const updated = await User.findByIdAndUpdate(
      req.user._id,
      { fullName, phone, state, district, institution, course, yearOfStudy },
      { new: true, runValidators: true }
    ).select('-passwordHash');
    return res.json({ success: true, message: 'Profile updated.', data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error.', error: error.message });
  }
});

// @route   GET /api/student/application
router.get('/application', async (req, res) => {
  try {
    const application = await Application.findOne({ studentId: req.user._id });
    if (!application) {
      return res.json({ success: true, message: 'No application found.', data: null });
    }
    return res.json({ success: true, message: 'Application fetched.', data: application });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error.', error: error.message });
  }
});

const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');

// @route   POST /api/student/application
// @desc    Creates a new application (draft or submitted)
router.post('/application', async (req, res) => {
  try {
    const existing = await Application.findOne({ studentId: req.user._id });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'You already have an application. Use PUT to update it.',
      });
    }

    const { personalDetails, academicDetails, bankDetails, documents, ocrData, status } = req.body;
    const appStatus = status === 'submitted' ? 'submitted' : 'draft';

    const application = new Application({
      studentId: req.user._id,
      personalDetails,
      academicDetails,
      bankDetails,
      documents,
      ocrData,
      status: appStatus,
      submittedAt: appStatus === 'submitted' ? new Date() : undefined,
      statusHistory: [{ status: appStatus, changedAt: new Date(), remark: appStatus === 'submitted' ? 'Application submitted.' : 'Draft created.' }],
    });

    // Run Fraud Checks on Submission
    if (appStatus === 'submitted') {
      // 1. Check duplicate Aadhaar
      if (personalDetails.aadhaarNumber) {
        const dupAadhaar = await Application.findOne({
          studentId: { $ne: req.user._id },
          'personalDetails.aadhaarNumber': personalDetails.aadhaarNumber,
          status: { $ne: 'draft' },
        });
        if (dupAadhaar) {
          application.fraudFlags.push({
            flagType: 'duplicate_aadhaar',
            description: `Aadhaar number is already associated with another student's application.`,
            severity: 'high',
          });
        }
      }

      // 2. Check duplicate Bank Account
      if (bankDetails.accountNumber) {
        const dupBank = await Application.findOne({
          studentId: { $ne: req.user._id },
          'bankDetails.accountNumber': bankDetails.accountNumber,
          status: { $ne: 'draft' },
        });
        if (dupBank) {
          application.fraudFlags.push({
            flagType: 'duplicate_bank',
            description: `Bank account number is registered in another scholarship application.`,
            severity: 'high',
          });
        }
      }

      // 3. OCR Name/DOB mismatches
      if (ocrData) {
        if (ocrData.fullName && personalDetails.fullName && ocrData.fullName.trim().toUpperCase() !== personalDetails.fullName.trim().toUpperCase()) {
          application.fraudFlags.push({
            flagType: 'mismatch_name',
            description: `Name on uploaded Aadhaar (${ocrData.fullName}) does not match application name (${personalDetails.fullName}).`,
            severity: 'medium',
          });
        }
        if (ocrData.aadhaarNumber && personalDetails.aadhaarNumber && ocrData.aadhaarNumber.replace(/[^0-9]/g, '') !== personalDetails.aadhaarNumber.replace(/[^0-9]/g, '')) {
          application.fraudFlags.push({
            flagType: 'mismatch_aadhaar',
            description: `Aadhaar Number on document does not match form Aadhaar.`,
            severity: 'high',
          });
        }
      }

      // Send Email
      emailService.sendApplicationSubmitted(req.user, application._id).catch(console.error);

      // Create Notification
      await Notification.create({
        recipientId: req.user._id,
        title: 'Application Submitted',
        message: 'Your scholarship application has been successfully submitted and is pending Institution verification.',
        type: 'success',
      });
    }

    await application.save();

    // Create Audit Log
    await AuditLog.create({
      userId: req.user._id,
      action: appStatus === 'submitted' ? 'submit_application' : 'save_draft',
      ipAddress: req.ip,
      details: { applicationId: application._id, fraudFlagsCount: application.fraudFlags.length },
    });

    return res.status(201).json({
      success: true,
      message: appStatus === 'submitted' ? 'Application submitted successfully.' : 'Draft saved.',
      data: application,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error.', error: error.message });
  }
});

// @route   PUT /api/student/application/:id
// @desc    Updates an existing application
router.put('/application/:id', async (req, res) => {
  try {
    const application = await Application.findOne({ _id: req.params.id, studentId: req.user._id });
    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    // Only allow edit if draft or submitted
    if (!['draft', 'submitted'].includes(application.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot edit application in '${application.status}' status.`,
      });
    }

    const { personalDetails, academicDetails, bankDetails, documents, ocrData, status } = req.body;
    const newStatus = status === 'submitted' ? 'submitted' : application.status;
    const isFirstSubmit = application.status === 'draft' && newStatus === 'submitted';

    // Clear old flags if re-evaluating
    if (newStatus === 'submitted') {
      application.fraudFlags = [];
    }

    Object.assign(application, {
      personalDetails: { ...application.personalDetails, ...personalDetails },
      academicDetails: { ...application.academicDetails, ...academicDetails },
      bankDetails: { ...application.bankDetails, ...bankDetails },
      documents: { ...application.documents, ...documents },
      ocrData: ocrData ? { ...application.ocrData, ...ocrData } : application.ocrData,
      status: newStatus,
    });

    if (isFirstSubmit || newStatus === 'submitted') {
      application.submittedAt = new Date();
      application.statusHistory.push({ status: 'submitted', changedAt: new Date(), remark: 'Application submitted.' });

      // Run Fraud Checks
      const pDetails = application.personalDetails;
      const bDetails = application.bankDetails;
      const oData = application.ocrData;

      if (pDetails.aadhaarNumber) {
        const dupAadhaar = await Application.findOne({
          studentId: { $ne: req.user._id },
          'personalDetails.aadhaarNumber': pDetails.aadhaarNumber,
          status: { $ne: 'draft' },
        });
        if (dupAadhaar) {
          application.fraudFlags.push({
            flagType: 'duplicate_aadhaar',
            description: `Aadhaar number is already associated with another student's application.`,
            severity: 'high',
          });
        }
      }

      if (bDetails.accountNumber) {
        const dupBank = await Application.findOne({
          studentId: { $ne: req.user._id },
          'bankDetails.accountNumber': bDetails.accountNumber,
          status: { $ne: 'draft' },
        });
        if (dupBank) {
          application.fraudFlags.push({
            flagType: 'duplicate_bank',
            description: `Bank account number is registered in another scholarship application.`,
            severity: 'high',
          });
        }
      }

      if (oData) {
        if (oData.fullName && pDetails.fullName && oData.fullName.trim().toUpperCase() !== pDetails.fullName.trim().toUpperCase()) {
          application.fraudFlags.push({
            flagType: 'mismatch_name',
            description: `Name on uploaded Aadhaar (${oData.fullName}) does not match application name (${pDetails.fullName}).`,
            severity: 'medium',
          });
        }
        if (oData.aadhaarNumber && pDetails.aadhaarNumber && oData.aadhaarNumber.replace(/[^0-9]/g, '') !== pDetails.aadhaarNumber.replace(/[^0-9]/g, '')) {
          application.fraudFlags.push({
            flagType: 'mismatch_aadhaar',
            description: `Aadhaar Number on document does not match form Aadhaar.`,
            severity: 'high',
          });
        }
      }

      emailService.sendApplicationSubmitted(req.user, application._id).catch(console.error);

      // Create Notification
      await Notification.create({
        recipientId: req.user._id,
        title: 'Application Submitted',
        message: 'Your scholarship application has been successfully submitted and is pending Institution verification.',
        type: 'success',
      });
    }

    await application.save();

    // Create Audit Log
    await AuditLog.create({
      userId: req.user._id,
      action: isFirstSubmit ? 'submit_application' : 'update_application',
      ipAddress: req.ip,
      details: { applicationId: application._id, status: application.status, fraudFlagsCount: application.fraudFlags.length },
    });

    return res.json({
      success: true,
      message: newStatus === 'submitted' ? 'Application submitted.' : 'Application updated.',
      data: application,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error.', error: error.message });
  }
});

// @route   GET /api/student/application/status
router.get('/application/status', async (req, res) => {
  try {
    const application = await Application.findOne({ studentId: req.user._id })
      .select('status reviewerRemarks statusHistory submittedAt updatedAt');
    if (!application) {
      return res.json({ success: true, message: 'No application found.', data: null });
    }
    return res.json({ success: true, message: 'Status fetched.', data: application });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error.', error: error.message });
  }
});

// @route   GET /api/student/application/letter
// Download approval letter PDF
router.get('/application/letter', async (req, res) => {
  try {
    const application = await Application.findOne({
      studentId: req.user._id,
      status: 'approved',
    });
    if (!application) {
      return res.status(404).json({ success: false, message: 'No approved application found.' });
    }
    const { generateApprovalLetter } = require('../services/pdf');
    generateApprovalLetter(res, application, req.user);
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error.', error: error.message });
  }
});

module.exports = router;
