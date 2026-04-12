const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const User = require('../models/Users');
const Faculty = require('../models/Faculty');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// list events (authenticated)
router.get('/', requireAuth, async (req, res) => {
  try {
    if (req.user && req.user.role === 'admin') {
      const list = await Event.find().populate('departments').sort('-start');
      return res.json({ data: list });
    }

    // determine user context (department, courseCode) when possible
    let userDept = null;
    let userCourseCode = null;
    try {
      if (req.user && req.user.role === 'student') {
        const u = await User.findById(req.user.id).populate('department').lean();
        if (u) {
          userDept = u.department ? (u.department._id ? u.department._id.toString() : u.department.toString()) : null;
          userCourseCode = u.courseCode || u.course || null;
        }
      } else if (req.user && req.user.role === 'faculty') {
        // try to locate a faculty record by email or id
        const f = await Faculty.findOne({ email: req.user.email }).lean();
        if (f) {
          // faculty.department is stored as a string code/name in the Faculty model
          userDept = f.department || null;
        }
      }
    } catch (e) {
      console.warn('Failed to resolve user dept/course for events filtering', e.message);
    }

    // decide base visibility set per role
    let baseVisibility = ['all'];
    if (req.user && req.user.role === 'student') baseVisibility = ['all', 'students'];
    else if (req.user && req.user.role === 'faculty') baseVisibility = ['all', 'faculty'];

    // load candidate events then filter by department/program targeting
    const candidates = await Event.find({ visibility: { $in: baseVisibility } }).populate('departments').sort('-start');
    const filtered = candidates.filter((ev) => {
      // if event targets departments, it must include user's department
      if (ev.departments && ev.departments.length > 0) {
        if (!userDept) return false;
        const depIds = ev.departments.map(d => (d && d._id ? d._id.toString() : String(d)));
        if (!depIds.includes(String(userDept))) return false;
      }
      // if event targets programs (course codes), it must include user's courseCode
      if (ev.programs && ev.programs.length > 0) {
        if (!userCourseCode) return false;
        const codes = ev.programs.map(p => String(p || '').toUpperCase());
        if (!codes.includes(String(userCourseCode || '').toUpperCase())) return false;
      }
      return true;
    });

    return res.json({ data: filtered });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// get single
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const e = await Event.findById(req.params.id);
    if (!e) return res.status(404).json({ error: 'Not found' });
    // visibility check
    if (e.visibility === 'admins' && (!req.user || req.user.role !== 'admin')) return res.status(403).json({ error: 'Forbidden' });
    if (e.visibility === 'students' && (!req.user || (req.user.role !== 'student' && req.user.role !== 'admin'))) return res.status(403).json({ error: 'Forbidden' });
    if (e.visibility === 'faculty' && (!req.user || (req.user.role !== 'faculty' && req.user.role !== 'admin'))) return res.status(403).json({ error: 'Forbidden' });
    res.json(e);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// create (admin)
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { title, description, start, end, location, visibility, departments, programs } = req.body;
    const e = new Event({ title, description, start, end, location, visibility, createdBy: req.user.id });
    if (Array.isArray(departments) && departments.length) e.departments = departments;
    if (Array.isArray(programs) && programs.length) e.programs = programs;
    await e.save();
    const out = await Event.findById(e._id).populate('departments');
    res.json(out);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// update (admin)
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await Event.findByIdAndUpdate(req.params.id, req.body, { new: true });
    const upd = await Event.findById(req.params.id).populate('departments');
    res.json(upd);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// delete (admin)
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await Event.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
