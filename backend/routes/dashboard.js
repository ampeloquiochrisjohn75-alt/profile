const express = require('express');
const router = express.Router();
const Student = require('../models/Users');
const Department = require('../models/Department');
const { requireAuth, requireAdmin } = require('../middleware/auth');

/** GET /api/dashboard/stats — admin summary for dashboard widgets */
router.get('/stats', requireAuth, requireAdmin, async (req, res) => {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [
      totalStudents,
      totalAdmins,
      recentStudents,
      registrationsByMonth,
      totalDepartments,
      studentsWithSkills,
      newLast7Days,
    ] = await Promise.all([
      Student.countDocuments({ role: 'student' }),
      Student.countDocuments({ role: 'admin' }),
      Student.find({ role: 'student' })
        .sort({ createdAt: -1 })
        .limit(10)
        .select('studentId firstName lastName course createdAt')
        .lean(),
      Student.aggregate([
        { $match: { role: 'student', createdAt: { $gte: sixMonthsAgo } } },
        {
          $group: {
            _id: { y: { $year: '$createdAt' }, m: { $month: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.y': 1, '_id.m': 1 } },
        { $project: { _id: 0, year: '$_id.y', month: '$_id.m', count: 1 } },
      ]),
      Department.countDocuments(),
      Student.countDocuments({ role: 'student', 'skills.0': { $exists: true } }),
      Student.countDocuments({ role: 'student', createdAt: { $gte: sevenDaysAgo } }),
    ]);

    res.json({
      totalStudents,
      totalAdmins,
      totalDepartments,
      studentsWithSkills,
      newLast7Days,
      recentActivity: recentStudents.map((s) => ({
        type: 'student',
        label: `${s.firstName || ''} ${s.lastName || ''}`.trim() || s.studentId,
        studentId: s.studentId,
        at: s.createdAt,
      })),
      registrationsByMonth,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
