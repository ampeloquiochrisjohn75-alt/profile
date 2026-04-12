const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/Users');
const { requireAuth } = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';

// Debug middleware
router.use((req, res, next) => {
  console.log(`Auth route: ${req.method} ${req.path}`);
  next();
});

// Register
router.post('/register', async (req, res) => {
  console.log('Register route hit');
  try {
    const { email, password, role, studentId, firstName, lastName, course } = req.body;
    // Disallow creating admin accounts via the public register endpoint.
    if (role === 'admin') return res.status(403).json({ error: 'Admin creation is disabled' });
    // Require email/password/role always; studentId (login ID) is required only for admin accounts
    if (!email || !password || !role) return res.status(400).json({ error: 'email, password and role are required' });
    if (role === 'admin' && !studentId) return res.status(400).json({ error: 'student/admin ID is required for admin accounts' });

    // For student registration, require admin auth if not the first user
    if (role === 'student') {
      const existingUsers = await User.countDocuments();
      const isFirstUser = existingUsers === 0;
      if (!isFirstUser) {
        const h = req.headers.authorization;
        if (!h || !h.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
        const token = h.split(' ')[1];
        try {
          const payload = jwt.verify(token, JWT_SECRET);
          if (payload.role !== 'admin') return res.status(403).json({ error: 'Forbidden: admin only' });
        } catch (err) {
          return res.status(401).json({ error: 'Invalid token' });
        }
      }
    }

    // Check for existing email; if an ID was supplied, ensure it's unique
    const existingEmail = await User.findOne({ email });
    if (existingEmail) return res.status(400).json({ error: 'Email already registered' });
    if (studentId) {
      const existingStudentId = await User.findOne({ studentId });
      if (existingStudentId) return res.status(400).json({ error: 'ID already registered' });
    }
    const hash = await bcrypt.hash(password, 10);
    const user = new User({ email, passwordHash: hash, role, studentId, firstName: firstName || '', lastName: lastName || '', course: course || '' });
    await user.save();
    const token = jwt.sign({ id: user._id, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    const resp = { token, user: { id: user._id, email: user.email, role: user.role, studentId: user.studentId, firstName: user.firstName, lastName: user.lastName, course: user.course } };
    res.json(resp);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { studentId, password } = req.body;
    if (!studentId || !password) return res.status(400).json({ error: 'studentId and password required' });
    const user = await User.findOne({ studentId });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(400).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user._id, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, email: user.email, role: user.role, studentId: user.studentId, firstName: user.firstName, lastName: user.lastName, course: user.course } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List admin accounts (admin only, no password fields)
router.get('/admins', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden: admin only' });
    const admins = await User.find({ role: 'admin' }).select('-passwordHash').sort({ studentId: 1 }).lean();
    const data = admins.map((a) => ({
      id: a._id,
      email: a.email,
      studentId: a.studentId,
      firstName: a.firstName,
      lastName: a.lastName,
      course: a.course,
      role: a.role,
    }));
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get current user + student profile
router.get('/me', requireAuth, async (req, res) => {
  try {
    const u = await User.findById(req.user.id).select('-passwordHash').lean();
    if (!u) return res.status(404).json({ error: 'User not found' });
    // Return the full user document so student dashboards can access skills, activities, and profile details.
    const out = {
      id: u._id,
      email: u.email,
      role: u.role,
      studentId: u.studentId,
      firstName: u.firstName,
      lastName: u.lastName,
      course: u.course,
    };
    if (u.role === 'student') {
      return res.json({ user: out, profile: u });
    }
    return res.json({ user: out });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
