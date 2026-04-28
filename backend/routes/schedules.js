const express = require('express');
const router = express.Router();
const Schedule = require('../models/Schedule');
const Section = require('../models/Section');
const User = require('../models/Users');
const Notification = require('../models/Notification');
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
    // create notifications for admins and involved students
    (async () => {
      try {
        const recipients = [];
        const admins = await User.find({ role: 'admin' }, '_id');
        admins.forEach(a => recipients.push(a._id));

        if (student) recipients.push(student);

        if (section) {
          const sec = await Section.findById(section, 'students');
          if (sec && sec.students && sec.students.length) sec.students.forEach(st => recipients.push(st));
        }

        const uniq = [...new Set(recipients.map(String))];
        if (uniq.length) {
          const when = s.start ? ` — ${new Date(s.start).toLocaleString()}` : '';
          const docs = uniq.map(uid => ({ user: uid, message: `New schedule: ${s.title || 'Schedule'}${when}${s.location ? ` @ ${s.location}` : ''}`, link: `/schedules?id=${s._id}`, metadata: { scheduleId: s._id } }));
          await Notification.insertMany(docs);
        }
      } catch (nerr) {
        console.warn('Failed to create notifications for schedule create', nerr.message);
      }
    })();

    res.json(s);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// update (admin)
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const upd = await Schedule.findByIdAndUpdate(req.params.id, req.body, { new: true });
    // notify recipients about update
    (async () => {
      try {
        const recipients = [];
        const admins = await User.find({ role: 'admin' }, '_id');
        admins.forEach(a => recipients.push(a._id));

        if (upd && upd.student) recipients.push(upd.student);
        if (upd && upd.section) {
          const sec = await Section.findById(upd.section, 'students');
          if (sec && sec.students && sec.students.length) sec.students.forEach(st => recipients.push(st));
        }

        const uniq = [...new Set(recipients.map(String))];
        if (uniq.length) {
          const when = upd.start ? ` — ${new Date(upd.start).toLocaleString()}` : '';
          const docs = uniq.map(uid => ({ user: uid, message: `Updated schedule: ${upd.title || 'Schedule'}${when}${upd.location ? ` @ ${upd.location}` : ''}`, link: `/schedules?id=${upd._id}`, metadata: { scheduleId: upd._id } }));
          await Notification.insertMany(docs);
        }
      } catch (nerr) { console.warn('Failed to create notifications for schedule update', nerr.message); }
    })();

    res.json(upd);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// delete (admin)
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const s = await Schedule.findById(req.params.id);
    if (!s) return res.status(404).json({ error: 'Not found' });
    await Schedule.findByIdAndDelete(req.params.id);

    (async () => {
      try {
        const recipients = [];
        const admins = await User.find({ role: 'admin' }, '_id');
        admins.forEach(a => recipients.push(a._id));

        if (s.student) recipients.push(s.student);
        if (s.section) {
          const sec = await Section.findById(s.section, 'students');
          if (sec && sec.students && sec.students.length) sec.students.forEach(st => recipients.push(st));
        }

        const uniq = [...new Set(recipients.map(String))];
        if (uniq.length) {
          const when = s.start ? ` — ${new Date(s.start).toLocaleString()}` : '';
          const docs = uniq.map(uid => ({ user: uid, message: `Schedule cancelled: ${s.title || 'Schedule'}${when}${s.location ? ` @ ${s.location}` : ''}`, link: `/schedules?id=${s._id}`, metadata: { scheduleId: s._id } }));
          await Notification.insertMany(docs);
        }
      } catch (nerr) { console.warn('Failed to create notifications for schedule delete', nerr.message); }
    })();

    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
