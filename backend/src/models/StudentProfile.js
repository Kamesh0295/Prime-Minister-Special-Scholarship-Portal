const mongoose = require('mongoose');

const StudentProfileSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    fullName: { type: String, trim: true },
    dob: { type: Date },
    gender: { type: String, enum: ['Male', 'Female', 'Other', ''] },
    category: { type: String, enum: ['SC', 'ST', 'OBC', 'General', ''], default: '' },
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    aadhaar: { type: String, trim: true }, // Not forced unique at mongoose level to allow empty drafts, but will check uniqueness programmatically
    bloodGroup: { type: String, trim: true },
    nationality: { type: String, trim: true, default: 'Indian' },

    address: {
      permanentAddress: { type: String, trim: true },
      currentAddress: { type: String, trim: true },
      state: { type: String, trim: true },
      district: { type: String, trim: true },
      pincode: { type: String, trim: true },
    },

    collegeName: { type: String, trim: true },
    universityName: { type: String, trim: true },
    degree: { type: String, trim: true },
    department: { type: String, trim: true },
    yearOfStudy: { type: String, trim: true },
    rollNumber: { type: String, trim: true },
    academicYear: { type: String, trim: true },
    cgpa: { type: Number, min: 0, max: 100 },

    fatherName: { type: String, trim: true },
    motherName: { type: String, trim: true },
    parentOccupation: { type: String, trim: true },
    familyIncome: { type: Number, min: 0 },

    bankName: { type: String, trim: true },
    accountHolderName: { type: String, trim: true },
    accountNumber: { type: String, trim: true },
    ifscCode: { type: String, uppercase: true, trim: true },
    branchName: { type: String, trim: true },

    profilePhoto: { type: String },

    documents: {
      aadhaar: { type: String },
      incomeCertificate: { type: String },
      casteCertificate: { type: String },
      marksheet: { type: String },
      bankPassbook: { type: String },
      bonafide: { type: String },
      photo: { type: String },
    },
    documentStatuses: {
      type: Map,
      of: new mongoose.Schema({
        status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
        remarks: { type: String, default: '' },
      }, { _id: false }),
      default: {},
    },

    profileCompleted: { type: Boolean, default: false },
    completionPercentage: { type: Number, default: 0 },
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
    },
    verificationRemarks: { type: String, default: '' },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: { type: Date },

    deleteRequested: { type: Boolean, default: false },
    deleteRequestedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('StudentProfile', StudentProfileSchema);
