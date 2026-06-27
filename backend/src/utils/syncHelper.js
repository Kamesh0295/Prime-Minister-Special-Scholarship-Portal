const MonthlyApplication = require('../models/MonthlyApplication');
const ApplicationStatusStat = require('../models/ApplicationStatusStat');
const StudentGrowth = require('../models/StudentGrowth');
const User = require('../models/User');
const Application = require('../models/Application');

const syncAnalyticsDb = async () => {
  try {
    // 1. Sync Application Status Stats
    await ApplicationStatusStat.deleteMany({});
    const statusStats = await Application.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    for (const stat of statusStats) {
      await ApplicationStatusStat.create({
        status: stat._id || 'draft',
        count: stat.count
      });
    }

    // 2. Sync Monthly Application volume
    await MonthlyApplication.deleteMany({});
    const monthlyStats = await Application.aggregate([
      {
        $group: {
          _id: {
            month: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }
          },
          count: { $sum: 1 },
          submitted: { $sum: { $cond: [{ $eq: ['$status', 'submitted'] }, 1, 0] } },
          approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } },
          rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] } }
        }
      }
    ]);
    for (const m of monthlyStats) {
      await MonthlyApplication.create({
        month: m._id.month || new Date().toISOString().split('T')[0].substring(0, 7),
        count: m.count,
        submitted: m.submitted,
        approved: m.approved,
        rejected: m.rejected
      });
    }

    // 3. Sync Student growth
    await StudentGrowth.deleteMany({});
    const students = await User.find({ role: 'student' }).sort({ createdAt: 1 });
    
    const dailyCounts = {};
    students.forEach(student => {
      const dateStr = new Date(student.createdAt).toISOString().split('T')[0];
      dailyCounts[dateStr] = (dailyCounts[dateStr] || 0) + 1;
    });

    let runningTotal = 0;
    const sortedDates = Object.keys(dailyCounts).sort();
    for (const date of sortedDates) {
      runningTotal += dailyCounts[date];
      await StudentGrowth.create({
        date,
        count: runningTotal
      });
    }
  } catch (err) {
    console.error('Failed to sync analytics database:', err.message);
  }
};

module.exports = { syncAnalyticsDb };
