/**
 * Utility for generating professional scholarship application PDFs using jsPDF and autoTable.
 */
export const generateApplicationPDF = (application, studentUser) => {
  if (!window.jspdf) {
    throw new Error('jsPDF library is not loaded. Please verify your connection and try again.');
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const student = application.studentId || studentUser || {};
  const p = application.personalDetails || {};
  const a = application.academicDetails || {};
  const b = application.bankDetails || {};
  const docs = application.documents || {};
  const statuses = application.documentStatuses || {};

  // Color Palette
  const primaryColor = [30, 58, 138]; // #1e3a8a - Navy Blue
  const secondaryColor = [71, 85, 105]; // #475569 - Slate
  const textColor = [30, 41, 59]; // #1e293b - Slate 800

  // 1. Draw Government Emblem / Logo Placeholder (Vector graphics)
  // Outer circle
  doc.setDrawColor(30, 58, 138);
  doc.setLineWidth(0.8);
  doc.circle(28, 25, 10); // Center x: 28, y: 25, radius: 10
  
  // Inner circle
  doc.setLineWidth(0.3);
  doc.circle(28, 25, 8);
  
  // Logo Text/Design inside emblem
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 58, 138);
  doc.text('PMSS', 23, 27);

  // 2. Header Text Details
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(30, 58, 138);
  doc.text("PRIME MINISTER'S SPECIAL SCHOLARSHIP SCHEME (PMSSS)", 42, 20);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text("Ministry of Education, Government of India", 42, 25);
  doc.text("Scholarship Scheme for Union Territories of Jammu & Kashmir and Ladakh", 42, 29);

  // Divider Line
  doc.setDrawColor(226, 232, 240); // light slate
  doc.setLineWidth(0.5);
  doc.line(15, 38, 195, 38);

  // 3. Application Metadata Section
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text("APPLICATION REPORT", 15, 46);

  const submissionDate = application.submittedAt 
    ? new Date(application.submittedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
    : 'Not Submitted';

  const statusMap = {
    draft: 'Draft',
    submitted: 'Submitted & Pending verification',
    institution_verified: 'Institution Verified',
    under_review: 'Under Review',
    approved: 'Approved',
    disbursed: 'Scholarship Released',
    rejected: 'Rejected',
  };

  const currentStatus = statusMap[application.status] || application.status || 'Draft';

  doc.autoTable({
    startY: 50,
    theme: 'plain',
    styles: { fontSize: 9, cellPadding: 2, textColor: [30, 41, 59] },
    columnStyles: {
      0: { fontStyle: 'bold', width: 40 },
      1: { width: 55 },
      2: { fontStyle: 'bold', width: 35 },
      3: { width: 50, fontStyle: 'bold', textColor: application.status === 'approved' || application.status === 'disbursed' ? [22, 101, 52] : application.status === 'rejected' ? [153, 27, 27] : [30, 58, 138] }
    },
    body: [
      ['Application ID:', application._id || 'N/A', 'Current Status:', currentStatus.toUpperCase()],
      ['Submission Date:', submissionDate, 'Registration Email:', student.email || 'N/A'],
      ['Student Registered:', student.fullName || 'N/A', 'Contact Number:', student.phone || 'N/A']
    ],
    margin: { left: 15, right: 15 }
  });

  let currentY = doc.lastAutoTable.finalY + 8;

  // 4. Table Helper Options
  const sectionHeaderStyles = {
    fillColor: [241, 245, 249],
    textColor: [30, 58, 138],
    fontStyle: 'bold',
    fontSize: 9,
    cellPadding: 3
  };

  const valueTableStyles = {
    fontSize: 9,
    cellPadding: 2.5,
    textColor: [51, 65, 85],
    lineColor: [241, 245, 249],
    lineWidth: 0.1
  };

  // 5. Personal Details Table
  doc.autoTable({
    startY: currentY,
    head: [[{ content: '1. PERSONAL & DEMOGRAPHIC DETAILS', colSpan: 4 }]],
    headStyles: sectionHeaderStyles,
    styles: valueTableStyles,
    columnStyles: {
      0: { fontStyle: 'bold', width: 40 },
      1: { width: 55 },
      2: { fontStyle: 'bold', width: 40 },
      3: { width: 55 }
    },
    body: [
      ['Full Name:', p.fullName || '—', 'Aadhaar Number:', p.aadhaarNumber || '—'],
      ['Date of Birth:', p.dateOfBirth ? new Date(p.dateOfBirth).toLocaleDateString('en-IN') : '—', 'Gender:', p.gender || '—'],
      ['Category / Caste:', p.category || '—', 'Domicile State:', p.state || '—'],
      ['District Name:', p.district || '—', 'Annual Family Income:', p.annualIncome ? `INR ${Number(p.annualIncome).toLocaleString('en-IN')}` : '—']
    ],
    margin: { left: 15, right: 15 }
  });

  currentY = doc.lastAutoTable.finalY + 6;

  // 6. Academic Details Table
  doc.autoTable({
    startY: currentY,
    head: [[{ content: '2. ACADEMIC & INSTITUTIONAL RECORD', colSpan: 4 }]],
    headStyles: sectionHeaderStyles,
    styles: valueTableStyles,
    columnStyles: {
      0: { fontStyle: 'bold', width: 40 },
      1: { width: 55 },
      2: { fontStyle: 'bold', width: 40 },
      3: { width: 55 }
    },
    body: [
      ['Institution Name:', a.institutionName || '—', 'Course / Program:', a.courseName || '—'],
      ['Current Year of Study:', a.yearOfStudy || '—', 'Board Roll Number:', a.rollNumber || '—'],
      ['Previous Year Marks:', a.previousYearMarks ? `${a.previousYearMarks}%` : '—', 'Board / University:', a.boardUniversityName || '—']
    ],
    margin: { left: 15, right: 15 }
  });

  currentY = doc.lastAutoTable.finalY + 6;

  // 7. Bank Details Table
  doc.autoTable({
    startY: currentY,
    head: [[{ content: '3. BANK RECORD (FOR DIRECT BENEFIT TRANSFER - DBT)', colSpan: 4 }]],
    headStyles: sectionHeaderStyles,
    styles: valueTableStyles,
    columnStyles: {
      0: { fontStyle: 'bold', width: 40 },
      1: { width: 55 },
      2: { fontStyle: 'bold', width: 40 },
      3: { width: 55 }
    },
    body: [
      ['Account Holder Name:', b.accountHolderName || '—', 'Bank Name Name:', b.bankName || '—'],
      ['Bank Account Number:', b.accountNumber || '—', 'IFSC Routing Code:', b.ifscCode || '—']
    ],
    margin: { left: 15, right: 15 }
  });

  currentY = doc.lastAutoTable.finalY + 6;

  // 8. Documents Checklist Table
  const getDocStatusText = (key) => {
    const docStatusObj = statuses[key] || { status: 'pending', remarks: '' };
    if (docStatusObj.status === 'verified') return '✓ VERIFIED';
    if (docStatusObj.status === 'rejected') return `✗ REJECTED (${docStatusObj.remarks || 'Reason not specified'})`;
    return '⧗ PENDING VERIFICATION';
  };

  const documentRows = Object.entries(docs)
    .filter(([key, url]) => url)
    .map(([key]) => {
      const docLabel = key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
      return [docLabel, getDocStatusText(key)];
    });

  if (documentRows.length === 0) {
    documentRows.push(['No documents uploaded yet', '—']);
  }

  doc.autoTable({
    startY: currentY,
    head: [[{ content: '4. SUPPORTING DOCUMENTATION VERIFICATION CHECKS', colSpan: 2 }]],
    headStyles: sectionHeaderStyles,
    styles: valueTableStyles,
    columnStyles: {
      0: { fontStyle: 'bold', width: 70 },
      1: { width: 110 }
    },
    body: documentRows,
    margin: { left: 15, right: 15 }
  });

  currentY = doc.lastAutoTable.finalY + 12;

  // Ensure signatures fit on page, otherwise append a page
  if (currentY > 230) {
    doc.addPage();
    currentY = 30;
  }

  // 9. Signatures Block
  doc.setDrawColor(203, 213, 225); // light gray line
  doc.setLineWidth(0.3);

  // Line for Student Signature
  doc.line(20, currentY + 18, 75, currentY + 18);
  // Line for Institution Signature
  doc.line(125, currentY + 18, 180, currentY + 18);

  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text("Candidate's Signature", 20, currentY + 22);
  doc.text("Institution Head Seal & Sign", 125, currentY + 22);

  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("Verify date:", 20, currentY + 26);
  doc.text("Verified date:", 125, currentY + 26);

  // 10. Footer / Print metadata
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`Generated on ${new Date().toLocaleString()} | PMSSS National Scholarship Portal`, 15, 287);
    doc.text(`Page ${i} of ${totalPages}`, 180, 287);
  }

  // Save/Download the PDF
  const filename = `PMSSS_Application_${application._id || 'Draft'}.pdf`;
  doc.save(filename);
};
