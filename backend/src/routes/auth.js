const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

const router = express.Router();

const generateAccessToken = (user) =>
  jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET || 'pmss_jwt_secret_key_2024_secure',
    { expiresIn: process.env.JWT_ACCESS_EXPIRY || '1h' }
  );

const generateRefreshToken = (user) =>
  jwt.sign(
    { id: user._id },
    process.env.JWT_REFRESH_SECRET || 'pmss_refresh_secret_key_2024_secure',
    { expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d' }
  );

const AuditLog = require('../models/AuditLog');

// @route   POST /api/auth/register
// @desc    Register a new user (student or institution officer)
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const {
      fullName,
      email,
      password,
      phone,
      dateOfBirth,
      state,
      district,
      institution,
      course,
      yearOfStudy,
      role = 'student',
    } = req.body;

    // Validation
    if (!fullName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Full name, email and password are required.',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long.',
      });
    }

    if (phone && !/^\d{10}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Phone number must be exactly 10 digits.',
      });
    }

    const allowedRoles = ['student', 'institution_officer'];
    const finalRole = allowedRoles.includes(role) ? role : 'student';

    const userExists = await User.findOne({ email: email.toLowerCase() });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists.',
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({
      fullName,
      email,
      passwordHash,
      phone,
      dateOfBirth,
      state,
      district,
      institution,
      course,
      yearOfStudy,
      role: finalRole,
      isActive: true,
    });

    // Create Audit Log
    await AuditLog.create({
      userId: user._id,
      action: 'register',
      ipAddress: req.ip,
      details: { role: user.role, email: user.email },
    });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    return res.status(201).json({
      success: true,
      message: `Registration successful! Welcome as a ${finalRole === 'institution_officer' ? 'Institution Officer' : 'Student'}.`,
      data: {
        token: accessToken,
        refreshToken,
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          phone: user.phone,
          state: user.state,
          institution: user.institution,
        },
      },
    });
  } catch (error) {
    console.error('Registration error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error during registration.',
      error: error.message,
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login (student, admin, or institution officer)
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password.',
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Check account lockout
    if (user.lockUntil && user.lockUntil > Date.now()) {
      const waitTime = Math.ceil((user.lockUntil - Date.now()) / 60000);
      return res.status(403).json({
        success: false,
        message: `Your account is temporarily locked due to too many failed login attempts. Try again in ${waitTime} minutes.`,
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      let isLocked = false;
      if (user.failedLoginAttempts >= 5) {
        user.lockUntil = new Date(Date.now() + 15 * 60000); // 15 mins lock
        user.failedLoginAttempts = 0; // reset attempts
        isLocked = true;
      }
      await user.save();

      // Log failed attempt
      await AuditLog.create({
        userId: user._id,
        action: 'login_failed',
        ipAddress: req.ip,
        details: { email: user.email, isLocked },
      });

      return res.status(401).json({
        success: false,
        message: isLocked
          ? 'Too many failed login attempts. Your account has been locked for 15 minutes.'
          : 'Invalid email or password.',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Contact the administrator.',
      });
    }

    // Reset lock details on success
    if (user.failedLoginAttempts > 0 || user.lockUntil) {
      user.failedLoginAttempts = 0;
      user.lockUntil = undefined;
      await user.save();
    }

    // Log success
    await AuditLog.create({
      userId: user._id,
      action: 'login_success',
      ipAddress: req.ip,
      details: { role: user.role, email: user.email },
    });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    return res.json({
      success: true,
      message: 'Login successful.',
      data: {
        token: accessToken,
        refreshToken,
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          phone: user.phone,
          state: user.state,
          district: user.district,
          institution: user.institution,
          course: user.course,
          yearOfStudy: user.yearOfStudy,
        },
      },
    });
  } catch (error) {
    console.error('Login error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Server error during login.',
      error: error.message,
    });
  }
});

// @route   POST /api/auth/refresh-token
// @desc    Refresh access token
// @access  Public
router.post('/refresh-token', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required.',
      });
    }

    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || 'pmss_refresh_secret_key_2024_secure'
    );

    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token or account deactivated.',
      });
    }

    const accessToken = generateAccessToken(user);

    return res.json({
      success: true,
      message: 'Token refreshed successfully.',
      data: { token: accessToken },
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired refresh token.',
      error: error.message,
    });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout (client-side token invalidation)
// @access  Public
router.post('/logout', (req, res) => {
  return res.json({
    success: true,
    message: 'Logged out successfully. Please clear tokens on client side.',
  });
});

module.exports = router;
