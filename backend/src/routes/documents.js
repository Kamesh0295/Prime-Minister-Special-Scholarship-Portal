const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { protect } = require('../middleware/auth');
const Application = require('../models/Application');

const router = express.Router();

// Ensure uploads directory exists
const uploadsBase = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsBase)) fs.mkdirSync(uploadsBase, { recursive: true });

// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(uploadsBase, req.user._id.toString());
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${file.fieldname}_${Date.now()}${ext}`;
    cb(null, name);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ['.pdf', '.jpg', '.jpeg', '.png'];
  const ext = path.extname(file.originalname).toLowerCase();

  // Photo field allows JPG/PNG, others must be PDF
  if (file.fieldname === 'photo') {
    if (['.jpg', '.jpeg', '.png'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Photo must be JPG or PNG format.'), false);
    }
  } else {
    if (ext === '.pdf') {
      cb(null, true);
    } else {
      cb(new Error(`${file.fieldname} must be a PDF file.`), false);
    }
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
});

const documentFields = upload.fields([
  { name: 'aadhaar', maxCount: 1 },
  { name: 'incomeCertificate', maxCount: 1 },
  { name: 'casteCertificate', maxCount: 1 },
  { name: 'marksheet', maxCount: 1 },
  { name: 'bankPassbook', maxCount: 1 },
  { name: 'bonafide', maxCount: 1 },
  { name: 'photo', maxCount: 1 },
]);

// @route   POST /api/documents/upload
// @access  Protected
router.post('/upload', protect, (req, res) => {
  documentFields(req, res, async (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'File size exceeds 2MB limit.',
        });
      }
      return res.status(400).json({
        success: false,
        message: err.message || 'File upload error.',
      });
    }

    try {
      if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).json({ success: false, message: 'No files uploaded.' });
      }

      // Build URL map
      const documentUrls = {};
      Object.entries(req.files).forEach(([fieldname, files]) => {
        const relativePath = `/uploads/${req.user._id}/${files[0].filename}`;
        documentUrls[fieldname] = relativePath;
      });

      // Update application documents if one exists
      const application = await Application.findOne({ studentId: req.user._id });
      if (application) {
        application.documents = { ...application.documents, ...documentUrls };
        await application.save();
      }

      return res.json({
        success: true,
        message: 'Documents uploaded successfully.',
        data: documentUrls,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Server error during upload.',
        error: error.message,
      });
    }
  });
});

// @route   GET /api/documents/:applicationId
// @access  Protected
router.get('/:applicationId', protect, async (req, res) => {
  try {
    const application = await Application.findById(req.params.applicationId);
    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    // Students can only see their own; admins can see all
    if (
      req.user.role !== 'admin' &&
      application.studentId.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    return res.json({
      success: true,
      message: 'Documents fetched.',
      data: application.documents,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error.', error: error.message });
  }
});

module.exports = router;
