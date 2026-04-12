const express = require('express');
const router = express.Router();
const Schedule = require('../models/Schedule');
const Section = require('../models/Section');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// list schedules
router.get('/', requireAuth, async (req, res) => {
  try {
    if (req.user && req.user.role === 'admin') {
      const list = await Schedule.find().populate('section').populate('student');
      return res.json({ data: list });
    }
    // student: personal schedules or schedules for sections they belong to
    const mySections = await Section.find({ students: req.user.id }, '_id');
    const sectionIds = mySections.map(s => s._id);
    const list = await Schedule.find({ $or: [{ student: req.user.id }, { section: { $in: sectionIds } }] }).populate('section').populate('student');
    res.json({ data: list });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// create (admin)
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { title, section, student, start, end, location } = req.body;
    const s = new Schedule({ title, section, student, start, end, location, createdBy: req.user.id });
    await s.save();
    res.json(s);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// update (admin)
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const upd = await Schedule.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(upd);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// delete (admin)
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await Schedule.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
