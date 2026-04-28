require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://labiagalorenzo13_db_user:SssGsIdweezd3glB@studentprofiling.3w5hi5f.mongodb.net/profiling_db?appName=Studentprofiling";

app.use(
  cors({
    origin: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json());

// Debug middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Ensure requests to the API base return JSON (catch `/api` and `/api/`)
app.use('/api', (req, res, next) => {
  if (req.path === '/' || req.path === '') {
    return res.json({ ok: true, message: 'API is running' });
  }
  return next();
});

// student routes
const studentsRouter = require('./routes/students');
app.use('/api/students', studentsRouter);

// auth routes
const authRouter = require('./routes/auth');
app.use('/api/auth', authRouter);

// departments
const departmentsRouter = require('./routes/departments');
app.use('/api/departments', departmentsRouter);

// academic features: faculty, syllabus, events, sections, schedules, reports
const facultyRouter = require('./routes/faculty');
app.use('/api/faculty', facultyRouter);
const syllabusRouter = require('./routes/syllabus');
app.use('/api/syllabus', syllabusRouter);
const coursesRouter = require('./routes/courses');
app.use('/api/courses', coursesRouter);
const eventsRouter = require('./routes/events');
app.use('/api/events', eventsRouter);
const notificationsRouter = require('./routes/notifications');
app.use('/api/notifications', notificationsRouter);
const sectionsRouter = require('./routes/sections');
app.use('/api/sections', sectionsRouter);
const schedulesRouter = require('./routes/schedules');
app.use('/api/schedules', schedulesRouter);
const reportsRouter = require('./routes/reports');
app.use('/api/reports', reportsRouter);

// admin dashboard aggregates
const dashboardRouter = require('./routes/dashboard');
app.use('/api/dashboard', dashboardRouter);


// CONNECT DB
async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log(`✅ MongoDB Connected: ${MONGO_URI}`);
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error.message);
    process.exit(1);
  }
}

connectDB();

// BASIC ROUTE (optional health check)
// API root - return JSON so /api doesn't fall through to any static host
app.all(['/api','/api/'], (req, res) => {
  console.log('API root hit', req.method, req.path);
  res.json({ ok: true, message: 'API is running' });
});

// BASIC ROUTE (optional health check)
app.get("/", (req, res) => {
  res.send("API is running");
});

// quick test route
app.get('/test', (req, res) => res.json({ ok: true }));

// debug: list registered routes
app.get('/__routes', (req, res) => {
  try {
    const routes = [];
    const stack = app._router && Array.isArray(app._router.stack) ? app._router.stack : [];
    stack.forEach((mw) => {
      if (mw && mw.route && mw.route.path) {
        routes.push({ path: mw.route.path, methods: Object.keys(mw.route.methods || {}) });
      } else if (mw && mw.name === 'router' && mw.handle && Array.isArray(mw.handle.stack)) {
        mw.handle.stack.forEach((r) => {
          if (r && r.route && r.route.path) routes.push({ path: r.route.path, methods: Object.keys(r.route.methods || {}) });
        });
      }
    });
    res.json({ routes });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// START SERVER
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  // print registered routes for debugging
  try {
    console.log('Registered routes:');
    const stack = (app._router && Array.isArray(app._router.stack) ? app._router.stack : []);
    stack.forEach((mw, i) => {
      try {
        console.log(' LAYER', i, 'name=', mw.name || '<anon>', 'route=', !!mw.route, 'handle=', !!mw.handle, 'regexp=', !!mw.regexp);
        if (mw && mw.route) {
          const methods = Object.keys(mw.route.methods || {}).join(',');
          console.log(`  ROUTE ${methods.toUpperCase()} ${mw.route.path}`);
        } else if (mw && mw.handle && Array.isArray(mw.handle.stack)) {
          mw.handle.stack.forEach((r, j) => {
            console.log('   SUB', j, 'name=', r.name || '<anon>', 'route=', !!r.route);
            if (r && r.route) console.log(`    SUB-ROUTE ${Object.keys(r.route.methods || {}).join(',').toUpperCase()} ${r.route.path}`);
          });
        }
      } catch (e) {
        console.log('  layer inspect error', e.message);
      }
    });
  } catch (err) { console.warn('Could not list routes', err.message); }
});