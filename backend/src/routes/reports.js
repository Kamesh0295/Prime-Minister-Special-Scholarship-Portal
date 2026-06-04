const express = require('express');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const Report = require('../models/Report');
const Experiment = require('../models/Experiment');
const { authenticateJWT } = require('../middleware/auth');

const router = express.Router();

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// @route   GET /api/reports
// @desc    List all generated reports (role-restricted)
// @access  Private
router.get('/', authenticateJWT, async (req, res) => {
  try {
    let query = {};

    // Filter reports based on user's access to experiments
    if (req.user.role === 'viewer') {
      const approvedExperiments = await Experiment.find({ status: 'Approved' }).select('_id');
      const ids = approvedExperiments.map((e) => e._id);
      query = { experimentId: { $in: ids } };
    } else if (req.user.role === 'researcher') {
      const accessibleExperiments = await Experiment.find({
        $or: [
          { status: 'Approved' },
          { submittedBy: req.user._id }
        ]
      }).select('_id');
      const ids = accessibleExperiments.map((e) => e._id);
      query = { experimentId: { $in: ids } };
    } // Admin gets all

    const { startDate, endDate } = req.query;
    if (startDate || endDate) {
      query.generatedAt = {};
      if (startDate) {
        query.generatedAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.generatedAt.$lte = new Date(endDate);
      }
    }

    const reports = await Report.find(query)
      .populate({
        path: 'experimentId',
        select: 'title status submittedBy',
        populate: { path: 'submittedBy', select: 'name email institution' }
      })
      .sort({ generatedAt: -1 });

    return res.json({
      success: true,
      message: 'Reports retrieved successfully',
      data: reports,
    });
  } catch (error) {
    console.error('Fetch reports error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error while retrieving reports',
      error: error.message,
    });
  }
});

// @route   POST /api/reports/generate
// @desc    Generate a PDF or CSV report for an experiment
// @access  Private
router.post('/generate', authenticateJWT, async (req, res) => {
  try {
    const { experimentId, format } = req.body;

    if (!experimentId || !format || !['pdf', 'csv'].includes(format)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide experimentId and valid format (pdf or csv)',
      });
    }

    const experiment = await Experiment.findById(experimentId).populate('submittedBy', 'name email institution');
    if (!experiment) {
      return res.status(404).json({
        success: false,
        message: 'Experiment not found',
      });
    }

    // Access check: only allow generating reports for experiments the user can view
    if (req.user.role === 'viewer' && experiment.status !== 'Approved') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Cannot generate report for unapproved experiment',
      });
    }
    if (
      req.user.role === 'researcher' &&
      experiment.status !== 'Approved' &&
      experiment.submittedBy._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not own this experiment and it is not approved',
      });
    }

    const fileName = `report-${experimentId}-${Date.now()}.${format}`;
    const filePath = path.join(uploadDir, fileName);
    const fileUrl = `/uploads/${fileName}`;

    if (format === 'pdf') {
      // Generate PDF using pdfkit
      const doc = new PDFDocument({ margin: 50 });
      const writeStream = fs.createWriteStream(filePath);
      doc.pipe(writeStream);

      // Header Theme Colors (Dark Sci-Fi look)
      doc.rect(0, 0, doc.page.width, 120).fill('#0B0F19');
      
      // Title
      doc.fillColor('#06B6D4')
        .fontSize(22)
        .text('ANTI-GRAVITY RESEARCH PLATFORM', 50, 40, { align: 'center', characterSpacing: 1.5 });
      
      doc.fillColor('#FFFFFF')
        .fontSize(12)
        .text('OFFICIAL EXPERIMENT REPORT', 50, 75, { align: 'center', characterSpacing: 2 });

      // Body Section
      doc.y = 150;
      doc.fillColor('#1F2937');

      // Title
      doc.fontSize(16).fillColor('#06B6D4').text('Experiment Title:', 50, doc.y);
      doc.fontSize(14).fillColor('#111827').text(experiment.title, 50, doc.y + 20);

      // Metadata Grid
      doc.y = doc.y + 60;
      doc.fontSize(12).fillColor('#06B6D4').text('Metadata', 50, doc.y);
      
      // Horizontal Line
      doc.strokeColor('#E5E7EB').moveTo(50, doc.y + 15).lineTo(550, doc.y + 15).stroke();
      
      doc.y = doc.y + 25;
      doc.fontSize(10).fillColor('#4B5563');
      doc.text(`Researcher: ${experiment.submittedBy.name} (${experiment.submittedBy.email})`, 50, doc.y);
      doc.text(`Institution: ${experiment.submittedBy.institution}`, 50, doc.y + 15);
      doc.text(`Status: ${experiment.status}`, 50, doc.y + 30);
      doc.text(`Submitted On: ${new Date(experiment.createdAt).toLocaleDateString()}`, 50, doc.y + 45);

      // Main content
      doc.y = doc.y + 75;
      doc.fontSize(12).fillColor('#06B6D4').text('Hypothesis:', 50, doc.y);
      doc.fontSize(10).fillColor('#1F2937').text(experiment.hypothesis, 50, doc.y + 18, { width: 500, align: 'justify' });

      doc.y = doc.y + Math.max(50, doc.heightOfString(experiment.hypothesis, { width: 500 }) + 30);
      doc.fontSize(12).fillColor('#06B6D4').text('Methodology:', 50, doc.y);
      doc.fontSize(10).fillColor('#1F2937').text(experiment.methodology, 50, doc.y + 18, { width: 500, align: 'justify' });

      doc.y = doc.y + Math.max(50, doc.heightOfString(experiment.methodology, { width: 500 }) + 30);
      doc.fontSize(12).fillColor('#06B6D4').text('Expected Outcome:', 50, doc.y);
      doc.fontSize(10).fillColor('#1F2937').text(experiment.expectedOutcome, 50, doc.y + 18, { width: 500, align: 'justify' });

      if (experiment.tags && experiment.tags.length > 0) {
        doc.y = doc.y + Math.max(50, doc.heightOfString(experiment.expectedOutcome, { width: 500 }) + 30);
        doc.fontSize(12).fillColor('#06B6D4').text('Tags:', 50, doc.y);
        doc.fontSize(10).fillColor('#1F2937').text(experiment.tags.join(', '), 50, doc.y + 18);
      }

      // Footer
      doc.fontSize(8).fillColor('#9CA3AF').text('Generated by Anti-Gravity Research & Simulation Platform.', 50, doc.page.height - 50, { align: 'center' });

      doc.end();
      
      // Wait for file write to complete
      await new Promise((resolve) => writeStream.on('finish', resolve));

    } else if (format === 'csv') {
      // Generate CSV string manually (escaping double quotes)
      const escapeCSV = (str) => `"${(str || '').replace(/"/g, '""')}"`;
      
      const csvHeaders = ['Experiment ID', 'Title', 'Researcher Name', 'Researcher Email', 'Institution', 'Status', 'Hypothesis', 'Methodology', 'Expected Outcome', 'Tags', 'Created At'];
      const csvData = [
        experiment._id.toString(),
        experiment.title,
        experiment.submittedBy.name,
        experiment.submittedBy.email,
        experiment.submittedBy.institution,
        experiment.status,
        experiment.hypothesis,
        experiment.methodology,
        experiment.expectedOutcome,
        experiment.tags.join('; '),
        experiment.createdAt.toISOString()
      ];

      const csvContent = [
        csvHeaders.map(escapeCSV).join(','),
        csvData.map(escapeCSV).join(',')
      ].join('\n');

      fs.writeFileSync(filePath, csvContent);
    }

    // Save report to DB
    const report = await Report.create({
      experimentId,
      fileUrl,
      format,
    });

    return res.status(201).json({
      success: true,
      message: 'Report generated successfully',
      data: report,
    });
  } catch (error) {
    console.error('Generate report error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error while generating report',
      error: error.message,
    });
  }
});

// @route   GET /api/reports/:id
// @desc    Download/Retrieve a generated report
// @access  Private
router.get('/:id', authenticateJWT, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id).populate('experimentId');

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found',
      });
    }

    const experiment = report.experimentId;
    if (!experiment) {
      return res.status(404).json({
        success: false,
        message: 'Associated experiment not found',
      });
    }

    // Access check: only allow users who can view the experiment to download its reports
    if (req.user.role === 'viewer' && experiment.status !== 'Approved') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Associated experiment is not approved',
      });
    }
    if (
      req.user.role === 'researcher' &&
      experiment.status !== 'Approved' &&
      experiment.submittedBy.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have access to this report',
      });
    }

    const filePath = path.join(__dirname, '../..', report.fileUrl);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Report file does not exist on disk',
      });
    }

    // Stream download
    return res.download(filePath);
  } catch (error) {
    console.error('Download report error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error during report retrieval',
      error: error.message,
    });
  }
});

module.exports = router;
