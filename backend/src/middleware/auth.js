const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Protect routes — verifies JWT and attaches user to req.user
 */
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized. No token provided.',
    });
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'pmss_jwt_secret_key_2024_secure'
    );

    const user = await User.findById(decoded.id).select('-passwordHash');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Token is invalid. User not found.',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Contact administrator.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token verification failed.',
      error: error.message,
    });
  }
};

/**
 * Admin-only guard — must be called after protect
 */
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: 'Access denied. Admins only.',
  });
};

/**
 * Student-only guard — must be called after protect
 */
const studentOnly = (req, res, next) => {
  if (req.user && req.user.role === 'student') {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: 'Access denied. Students only.',
  });
};

/**
 * Institution officer guard — must be called after protect
 */
const institutionOfficerOnly = (req, res, next) => {
  if (req.user && req.user.role === 'institution_officer') {
    return next();
  }
  return res.status(403).json({
    success: false,
    message: 'Access denied. Institution officers only.',
  });
};

module.exports = { protect, adminOnly, studentOnly, institutionOfficerOnly };
