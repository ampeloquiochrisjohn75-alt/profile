const express = require('express');
const router = express.Router();
const Department = require('../models/Department');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// list departments (authenticated)
router.get('/', requireAuth, async (req, res) => {
  try {
    const list = await Department.find().sort('name');
    res.json({ data: list });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// create (admin)
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const d = new Department({ name: req.body.name, code: req.body.code || '' });
    await d.save();
    res.json(d);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// update (admin)
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const d = await Department.findByIdAndUpdate(req.params.id, { name: req.body.name, code: req.body.code || '' }, { new: true });
    res.json(d);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// delete (admin)
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await Department.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
