const express = require('express');
const router = express.Router();
const Syllabus = require('../models/Syllabus');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// list syllabi (authenticated)
router.get('/', requireAuth, async (req, res) => {
  try {
    const list = await Syllabus.find().sort('-createdAt');
    res.json({ data: list });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// get single
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const s = await Syllabus.findById(req.params.id);
    if (!s) return res.status(404).json({ error: 'Not found' });
    res.json(s);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// create (admin)
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { title, courseCode, description, files } = req.body;
    const s = new Syllabus({ title, courseCode, description, files, createdBy: req.user.id });
    await s.save();
    res.json(s);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// update (admin)
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const upd = await Syllabus.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(upd);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// delete (admin)
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await Syllabus.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
