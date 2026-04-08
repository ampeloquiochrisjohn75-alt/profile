require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://labiagalorenzo13_db_user:SssGsIdweezd3glB@studentprofiling.3w5hi5f.mongodb.net/profiling_db?appName=Studentprofiling";

// Configure CORS: allow local dev and optional production client (set via CLIENT_URL)
// Example: CLIENT_URL=https://your-app.vercel.app or comma-separated list
const CLIENT_URL = process.env.CLIENT_URL || '';
// Add the deployed frontend origin by default so Render+Vercel deployments work
const DEFAULT_ALLOWED = ['http://localhost:3000', 'http://localhost:3001', 'https://profile-vert-tau.vercel.app'];
const allowedOrigins = CLIENT_URL
  ? CLIENT_URL.split(',').map((u) => u.trim())
  : DEFAULT_ALLOWED;

console.log('CORS allowed origins:', allowedOrigins);

app.use(
  cors({
    origin: function (origin, callback) {
      // allow non-browser requests like curl/postman
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1) return callback(null, true);
      return callback(new Error('CORS not allowed by server'));
    },
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

// student routes
const studentsRouter = require('./routes/students');
app.use('/api/students', studentsRouter);

// auth routes
const authRouter = require('./routes/auth');
app.use('/api/auth', authRouter);

// departments
const departmentsRouter = require('./routes/departments');
app.use('/api/departments', departmentsRouter);

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
app.get("/", (req, res) => {
  res.send("API is running");
});

// quick test route
app.get('/test', (req, res) => res.json({ ok: true }));

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