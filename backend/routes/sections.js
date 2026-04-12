const express = require('express');
const router = express.Router();
const Section = require('../models/Section');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// list sections
router.get('/', requireAuth, async (req, res) => {
  try {
    if (req.user && req.user.role === 'admin') {
      const list = await Section.find().populate('faculty', 'firstName lastName title').populate('students', 'studentId firstName lastName');
      return res.json({ data: list });
    }
    // student: only sections they belong to
    const list = await Section.find({ students: req.user.id }).populate('faculty', 'firstName lastName title');
    res.json({ data: list });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// get single
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const s = await Section.findById(req.params.id).populate('faculty', 'firstName lastName title').populate('students', 'studentId firstName lastName');
    if (!s) return res.status(404).json({ error: 'Not found' });
    if (req.user.role !== 'admin' && !s.students.map(String).includes(String(req.user.id))) return res.status(403).json({ error: 'Forbidden' });
    res.json(s);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// create (admin)
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, courseCode, faculty, students } = req.body;
    const s = new Section({ name, courseCode, faculty, students: Array.isArray(students) ? students : [] });
    await s.save();
    res.json(s);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// update (admin)
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const upd = await Section.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(upd);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// delete (admin)
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await Section.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
