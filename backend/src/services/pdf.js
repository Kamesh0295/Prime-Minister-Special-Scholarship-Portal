const PDFDocument = require('pdfkit');

/**
 * Draws a simulated QR code on the PDF using vector drawing.
 */
const drawSimulatedQRCode = (doc, x, y, size = 80, dataUrl = '') => {
  // Border
  doc.rect(x, y, size, size).strokeColor('#1e293b').lineWidth(1.5).stroke();

  // Draw 3 Corner Finder Patterns (Outer square, Inner space, Solid center)
  const finderSize = size * 0.22;
  const drawFinder = (fx, fy) => {
    // Outer Box
    doc.rect(fx, fy, finderSize, finderSize).fillColor('#0f172a').fill();
    doc.rect(fx + 2, fy + 2, finderSize - 4, finderSize - 4).fillColor('#ffffff').fill();
    doc.rect(fx + 4, fy + 4, finderSize - 8, finderSize - 8).fillColor('#0f172a').fill();
  };

  drawFinder(x + 2, y + 2); // Top Left
  drawFinder(x + size - finderSize - 2, y + 2); // Top Right
  drawFinder(x + 2, y + size - finderSize - 2); // Bottom Left

  // Draw alignment pattern near bottom right
  const alignSize = size * 0.1;
  doc.rect(x + size - alignSize - 8, y + size - alignSize - 8, alignSize, alignSize).fillColor('#0f172a').fill();
  doc.rect(x + size - alignSize - 7, y + size - alignSize - 7, alignSize - 2, alignSize - 2).fillColor('#ffffff').fill();
  doc.rect(x + size - alignSize - 6, y + size - alignSize - 6, alignSize - 4, alignSize - 4).fillColor('#0f172a').fill();

  // Draw some simulated QR pixel grid blocks
  doc.fillColor('#0f172a');
  const gridSize = 6;
  const cellSize = (size - 8) / gridSize;

  // Render a random-looking grid (deterministic based on dataUrl length)
  const seed = dataUrl.length || 42;
  for (let r = 1; r < gridSize - 1; r++) {
    for (let c = 1; c < gridSize - 1; c++) {
      // Exclude corner finder areas
      if ((r < 2 && c < 2) || (r < 2 && c >= gridSize - 2) || (r >= gridSize - 2 && c < 2)) {
        continue;
      }
      const val = (r * 13 + c * 37 + seed) % 2 === 0;
      if (val) {
        doc.rect(x + 4 + c * cellSize, y + 4 + r * cellSize, cellSize - 1, cellSize - 1).fill();
      }
    }
  }
};

/**
 * Draws a simulated digital signature seal.
 */
const drawDigitalSeal = (doc, x, y) => {
  doc.save();

  // Draw seal outer circle
  doc.circle(x, y, 32).dash(2, { space: 2 }).strokeColor('#16a34a').lineWidth(1).stroke();
  doc.circle(x, y, 28).undash().strokeColor('#16a34a').lineWidth(1.5).stroke();

  // Draw Checkmark
  doc.moveTo(x - 10, y).lineTo(x - 3, y + 8).lineTo(x + 12, y - 8).strokeColor('#16a34a').lineWidth(3).stroke();

  // Sign text
  doc
    .fillColor('#15803d')
    .fontSize(6)
    .font('Helvetica-Bold')
    .text('DIGITALLY SIGNED', x - 30, y - 20, { width: 60, align: 'center' });
  doc
    .text('VERIFIED & SECURE', x - 30, y + 14, { width: 60, align: 'center' });

  doc.restore();
};

/**
 * Generates an approval letter PDF and pipes it to the response stream.
 */
const generateApprovalLetter = (res, application, student) => {
  const doc = new PDFDocument({ margin: 60, size: 'A4' });
  const date = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  const refNum = `PMSS/${new Date().getFullYear()}/${application._id.toString().slice(-6).toUpperCase()}`;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="PMSS_Approval_Letter_${student.fullName.replace(/ /g, '_')}.pdf"`);

  doc.pipe(res);

  // Header
  doc.fillColor('#1e3a8a').fontSize(16).font('Helvetica-Bold').text('PRIME MINISTER SPECIAL SCHOLARSHIP SCHEME', { align: 'center' });
  doc.fillColor('#475569').fontSize(11).font('Helvetica').text('Government of India – Ministry of Education', { align: 'center' });
  doc.moveDown(0.5);
  doc.moveTo(60, doc.y).lineTo(535, doc.y).strokeColor('#1e3a8a').lineWidth(2).stroke();
  doc.moveDown(1);

  // Title
  doc.fillColor('#15803d').fontSize(14).font('Helvetica-Bold').text('SCHOLARSHIP AWARD & APPROVAL LETTER', { align: 'center' });
  doc.moveDown(0.5);

  // Ref & Date
  doc.fillColor('#334155').fontSize(10).font('Helvetica');
  doc.text(`Ref No: ${refNum}`, { align: 'left', continued: true });
  doc.text(`Date: ${date}`, { align: 'right' });
  doc.moveDown(1);

  // Body
  doc.fontSize(10.5).fillColor('#0f172a').text(`Dear ${student.fullName},`, { font: 'Helvetica-Bold' });
  doc.moveDown(0.5);
  doc.font('Helvetica').text(
    'We are pleased to inform you that your application under the Prime Minister Special Scholarship Scheme (PMSSS) has been reviewed by the Central Scholarship Administration. Based on your academic credentials, income category, and verified college enrollment certificate, your application has been officially APPROVED.',
    { lineGap: 3 }
  );
  doc.moveDown(1);

  // Table Details
  const details = [
    ['Candidate Name', student.fullName],
    ['Aadhaar Number', application.personalDetails?.aadhaarNumber ? `XXXX-XXXX-${application.personalDetails.aadhaarNumber.slice(-4)}` : 'N/A'],
    ['Institution Name', application.academicDetails?.institutionName || 'N/A'],
    ['Course & Year', `${application.academicDetails?.courseName} (${application.academicDetails?.yearOfStudy} Year)`],
    ['Approved Scholarship Amount', '₹1,50,000 per annum (Tuition Fee & Maintenance Allowance)'],
    ['Disbursement Mode', 'Direct Benefit Transfer (DBT) to registered bank account'],
    ['Status', 'Approved & Forwarded for Disbursement'],
  ];

  const tableStartY = doc.y;
  const tableHeight = 140;
  doc.rect(60, tableStartY, 475, tableHeight).fillColor('#f8fafc').fill();
  doc.strokeColor('#e2e8f0').lineWidth(1).rect(60, tableStartY, 475, tableHeight).stroke();

  let currentY = tableStartY + 10;
  details.forEach(([key, val]) => {
    doc.fillColor('#475569').font('Helvetica-Bold').fontSize(9.5).text(key, 75, currentY);
    doc.fillColor('#0f172a').font('Helvetica').text(`:  ${val}`, 230, currentY);
    currentY += 18;
  });

  doc.y = tableStartY + tableHeight + 15;
  doc.font('Helvetica').fontSize(10).text(
    'Please verify that your bank account details (Aadhaar Seeded status) remain active. The scholarship funds will be credited directly to your bank account via PFMS.',
    { lineGap: 3 }
  );

  doc.moveDown(2.5);

  // Footer / QR Code Signatures Block
  const bottomY = doc.y;

  // Draw QR code pointing to verify portal
  const qrUrl = `http://localhost:5173/verify/${application._id}`;
  drawSimulatedQRCode(doc, 60, bottomY, 70, qrUrl);
  doc.fontSize(7).fillColor('#64748b').text('Scan to verify authenticity of this letter', 60, bottomY + 75, { width: 70, align: 'center' });

  // Draw Signatures
  doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(9.5).text('Authorized Signatory', 380, bottomY + 15);
  doc.font('Helvetica').fontSize(8.5).text('Joint Secretary (Scholarships)', 380, bottomY + 28);
  doc.text('Ministry of Education, Govt. of India', 380, bottomY + 38);

  // Draw Digital Seal
  drawDigitalSeal(doc, 450, bottomY - 20);

  // Computer generated note
  doc.moveTo(60, 770).lineTo(535, 770).strokeColor('#cbd5e1').lineWidth(0.5).stroke();
  doc.fontSize(8).fillColor('#94a3b8').text('This is an electronically generated certificate, authenticated by the National Scholarship Database.', 60, 780, { align: 'center' });

  doc.end();
};

/**
 * Generates a Rejection Letter PDF
 */
const generateRejectionLetter = (res, application, student) => {
  const doc = new PDFDocument({ margin: 60, size: 'A4' });
  const date = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  const refNum = `PMSS/${new Date().getFullYear()}/${application._id.toString().slice(-6).toUpperCase()}`;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="PMSS_Rejection_Letter_${student.fullName.replace(/ /g, '_')}.pdf"`);

  doc.pipe(res);

  // Header
  doc.fillColor('#1e3a8a').fontSize(16).font('Helvetica-Bold').text('PRIME MINISTER SPECIAL SCHOLARSHIP SCHEME', { align: 'center' });
  doc.fillColor('#475569').fontSize(11).font('Helvetica').text('Government of India – Ministry of Education', { align: 'center' });
  doc.moveDown(0.5);
  doc.moveTo(60, doc.y).lineTo(535, doc.y).strokeColor('#1e3a8a').lineWidth(2).stroke();
  doc.moveDown(1);

  // Title
  doc.fillColor('#b91c1c').fontSize(14).font('Helvetica-Bold').text('SCHOLARSHIP APPLICATION REJECTION NOTICE', { align: 'center' });
  doc.moveDown(0.5);

  // Ref & Date
  doc.fillColor('#334155').fontSize(10).font('Helvetica');
  doc.text(`Ref No: ${refNum}`, { align: 'left', continued: true });
  doc.text(`Date: ${date}`, { align: 'right' });
  doc.moveDown(1);

  // Body
  doc.fontSize(10.5).fillColor('#0f172a').text(`Dear ${student.fullName},`, { font: 'Helvetica-Bold' });
  doc.moveDown(0.5);
  doc.font('Helvetica').text(
    'We regret to inform you that your application for the Prime Minister Special Scholarship Scheme (PMSSS) has been REJECTED following evaluation by the Central Scholarship Administration.',
    { lineGap: 3 }
  );
  doc.moveDown(1);

  // Reason Box
  const reasonBoxStartY = doc.y;
  const reasonBoxHeight = 70;
  doc.rect(60, reasonBoxStartY, 475, reasonBoxHeight).fillColor('#fef2f2').fill();
  doc.strokeColor('#fee2e2').lineWidth(1).rect(60, reasonBoxStartY, 475, reasonBoxHeight).stroke();

  doc.fillColor('#991b1b').font('Helvetica-Bold').fontSize(10).text('Reason for Rejection:', 75, reasonBoxStartY + 15);
  doc.fillColor('#0f172a').font('Helvetica').fontSize(9.5).text(
    application.reviewerRemarks || 'The application did not satisfy the scheme eligibility guidelines or contained unverified/mismatched documents.',
    75,
    reasonBoxStartY + 30,
    { width: 440 }
  );

  doc.y = reasonBoxStartY + reasonBoxHeight + 20;
  doc.font('Helvetica').fontSize(10).text(
    'As per the PMSS guidelines, students whose applications are rejected are ineligible for funding during this academic cycle. For further queries, you may write to the Grievance Officer at helpdesk@pmss.gov.in.',
    { lineGap: 3 }
  );

  doc.moveDown(3);

  // Footer / QR Code Signatures Block
  const bottomY = doc.y;
  const qrUrl = `http://localhost:5173/verify/${application._id}`;
  drawSimulatedQRCode(doc, 60, bottomY, 70, qrUrl);
  doc.fontSize(7).fillColor('#64748b').text('Scan to verify document reference', 60, bottomY + 75, { width: 70, align: 'center' });

  // Signatures
  doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(9.5).text('Grievance Cell', 380, bottomY + 15);
  doc.font('Helvetica').fontSize(8.5).text('Scholarship Evaluation Board', 380, bottomY + 28);
  doc.text('Ministry of Education, Govt. of India', 380, bottomY + 38);

  // Computer generated note
  doc.moveTo(60, 770).lineTo(535, 770).strokeColor('#cbd5e1').lineWidth(0.5).stroke();
  doc.fontSize(8).fillColor('#94a3b8').text('This is an electronically generated rejection slip issued by the PMSS Scholarship Database.', 60, 780, { align: 'center' });

  doc.end();
};

/**
 * Generates a Revision Request Letter
 */
const generateRevisionLetter = (res, application, student) => {
  const doc = new PDFDocument({ margin: 60, size: 'A4' });
  const date = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  const refNum = `PMSS/${new Date().getFullYear()}/${application._id.toString().slice(-6).toUpperCase()}`;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="PMSS_Revision_Request_${student.fullName.replace(/ /g, '_')}.pdf"`);

  doc.pipe(res);

  // Header
  doc.fillColor('#1e3a8a').fontSize(16).font('Helvetica-Bold').text('PRIME MINISTER SPECIAL SCHOLARSHIP SCHEME', { align: 'center' });
  doc.fillColor('#475569').fontSize(11).font('Helvetica').text('Government of India – Ministry of Education', { align: 'center' });
  doc.moveDown(0.5);
  doc.moveTo(60, doc.y).lineTo(535, doc.y).strokeColor('#1e3a8a').lineWidth(2).stroke();
  doc.moveDown(1);

  // Title
  doc.fillColor('#ea580c').fontSize(14).font('Helvetica-Bold').text('SCHOLARSHIP APPLICATION REVISION REQUIRED', { align: 'center' });
  doc.moveDown(0.5);

  // Ref & Date
  doc.fillColor('#334155').fontSize(10).font('Helvetica');
  doc.text(`Ref No: ${refNum}`, { align: 'left', continued: true });
  doc.text(`Date: ${date}`, { align: 'right' });
  doc.moveDown(1);

  // Body
  doc.fontSize(10.5).fillColor('#0f172a').text(`Dear ${student.fullName},`, { font: 'Helvetica-Bold' });
  doc.moveDown(0.5);
  doc.font('Helvetica').text(
    'Your application for the Prime Minister Special Scholarship Scheme (PMSSS) has been reviewed, and it was found that additional information or corrected documents are needed before we can proceed with approval.',
    { lineGap: 3 }
  );
  doc.moveDown(1);

  // Correction remarks box
  const revisionBoxStartY = doc.y;
  const revisionBoxHeight = 75;
  doc.rect(60, revisionBoxStartY, 475, revisionBoxHeight).fillColor('#fff7ed').fill();
  doc.strokeColor('#ffedd5').lineWidth(1).rect(60, revisionBoxStartY, 475, revisionBoxHeight).stroke();

  doc.fillColor('#c2410c').font('Helvetica-Bold').fontSize(10).text('Action Required & Remarks:', 75, revisionBoxStartY + 15);
  doc.fillColor('#0f172a').font('Helvetica').fontSize(9.5).text(
    application.reviewerRemarks || 'Please review your uploaded documents and details.',
    75,
    revisionBoxStartY + 30,
    { width: 440 }
  );

  doc.y = revisionBoxStartY + revisionBoxHeight + 20;
  doc.font('Helvetica').fontSize(10).text(
    'Please log in to your student dashboard, navigate to your application form, correct the specified details or upload legible documents, and re-submit your application for evaluation.',
    { lineGap: 3 }
  );

  doc.moveDown(3);

  // Footer / QR Code Signatures Block
  const bottomY = doc.y;
  const qrUrl = `http://localhost:5173/verify/${application._id}`;
  drawSimulatedQRCode(doc, 60, bottomY, 70, qrUrl);
  doc.fontSize(7).fillColor('#64748b').text('Scan to verify revision case link', 60, bottomY + 75, { width: 70, align: 'center' });

  // Signatures
  doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(9.5).text('Scholarship Desk', 380, bottomY + 15);
  doc.font('Helvetica').fontSize(8.5).text('Ministry of Education', 380, bottomY + 28);
  doc.text('Government of India', 380, bottomY + 38);

  // Computer generated note
  doc.moveTo(60, 770).lineTo(535, 770).strokeColor('#cbd5e1').lineWidth(0.5).stroke();
  doc.fontSize(8).fillColor('#94a3b8').text('This is an electronically generated alert issued by the PMSS Scholarship Database.', 60, 780, { align: 'center' });

  doc.end();
};

module.exports = {
  generateApprovalLetter,
  generateRejectionLetter,
  generateRevisionLetter,
};
