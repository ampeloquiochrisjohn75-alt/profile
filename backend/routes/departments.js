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

// Note: creation / update / deletion of departments has been disabled
// to keep the app read-only for departments (views remain available).

module.exports = router;
