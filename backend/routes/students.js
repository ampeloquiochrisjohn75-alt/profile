const express = require('express');
const router = express.Router();
const Student = require('../models/Users');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// Skill stats: aggregate top skills across students and include total student count
router.get('/stats/skills', requireAuth, async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(50, parseInt(req.query.limit, 10) || 20));
    // unwind skill objects, compute per-student per-skill average (dedupe multiple entries), then aggregate per skill
    const pipeline = [
      { $unwind: { path: '$skills', preserveNullAndEmptyArrays: false } },
      { $project: { _id: 1, skillName: { $toLower: '$skills.name' }, level: '$skills.level' } },
      { $match: { skillName: { $nin: [null, ''] } } },
      // group by skill + student to dedupe repeated entries per student
      { $group: { _id: { skill: '$skillName', student: '$_id' }, level: { $avg: '$level' } } },
      // now group by skill to count unique students and average the per-student levels
      { $group: { _id: '$_id.skill', count: { $sum: 1 }, avgLevel: { $avg: '$level' } } },
      { $sort: { count: -1 } },
      { $limit: limit },
      // project avgLevel (1..5) and rounded likertAvg (1..5)
      { $project: { skill: '$_id', count: 1, avgLevel: { $round: ['$avgLevel', 2] }, likertAvg: { $round: ['$avgLevel', 0] }, _id: 0 } }
    ];
    const stats = await Student.aggregate(pipeline);
    const total = await Student.countDocuments();
    // include likertAvg (1..5) and percentage of students that listed the skill
    const data = stats.map(s => ({ skill: s.skill, count: s.count, avgLevel: s.avgLevel, likertAvg: s.likertAvg, percent: total > 0 ? Math.round((s.count / total) * 100) : 0 }));
    res.json({ data, total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create student (admin only)
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const data = req.body;
    console.log('POST /api/students body:', data);
    // basic validation: payload must exist; studentId will be auto-generated when missing
    if (!data) return res.status(400).json({ error: 'payload required' });

    // If password is provided, hash it
    if (data.password) {
      const bcrypt = require('bcryptjs');
      data.passwordHash = await bcrypt.hash(data.password, 10);
      data.role = 'student';
      delete data.password;
    }

    // Check for existing email; if caller provided studentId, ensure it's unique
    const existingEmail = await Student.findOne({ email: data.email });
    if (existingEmail) return res.status(400).json({ error: 'Email already registered' });
    if (data.studentId) {
      const existingStudentId = await Student.findOne({ studentId: data.studentId });
      if (existingStudentId) return res.status(400).json({ error: 'Student ID already registered' });
    }

    // ensure arrays exist and normalize to arrays
    data.skills = Array.isArray(data.skills) ? data.skills : (data.skills ? [data.skills] : []);
    data.nonAcademicActivities = Array.isArray(data.nonAcademicActivities) ? data.nonAcademicActivities : (data.nonAcademicActivities ? [data.nonAcademicActivities] : []);
    data.affiliations = Array.isArray(data.affiliations) ? data.affiliations : (data.affiliations ? [data.affiliations] : []);

    // normalize skills to array of objects
    if (data.skills && Array.isArray(data.skills)) {
      data.skills = data.skills.map(s => {
        if (typeof s === 'string') {
          const parts = s.split(':').map(p => p.trim());
          const name = parts[0] || '';
          let level = parts[1] ? Number(parts[1]) || 3 : 3;
          level = Math.max(1, Math.min(5, parseInt(level, 10) || 3));
          return { name: String(name).toLowerCase(), level };
        }
        // if already object
        const name = s.name || s.skill || '';
        let level = typeof s.level === 'number' ? s.level : (s.level ? Number(s.level) : 3);
        level = Math.max(1, Math.min(5, parseInt(level, 10) || 3));
        return { name: String(name).toLowerCase(), level };
      }).filter(Boolean);
    }

    // sanitize department: accept ObjectId or department name, otherwise remove
    if (data.department) {
      const mongoose = require('mongoose');
      if (!mongoose.Types.ObjectId.isValid(data.department)) {
        const Department = require('../models/Department');
        const dep = await Department.findOne({ name: new RegExp('^' + String(data.department) + '$', 'i') });
        if (dep) data.department = dep._id;
        else delete data.department;
      }
    } else {
      delete data.department;
    }

    const student = new Student(data);
    await student.save();

    const response = { student };
    return res.status(201).json(response);
  } catch (err) {
    console.error('Create student error:', err && err.stack ? err.stack : err);
    res.status(400).json({ error: err.message || 'create error', stack: err.stack });
  }
});

// Get list with optional filters: skill, activity, affiliation
// Admins see full list; authenticated students may request a limited peer search by `skill`.
router.get('/', requireAuth, async (req, res) => {
  try {
    const { skill, activity, affiliation, q, page = 1, limit = 20, department, courseCode } = req.query;
    console.log('GET /api/students query:', { skill, activity, affiliation, q, page, limit, department, courseCode, user: req.user && req.user.email });

    // Base filter applies to students only
    const baseFilter = { role: 'student' };

    // If requester is not admin, only allow a limited peer search by `skill` (to avoid exposing full student list)
    if (req.user.role !== 'admin') {
      if (!skill) return res.status(403).json({ error: 'Forbidden' });
      const filter = { ...baseFilter, 'skills.name': { $in: [String(skill).toLowerCase()] } };
      const lim = Math.max(1, Math.min(20, parseInt(limit, 10) || 5));
      const students = await Student.find(filter).sort({ createdAt: -1 }).limit(lim).select('firstName lastName studentId skills').populate('department');
      return res.json({ data: students, total: students.length, page: 1, pages: 1 });
    }

    // Admin path: full filtering support
    const filter = { ...baseFilter };
    if (skill) filter['skills.name'] = { $in: [skill.toLowerCase()] };
    if (activity) filter.nonAcademicActivities = { $in: [activity.toLowerCase()] };
    if (affiliation) filter.affiliations = { $in: [affiliation.toLowerCase()] };
    if (courseCode) {
      // case-insensitive exact match for course code
      const esc = String(courseCode).replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
      filter.courseCode = new RegExp('^' + esc + '$', 'i');
    }
    if (department) {
      const mongoose = require('mongoose');
      if (mongoose.Types.ObjectId.isValid(department)) {
        filter.department = department;
      } else {
        const Department = require('../models/Department');
        const dep = await Department.findOne({ name: new RegExp('^' + department + '$', 'i') });
        if (dep) filter.department = dep._id;
      }
    }
    if (q) {
      const re = new RegExp(q, 'i');
      filter.$or = [{ firstName: re }, { lastName: re }, { studentId: re }, { email: re }];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const lim = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * lim;

    const [students, total] = await Promise.all([
      Student.find(filter).sort({ createdAt: -1 }).skip(skip).limit(lim).populate('department'),
      Student.countDocuments(filter)
    ]);

    res.json({ data: students, total, page: pageNum, pages: Math.ceil(total / lim) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Export CSV for current filter
router.get('/export', async (req, res) => {
  try {
    const { skill, activity, affiliation, q, courseCode } = req.query;
    const filter = {};
    if (skill) filter['skills.name'] = { $in: [skill.toLowerCase()] };
    if (activity) filter.nonAcademicActivities = { $in: [activity.toLowerCase()] };
    if (affiliation) filter.affiliations = { $in: [affiliation.toLowerCase()] };
    if (courseCode) {
      const esc = String(courseCode).replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
      filter.courseCode = new RegExp('^' + esc + '$', 'i');
    }
    if (q) {
      const re = new RegExp(q, 'i');
      filter.$or = [{ firstName: re }, { lastName: re }, { studentId: re }, { email: re }];
    }

    const students = await Student.find(filter).sort({ createdAt: -1 }).populate('department');
    const header = ['studentId','firstName','lastName','email','course','courseCode','skills','activities','affiliations'];
    const rows = students.map(s => ([s.studentId, s.firstName, s.lastName, s.email, s.course, s.courseCode || '', (s.skills||[]).map(sk => typeof sk === 'string' ? sk : `${sk.name}:${sk.level}`).join('|'), (s.nonAcademicActivities||[]).join('|'), (s.affiliations||[]).join('|')] ))
      .map(r => r.map(v => `"${String(v||'').replace(/"/g,'""')}"`).join(','));

    const csv = [header.join(','), ...rows].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="students_export.csv"');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single (admin or owner)
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const student = await Student.findById(req.params.id).populate('department');
    if (!student) return res.status(404).json({ error: 'Not found' });
    // allow owner (student) to view their own profile or admin
    if (req.user.role === 'admin' || String(student.email || '') === String(req.user.email || '')) {
      return res.json(student);
    }
    return res.status(403).json({ error: 'Forbidden' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update (admin or owner)
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const data = req.body;
    console.log('PUT /api/students/:id payload:', { id: req.params.id, body: data, user: req.user && req.user.email });
    // normalize incoming skills (accept comma/string like 'a:3' or array of strings/objects) to avoid Mongoose cast errors
    if (data.skills && !Array.isArray(data.skills) && typeof data.skills === 'string') {
      // convert comma-separated string into array
      data.skills = data.skills.split(',').map(s => s.trim()).filter(Boolean);
    }
    if (data.skills && Array.isArray(data.skills)) {
      data.skills = data.skills.map(sk => {
        if (sk == null) return null;
        if (typeof sk === 'string') {
          const parts = sk.split(':').map(p => p.trim());
          const name = parts[0] || '';
          let level = parts[1] ? Number(parts[1]) || 3 : 3;
          level = Math.max(1, Math.min(5, parseInt(level, 10) || 3));
          return { name: String(name).toLowerCase(), level };
        }
        const name = sk.name || sk.skill || '';
        let level = typeof sk.level === 'number' ? sk.level : (sk.level ? Number(sk.level) || 3 : 3);
        level = Math.max(1, Math.min(5, parseInt(level, 10) || 3));
        return { name: String(name).toLowerCase(), level };
      }).filter(Boolean);
      console.log('Normalized skills payload:', data.skills);
    }
    if (data.nonAcademicActivities && Array.isArray(data.nonAcademicActivities)) data.nonAcademicActivities = data.nonAcademicActivities.map(a => a.toLowerCase());
    if (data.affiliations && Array.isArray(data.affiliations)) data.affiliations = data.affiliations.map(a => a.toLowerCase());
    const student = await Student.findById(req.params.id).populate('department');
    if (!student) return res.status(404).json({ error: 'Not found' });
      // allow admin or owner (matching email)
      if (req.user.role !== 'admin' && String(student.email || '') !== String(req.user.email || '')) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      if (req.user.role === 'admin'){
        // Admins may not modify skills — only student owners can change their skills
        if (Object.prototype.hasOwnProperty.call(data, 'skills')) delete data.skills;
        // sanitize department before applying
        if (Object.prototype.hasOwnProperty.call(data, 'department')) {
          const mongoose = require('mongoose');
          if (data.department && mongoose.Types.ObjectId.isValid(String(data.department))) {
            // keep as-is
          } else if (data.department) {
            const Department = require('../models/Department');
            const dep = await Department.findOne({ name: new RegExp('^' + String(data.department) + '$', 'i') });
            data.department = dep ? dep._id : undefined;
          } else {
            data.department = undefined;
          }
        }
        // Defensive check: ensure skills is an array of objects (convert if possible), otherwise remove
        if (Object.prototype.hasOwnProperty.call(data, 'skills')) {
          try {
            if (!Array.isArray(data.skills)) throw new Error('skills not array');
            data.skills = data.skills.map(sk => {
              if (!sk) return null;
              if (typeof sk === 'string') {
                const parts = sk.split(':').map(p => p.trim());
                const name = parts[0] || '';
                let level = parts[1] ? Number(parts[1]) || 3 : 3;
                level = Math.max(1, Math.min(5, parseInt(level, 10) || 3));
                return { name: String(name).toLowerCase(), level };
              }
              if (typeof sk === 'object') {
                const name = sk.name || sk.skill || '';
                let level = typeof sk.level === 'number' ? sk.level : (sk.level ? Number(sk.level) || 3 : 3);
                level = Math.max(1, Math.min(5, parseInt(level, 10) || 3));
                return { name: String(name).toLowerCase(), level };
              }
              throw new Error('invalid skill element');
            }).filter(Boolean);
          } catch (e) {
            console.log('Dropping invalid skills payload before apply:', e.message);
            delete data.skills;
          }
        }
        Object.assign(student, data);
      } else {
        // student owner may only update skills and nonAcademicActivities
        const allowed = {};
        if (data.skills && Array.isArray(data.skills)) allowed.skills = data.skills; // accept objects or strings; pre-save normalization will handle
        if (data.nonAcademicActivities && Array.isArray(data.nonAcademicActivities)) allowed.nonAcademicActivities = data.nonAcademicActivities.map(a => String(a).toLowerCase());
        Object.assign(student, allowed);
      }
      await student.save();
      // return populated student so frontend sees department.name
      const populated = await Student.findById(student._id).populate('department');
      res.json(populated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete (admin only)
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Admin migration endpoint: convert existing string-based skills to { name, level }
// Admin migration endpoint: convert existing string-based skills to { name, level }
// Usage: POST /api/students/migrate/skills  (admin only)
// Returns { success: true, updated: N }
router.post('/migrate/skills', requireAuth, requireAdmin, async (req, res) => {
  try {
    const students = await Student.find({});
    let updated = 0;
    for (const s of students) {
      if (!s.skills || !Array.isArray(s.skills) || s.skills.length === 0) continue;
      let modified = false;
      const newSkills = s.skills.map(sk => {
        if (sk == null) return null;
        if (typeof sk === 'string') {
          const parts = sk.split(':').map(p => p.trim());
          const name = parts[0] || '';
          let level = parts[1] ? Number(parts[1]) || 3 : 3;
          if (level <= 3) level = (level - 1) * 2 + 1;
          const clamped = Math.max(1, Math.min(5, parseInt(level, 10) || 3));
          modified = true;
          return { name: String(name).toLowerCase(), level: clamped };
        }
        // already an object
        const name = sk.name || sk.skill || '';
        let level = typeof sk.level === 'number' ? sk.level : (sk.level ? Number(sk.level) || 3 : 3);
        if (level <= 3) level = (level - 1) * 2 + 1;
        const clamped = Math.max(1, Math.min(5, parseInt(level, 10) || 3));
        const normalizedName = String(name).toLowerCase();
        if (sk.name !== normalizedName || sk.level !== clamped) modified = true;
        return { name: normalizedName, level: clamped };
      }).filter(Boolean);
      if (modified) {
        s.skills = newSkills;
        await s.save();
        updated++;
      }
    }
    res.json({ success: true, updated });
  } catch (err) {
    console.error('Migration error:', err && err.stack ? err.stack : err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
