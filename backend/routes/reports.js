const express = require('express');
const router = express.Router();
const Report = require('../models/Report');
const User = require('../models/Users');
const Faculty = require('../models/Faculty');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// list reports
router.get('/', requireAuth, async (req, res) => {
  try {
    if (req.user && req.user.role === 'admin') {
      const list = await Report.find().populate('studentRecipients', 'studentId firstName lastName').populate('facultyRecipients', 'employeeId firstName lastName').sort('-createdAt');
      return res.json({ data: list });
    }

    // build conditions depending on role and recipient targeting
    const conditions = [{ createdBy: req.user.id }];
    if (req.user && req.user.role === 'student') {
      conditions.push({ allStudents: true });
      conditions.push({ studentRecipients: req.user.id });
      conditions.push({ visibility: { $in: ['student', 'all'] } });
    } else if (req.user && req.user.role === 'faculty') {
      // try to resolve faculty record by email
      let facultyRec = null;
      try { facultyRec = await Faculty.findOne({ email: req.user.email }).lean(); } catch (e) { /* ignore */ }
      if (facultyRec && facultyRec._id) {
        conditions.push({ allFaculty: true });
        conditions.push({ facultyRecipients: facultyRec._id });
      }
      // also include reports marked for all or admin-visible
      conditions.push({ visibility: { $in: ['all'] } });
    } else {
      // fallback: public reports
      conditions.push({ visibility: { $in: ['all'] } });
    }

    const list = await Report.find({ $or: conditions }).populate('studentRecipients', 'studentId firstName lastName').populate('facultyRecipients', 'employeeId firstName lastName').sort('-createdAt');
    res.json({ data: list });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// get single
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const r = await Report.findById(req.params.id).populate('studentRecipients').populate('facultyRecipients');
    if (!r) return res.status(404).json({ error: 'Not found' });
    if (req.user && req.user.role === 'admin') return res.json(r);

    // owner can always read
    if (r.createdBy && String(r.createdBy) === String(req.user.id)) return res.json(r);

    // student access
    if (req.user && req.user.role === 'student') {
      if (r.allStudents) return res.json(r);
      if (Array.isArray(r.studentRecipients) && r.studentRecipients.map(s => String(s._id || s)).includes(String(req.user.id))) return res.json(r);
      if (r.visibility && ['student', 'all'].includes(r.visibility)) return res.json(r);
      return res.status(403).json({ error: 'Forbidden' });
    }

    // faculty access
    if (req.user && req.user.role === 'faculty') {
      // try find faculty record
      let facultyRec = null;
      try { facultyRec = await Faculty.findOne({ email: req.user.email }).lean(); } catch (e) { facultyRec = null; }
      if (r.allFaculty) return res.json(r);
      if (facultyRec && Array.isArray(r.facultyRecipients) && r.facultyRecipients.map(f => String(f._id || f)).includes(String(facultyRec._id))) return res.json(r);
      if (r.visibility && r.visibility === 'all') return res.json(r);
      return res.status(403).json({ error: 'Forbidden' });
    }

    // default deny
    return res.status(403).json({ error: 'Forbidden' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// create (admin)
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { title, data, visibility, allStudents, studentRecipients, allFaculty, facultyRecipients } = req.body;
    const r = new Report({ title, data, visibility, createdBy: req.user.id });
    if (allStudents) r.allStudents = true;
    if (Array.isArray(studentRecipients) && studentRecipients.length) r.studentRecipients = studentRecipients;
    if (allFaculty) r.allFaculty = true;
    if (Array.isArray(facultyRecipients) && facultyRecipients.length) r.facultyRecipients = facultyRecipients;
    await r.save();
    const out = await Report.findById(r._id).populate('studentRecipients', 'studentId firstName lastName').populate('facultyRecipients', 'employeeId firstName lastName');
    res.json(out);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// update (admin)
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { title, data, visibility, allStudents, studentRecipients, allFaculty, facultyRecipients } = req.body;
    const toSet = { title, data, visibility };
    if (typeof allStudents !== 'undefined') toSet.allStudents = !!allStudents;
    if (Array.isArray(studentRecipients)) toSet.studentRecipients = studentRecipients;
    if (typeof allFaculty !== 'undefined') toSet.allFaculty = !!allFaculty;
    if (Array.isArray(facultyRecipients)) toSet.facultyRecipients = facultyRecipients;
    await Report.findByIdAndUpdate(req.params.id, toSet, { new: true });
    const upd = await Report.findById(req.params.id).populate('studentRecipients', 'studentId firstName lastName').populate('facultyRecipients', 'employeeId firstName lastName');
    res.json(upd);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// delete (admin)
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await Report.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
