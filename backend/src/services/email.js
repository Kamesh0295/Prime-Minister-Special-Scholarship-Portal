const nodemailer = require('nodemailer');

let transporter;

const getTransporter = async () => {
  if (transporter) return transporter;

  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.ethereal.email',
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  } else {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log('📧 Using Ethereal test email account:', testAccount.user);
  }

  return transporter;
};

const emailStyles = `
  body { font-family: Arial, sans-serif; background: #f4f7fb; margin: 0; padding: 0; }
  .container { max-width: 600px; margin: 30px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
  .header { background: linear-gradient(135deg, #2563EB, #1d4ed8); padding: 30px; text-align: center; color: #fff; }
  .header h1 { margin: 0; font-size: 22px; }
  .header p { margin: 5px 0 0; opacity: 0.85; font-size: 13px; }
  .body { padding: 30px; color: #374151; }
  .body p { line-height: 1.7; }
  .status-badge { display: inline-block; padding: 6px 16px; border-radius: 20px; font-weight: bold; font-size: 13px; margin: 10px 0; }
  .approved { background: #dcfce7; color: #15803d; }
  .rejected { background: #fee2e2; color: #b91c1c; }
  .review { background: #fff7ed; color: #c2410c; }
  .submitted { background: #eff6ff; color: #1d4ed8; }
  .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; }
  .btn { display: inline-block; margin-top: 16px; padding: 12px 28px; background: #2563EB; color: #fff; border-radius: 8px; text-decoration: none; font-weight: bold; }
`;

const sendEmail = async ({ to, subject, html }) => {
  try {
    const transport = await getTransporter();
    const info = await transport.sendMail({
      from: process.env.EMAIL_FROM || '"PMSS Portal" <noreply@pmss.gov.in>',
      to,
      subject,
      html,
    });
    console.log(`📧 Email sent: ${info.messageId}`);
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) console.log(`📧 Preview: ${previewUrl}`);
  } catch (err) {
    console.error('Email send error:', err.message);
  }
};

const sendApplicationSubmitted = async (student, applicationId) => {
  await sendEmail({
    to: student.email,
    subject: 'Application Submitted – PMSS Scholarship',
    html: `<style>${emailStyles}</style><div class="container"><div class="header"><h1>PMSS Scholarship Portal</h1><p>Prime Minister Special Scholarship Scheme</p></div><div class="body"><p>Dear <strong>${student.fullName}</strong>,</p><p>Your scholarship application has been successfully submitted.</p><span class="status-badge submitted">Application Submitted</span><p><strong>Application ID:</strong> ${applicationId}</p><a href="${process.env.FRONTEND_URL}/dashboard/status" class="btn">Track Application</a></div><div class="footer">Prime Minister Special Scholarship Scheme | Government of India</div></div>`,
  });
};

const sendUnderReview = async (student) => {
  await sendEmail({
    to: student.email,
    subject: 'Application Under Review – PMSS Scholarship',
    html: `<style>${emailStyles}</style><div class="container"><div class="header"><h1>PMSS Scholarship Portal</h1></div><div class="body"><p>Dear <strong>${student.fullName}</strong>,</p><p>Your application is now <strong>Under Review</strong>.</p><span class="status-badge review">Under Review</span><a href="${process.env.FRONTEND_URL}/dashboard/status" class="btn">View Status</a></div><div class="footer">Prime Minister Special Scholarship Scheme | Government of India</div></div>`,
  });
};

const sendApproved = async (student) => {
  await sendEmail({
    to: student.email,
    subject: '🎉 Congratulations! Scholarship Approved – PMSS',
    html: `<style>${emailStyles}</style><div class="container"><div class="header"><h1>PMSS Scholarship Portal</h1></div><div class="body"><p>Dear <strong>${student.fullName}</strong>,</p><p>Your application has been <strong>Approved</strong>!</p><span class="status-badge approved">✓ Approved</span><a href="${process.env.FRONTEND_URL}/dashboard/status" class="btn">Download Approval Letter</a></div><div class="footer">Prime Minister Special Scholarship Scheme | Government of India</div></div>`,
  });
};

const sendRejected = async (student, reason) => {
  await sendEmail({
    to: student.email,
    subject: 'Application Status Update – PMSS Scholarship',
    html: `<style>${emailStyles}</style><div class="container"><div class="header"><h1>PMSS Scholarship Portal</h1></div><div class="body"><p>Dear <strong>${student.fullName}</strong>,</p><p>Your application has been <strong>Rejected</strong>.</p><span class="status-badge rejected">✗ Rejected</span>${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}</div><div class="footer">Prime Minister Special Scholarship Scheme | Government of India</div></div>`,
  });
};

const sendRevisionRequested = async (student, note) => {
  await sendEmail({
    to: student.email,
    subject: 'Revision Required – PMSS Scholarship Application',
    html: `<style>${emailStyles}</style><div class="container"><div class="header"><h1>PMSS Scholarship Portal</h1></div><div class="body"><p>Dear <strong>${student.fullName}</strong>,</p><p>A revision has been requested for your application.</p>${note ? `<p><strong>Note:</strong> ${note}</p>` : ''}<a href="${process.env.FRONTEND_URL}/dashboard/application" class="btn">Update Application</a></div><div class="footer">Prime Minister Special Scholarship Scheme | Government of India</div></div>`,
  });
};

module.exports = {
  sendApplicationSubmitted,
  sendUnderReview,
  sendApproved,
  sendRejected,
  sendRevisionRequested,
};
