const express = require('express');
const { protect, adminOnly } = require('../middleware/auth');
const User = require('../models/User');
const Application = require('../models/Application');
const MonthlyApplication = require('../models/MonthlyApplication');
const ApplicationStatusStat = require('../models/ApplicationStatusStat');
const StudentGrowth = require('../models/StudentGrowth');

const router = express.Router();

// Require admin protection for all analytics routes
router.use(protect, adminOnly);

const { syncAnalyticsDb } = require('../utils/syncHelper');

// @route   GET /api/admin/analytics/sync
// Force database analytics caching synchronization
router.get('/sync', async (req, res) => {
  try {
    await syncAnalyticsDb();
    return res.json({ success: true, message: 'Analytics data synced successfully.' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Sync failed.', error: error.message });
  }
});

// @route   GET /api/admin/analytics/dashboard
// Fetch admin dashboard stats cards and charts datasets
router.get('/dashboard', async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;

    // Check if caches are empty; if so, trigger a sync
    const cacheCheck = await ApplicationStatusStat.countDocuments();
    if (cacheCheck === 0) {
      await syncAnalyticsDb();
    }

    // Build filter for date range queries
    const appFilter = {};
    const userFilter = { role: 'student' };
    
    if (dateFrom || dateTo) {
      appFilter.createdAt = {};
      userFilter.createdAt = {};
      if (dateFrom) {
        appFilter.createdAt.$gte = new Date(dateFrom);
        userFilter.createdAt.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        // Set to end of day
        const endOfDay = new Date(dateTo);
        endOfDay.setHours(23, 59, 59, 999);
        appFilter.createdAt.$lte = endOfDay;
        userFilter.createdAt.$lte = endOfDay;
      }
    }

    // --- CARDS STATISTICS ---
    const [
      totalStudents,
      totalApps,
      approvedApps,
      rejectedApps,
      pendingApps,
    ] = await Promise.all([
      User.countDocuments(userFilter),
      Application.countDocuments(appFilter),
      Application.countDocuments({ ...appFilter, status: 'approved' }),
      Application.countDocuments({ ...appFilter, status: 'rejected' }),
      Application.countDocuments({ ...appFilter, status: 'submitted' }),
    ]);

    // Total Scholarships can represent the number of approved/disbursed application values
    const disbursedSumObj = await Application.aggregate([
      { $match: { ...appFilter, status: 'disbursed' } },
      { $group: { _id: null, total: { $sum: 1 } } }
    ]);
    const totalScholarships = disbursedSumObj[0]?.total || 0;

    // --- CHART DATASETS ---

    // 1. Applications by Month (Bar Chart)
    const rawMonthly = await Application.aggregate([
      { $match: appFilter },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    const applicationsByMonth = rawMonthly.map(item => ({
      month: item._id,
      count: item.count
    }));

    // 2. Approval vs Rejection Rate (Pie Chart)
    const approvalVsRejection = {
      approved: approvedApps,
      rejected: rejectedApps,
      pending: pendingApps
    };

    // 3. Category Distribution (Doughnut Chart)
    const rawCategories = await Application.aggregate([
      { $match: appFilter },
      { $group: { _id: '$personalDetails.category', count: { $sum: 1 } } }
    ]);
    const categoryDistribution = rawCategories.map(item => ({
      category: item._id || 'Unspecified',
      count: item.count
    }));

    // 4. Student Registration Growth (Line Chart)
    const rawGrowth = await User.aggregate([
      { $match: userFilter },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Compute cumulative growth line chart data
    let cumulative = 0;
    const registrationGrowth = rawGrowth.map(item => {
      cumulative += item.count;
      return {
        date: item._id,
        count: cumulative
      };
    });

    return res.json({
      success: true,
      data: {
        cards: {
          totalStudents,
          totalApplications: totalApps,
          approvedApplications: approvedApps,
          rejectedApplications: rejectedApps,
          pendingApplications: pendingApps,
          totalScholarships
        },
        charts: {
          applicationsByMonth,
          approvalVsRejection,
          categoryDistribution,
          registrationGrowth
        }
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve analytics dashboard.', error: error.message });
  }
});

module.exports = router;
