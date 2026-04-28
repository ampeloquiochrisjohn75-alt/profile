const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const User = require('../models/Users');
const Faculty = require('../models/Faculty');
const Notification = require('../models/Notification');
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

    // create notifications for admins and targeted students
    (async () => {
      try {
        const recipients = [];
        // notify all admins
        const admins = await User.find({ role: 'admin' }, '_id');
        admins.forEach(a => recipients.push(a._id));

        // notify students when visibility allows (students or all)
        if (!visibility || visibility === 'all' || visibility === 'students') {
          const studentCond = { role: 'student' };
          const or = [];
          if (Array.isArray(departments) && departments.length) or.push({ department: { $in: departments } });
          if (Array.isArray(programs) && programs.length) or.push({ courseCode: { $in: programs } });
          const query = or.length ? { ...studentCond, $or: or } : studentCond;
          const students = await User.find(query, '_id');
          students.forEach(s => recipients.push(s._id));
        }

        // dedupe
        const uniq = [...new Set(recipients.map(String))];
        if (uniq.length) {
          const when = e.start ? ` — ${new Date(e.start).toLocaleString()}` : '';
          const docs = uniq.map(uid => ({ user: uid, message: `New event: ${e.title}${when}${e.location ? ` @ ${e.location}` : ''}`, link: `/events?id=${e._id}`, metadata: { eventId: e._id } }));
          await Notification.insertMany(docs);
        }
      } catch (nerr) {
        console.warn('Failed to create notifications for event create', nerr.message);
      }
    })();

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

    // notify recipients that event was updated
    (async () => {
      try {
        const recipients = [];
        const admins = await User.find({ role: 'admin' }, '_id');
        admins.forEach(a => recipients.push(a._id));

        const visibility = (req.body && req.body.visibility) || (upd && upd.visibility) || 'all';
        const departments = (req.body && req.body.departments) || (upd && upd.departments) || [];
        const programs = (req.body && req.body.programs) || (upd && upd.programs) || [];

        if (!visibility || visibility === 'all' || visibility === 'students') {
          const studentCond = { role: 'student' };
          const or = [];
          if (Array.isArray(departments) && departments.length) or.push({ department: { $in: departments } });
          if (Array.isArray(programs) && programs.length) or.push({ courseCode: { $in: programs } });
          const query = or.length ? { ...studentCond, $or: or } : studentCond;
          const students = await User.find(query, '_id');
          students.forEach(s => recipients.push(s._id));
        }

        const uniq = [...new Set(recipients.map(String))];
        if (uniq.length) {
          const when = upd.start ? ` — ${new Date(upd.start).toLocaleString()}` : '';
          const docs = uniq.map(uid => ({ user: uid, message: `Updated event: ${upd.title}${when}${upd.location ? ` @ ${upd.location}` : ''}`, link: `/events?id=${upd._id}`, metadata: { eventId: upd._id } }));
          await Notification.insertMany(docs);
        }
      } catch (nerr) { console.warn('Failed to create notifications for event update', nerr.message); }
    })();

    res.json(upd);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// delete (admin)
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const ev = await Event.findById(req.params.id).populate('departments');
    if (!ev) return res.status(404).json({ error: 'Not found' });
    await Event.findByIdAndDelete(req.params.id);

    // notify recipients that event was deleted
    (async () => {
      try {
        const recipients = [];
        const admins = await User.find({ role: 'admin' }, '_id');
        admins.forEach(a => recipients.push(a._id));

        const visibility = ev.visibility || 'all';
        const departments = ev.departments || [];
        const programs = ev.programs || [];

        if (!visibility || visibility === 'all' || visibility === 'students') {
          const studentCond = { role: 'student' };
          const or = [];
          if (Array.isArray(departments) && departments.length) or.push({ department: { $in: departments } });
          if (Array.isArray(programs) && programs.length) or.push({ courseCode: { $in: programs } });
          const query = or.length ? { ...studentCond, $or: or } : studentCond;
          const students = await User.find(query, '_id');
          students.forEach(s => recipients.push(s._id));
        }

        const uniq = [...new Set(recipients.map(String))];
        if (uniq.length) {
          const when = ev.start ? ` — ${new Date(ev.start).toLocaleString()}` : '';
          const docs = uniq.map(uid => ({ user: uid, message: `Event cancelled: ${ev.title}${when}${ev.location ? ` @ ${ev.location}` : ''}`, link: `/events?id=${ev._id}`, metadata: { eventId: ev._id } }));
          await Notification.insertMany(docs);
        }
      } catch (nerr) { console.warn('Failed to create notifications for event delete', nerr.message); }
    })();

    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
