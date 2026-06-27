require('dotenv').config({ override: true });
const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');

const connectDB = require('./config/db');
const User = require('./models/User');

// Route imports
const authRoutes = require('./routes/auth');
const studentRoutes = require('./routes/student');
const documentRoutes = require('./routes/documents');
const adminRoutes = require('./routes/admin');
const notificationsRoutes = require('./routes/notifications');
const institutionRoutes = require('./routes/institution');
const aiRoutes = require('./routes/ai');
const publicRoutes = require('./routes/public');
const analyticsRoutes = require('./routes/analytics');
const chatbotRoutes = require('./routes/chatbot');

const app = express();

// Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman) and any localhost in dev
      const allowed = [
        process.env.FRONTEND_URL || 'http://localhost:5173',
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:5175',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:5174',
      ];
      if (!origin || allowed.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS policy blocked: ${origin}`));
      }
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve uploaded files
const uploadsPath = path.join(__dirname, '../uploads');
app.use('/uploads', express.static(uploadsPath));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/institution', institutionRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/admin/analytics', analyticsRoutes);
app.use('/api/ai/chatbot', chatbotRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'PMSS – Prime Minister Special Scholarship Management System API is running.',
    version: '1.0.0',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found.` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ success: false, message: 'Internal server error.', error: err.message });
});

// Seed default admin account
const seedAdmin = async () => {
  try {
    const adminEmail = 'admin@pmss.gov.in';
    const existing = await User.findOne({ email: adminEmail });

    if (!existing) {
      console.log('Seeding default admin account...');
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash('Admin@123', salt);

      await User.create({
        fullName: 'PMSS Administrator',
        email: adminEmail,
        passwordHash,
        role: 'admin',
        isActive: true,
      });

      console.log('════════════════════════════════════════');
      console.log('  DEFAULT ADMIN ACCOUNT CREATED');
      console.log(`  Email:    ${adminEmail}`);
      console.log('  Password: Admin@123');
      console.log('════════════════════════════════════════');
    }
  } catch (error) {
    console.error('Failed to seed admin:', error.message);
  }
};

// Seed default FAQ knowledge base
const seedFaqs = async () => {
  try {
    const FAQ = require('./models/FAQ');
    const count = await FAQ.countDocuments();
    if (count === 0) {
      console.log('Seeding default chatbot FAQs...');
      const defaultFaqs = [
        {
          question: 'Am I eligible for this scholarship?',
          answer: 'To be eligible for PMSSS, you must be a resident of Jammu & Kashmir or Ladakh, have passed Class 12 or equivalent, and have a family income under ₹8,00,000 per annum. Standard General, Engineering, and Medical degree courses are supported.',
          category: 'eligibility'
        },
        {
          question: 'What documents are required?',
          answer: 'The required documents are:\n1. Aadhaar Card\n2. Domicile/State Residence Certificate\n3. Income Certificate\n4. Caste/Community Certificate\n5. Class 12 Marksheet\n6. Bank Passbook\n7. Bonafide College Certificate.',
          category: 'documents'
        },
        {
          question: 'How do I apply?',
          answer: 'First, navigate to "My Profile" and complete all details to at least 80%. Then, go to "Application", verify your pre-filled details, upload any additional files, and click "Submit Application".',
          category: 'process'
        },
        {
          question: 'When is the deadline?',
          answer: 'Scholarship deadlines are set by the Ministry of Education, Government of India. Please monitor the homepage announcements and dashboard notifications for the current registration deadlines.',
          category: 'deadlines'
        },
        {
          question: 'Why was my application rejected?',
          answer: 'Common reasons for rejection include: blurred or illegible documents, mismatched names between Aadhaar and academic marksheets, or incorrect bank details. Please check the remarks left by the reviewer, correct the details in your profile, and re-submit.',
          category: 'general'
        },
        {
          question: 'How can I update my profile?',
          answer: 'You can update your profile by navigating to the "My Profile" page. Fill in the required fields under the respective tabs, upload any updated documents, and click "Save Profile Changes" at the bottom.',
          category: 'general'
        }
      ];
      await FAQ.insertMany(defaultFaqs);
      console.log('✅ FAQ Knowledge Base seeded successfully.');
    }
  } catch (error) {
    console.error('Failed to seed FAQs:', error.message);
  }
};

// Start server
const PORT = process.env.PORT || 5000;
connectDB().then(async () => {
  await seedAdmin();
  await seedFaqs();
  app.listen(PORT, () => {
    console.log(`🚀 PMSS Backend running on http://localhost:${PORT}`);
  });
});

// Assistant verified write access

