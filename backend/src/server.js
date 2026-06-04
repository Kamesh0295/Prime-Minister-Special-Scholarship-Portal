require('dotenv').config();
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

// Start server
const PORT = process.env.PORT || 5000;
connectDB().then(async () => {
  await seedAdmin();
  app.listen(PORT, () => {
    console.log(`🚀 PMSS Backend running on http://localhost:${PORT}`);
  });
});
