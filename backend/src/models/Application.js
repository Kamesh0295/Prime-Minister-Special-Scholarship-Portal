const mongoose = require('mongoose');

const ApplicationSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    personalDetails: {
      fullName: { type: String, trim: true },
      dateOfBirth: { type: Date },
      gender: { type: String, enum: ['Male', 'Female', 'Other', ''] },
      religion: { type: String, trim: true },
      category: {
        type: String,
        enum: ['SC', 'ST', 'OBC', 'General', ''],
      },
      aadhaarNumber: { type: String, trim: true },
      phone: { type: String, trim: true },
      email: { type: String, trim: true },
      permanentAddress: { type: String, trim: true },
      state: { type: String, trim: true },
      district: { type: String, trim: true },
    },

    academicDetails: {
      institutionName: { type: String, trim: true },
      institutionAddress: { type: String, trim: true },
      courseName: { type: String, trim: true },
      yearOfStudy: { type: String, trim: true },
      rollNumber: { type: String, trim: true },
      previousYearMarks: { type: Number, min: 0, max: 100 },
      boardUniversityName: { type: String, trim: true },
    },

    bankDetails: {
      accountHolderName: { type: String, trim: true },
      bankName: { type: String, trim: true },
      branchName: { type: String, trim: true },
      accountNumber: { type: String, trim: true },
      ifscCode: { type: String, trim: true, uppercase: true },
    },

    documents: {
      aadhaar: { type: String },
      incomeCertificate: { type: String },
      casteCertificate: { type: String },
      marksheet: { type: String },
      bankPassbook: { type: String },
      bonafide: { type: String },
      photo: { type: String },
    },

    status: {
      type: String,
      enum: [
        'draft',
        'submitted',
        'institution_verified',
        'under_review',
        'approved',
        'rejected',
        'disbursed',
      ],
      default: 'draft',
    },

    reviewerRemarks: {
      type: String,
      default: '',
    },

    internalRemarks: {
      type: String,
      default: '',
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    institutionVerifier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    institutionRemarks: {
      type: String,
      default: '',
    },

    ocrData: {
      aadhaarNumber: { type: String },
      fullName: { type: String },
      dateOfBirth: { type: Date },
      income: { type: Number },
      previousYearMarks: { type: Number },
      bankAccountNumber: { type: String },
      bankIfscCode: { type: String },
    },

    fraudFlags: [
      {
        flagType: { type: String }, // 'duplicate_aadhaar', 'duplicate_bank', 'multiple_applications', 'suspicious_marks'
        description: { type: String },
        severity: { type: String, enum: ['low', 'medium', 'high'] },
        detectedAt: { type: Date, default: Date.now },
      }
    ],

    submittedAt: {
      type: Date,
    },

    statusHistory: [
      {
        status: { type: String },
        changedAt: { type: Date, default: Date.now },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        remark: { type: String },
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Application', ApplicationSchema);
