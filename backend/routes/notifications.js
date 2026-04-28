const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { requireAuth } = require('../middleware/auth');

// Get notifications for current user (most recent first)
router.get('/', requireAuth, async (req, res) => {
  try {
    const list = await Notification.find({ user: req.user.id }).sort('-createdAt').limit(50);
    res.json({ data: list });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark a notification as read
router.put('/:id/read', requireAuth, async (req, res) => {
  try {
    const n = await Notification.findOneAndUpdate({ _id: req.params.id, user: req.user.id }, { $set: { read: true } }, { new: true });
    if (!n) return res.status(404).json({ error: 'Not found' });
    res.json(n);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Mark all notifications for the user as read
router.put('/read-all', requireAuth, async (req, res) => {
  try {
    await Notification.updateMany({ user: req.user.id, read: false }, { $set: { read: true } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
