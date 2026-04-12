const express = require('express');
const router = express.Router();
const Faculty = require('../models/Faculty');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// list faculties (authenticated)
router.get('/', requireAuth, async (req, res) => {
  try {
    const list = await Faculty.find().sort('lastName');
    res.json({ data: list });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// get single
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const f = await Faculty.findById(req.params.id);
    if (!f) return res.status(404).json({ error: 'Not found' });
    res.json(f);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// create (admin)
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { firstName, lastName, email, title, department, employeeId, bio } = req.body;
    const f = new Faculty({ firstName, lastName, email, title, department, employeeId, bio });
    await f.save();
    res.json(f);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// update (admin)
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const upd = await Faculty.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(upd);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// delete (admin)
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await Faculty.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
