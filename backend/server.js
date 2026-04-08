require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

// ------------------------
// Database
// ------------------------
const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb+srv://labiagalorenzo13_db_user:SssGsIdweezd3glB@studentprofiling.3w5hi5f.mongodb.net/profiling_db?appName=Studentprofiling";

async function connectDB() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log(`✅ MongoDB Connected`);
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error.message);
    process.exit(1);
  }
}

connectDB();

// ------------------------
// CORS Setup
// ------------------------
const CLIENT_URL = process.env.CLIENT_URL || '';
const DEFAULT_ALLOWED = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://profile-vert-tau.vercel.app'
];

const allowedOrigins = CLIENT_URL
  ? CLIENT_URL.split(',').map(u => u.trim())
  : DEFAULT_ALLOWED;

console.log('CORS allowed origins:', allowedOrigins);

app.use(cors({
  origin: function (origin, callback) {
    // allow server-to-server requests (like Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('CORS not allowed by server'));
  },
  methods: ['GET','HEAD','PUT','PATCH','POST','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: true // allow cookies
}));

// Handle preflight requests globally
app.options("*", cors());

// ------------------------
// Middleware
// ------------------------
app.use(express.json());

// Debug request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// ------------------------
// Routes
// ------------------------
const studentsRouter = require('./routes/students');
const authRouter = require('./routes/auth');
const departmentsRouter = require('./routes/departments');
const dashboardRouter = require('./routes/dashboard');

app.use('/api/students', studentsRouter);
app.use('/api/auth', authRouter);
app.use('/api/departments', departmentsRouter);
app.use('/api/dashboard', dashboardRouter);

// Health check route
app.get("/", (req, res) => res.send("API is running"));

// Quick test route
app.get('/test', (req, res) => res.json({ ok: true }));

// ------------------------
// Start Server
// ------------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

  // Optional: list registered routes for debugging
  try {
    console.log('Registered routes:');
    const stack = app._router && Array.isArray(app._router.stack) ? app._router.stack : [];
    stack.forEach((mw, i) => {
      if (mw && mw.route) {
        const methods = Object.keys(mw.route.methods || {}).join(',');
        console.log(`  ROUTE ${methods.toUpperCase()} ${mw.route.path}`);
      } else if (mw && mw.handle && Array.isArray(mw.handle.stack)) {
        mw.handle.stack.forEach((r) => {
          if (r && r.route) {
            console.log(`    SUB-ROUTE ${Object.keys(r.route.methods || {}).join(',').toUpperCase()} ${r.route.path}`);
          }
        });
      }
    });
  } catch (err) {
    console.warn('Could not list routes', err.message);
  }
});