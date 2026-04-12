const mongoose = require("mongoose");

const AcademicRecordSchema = new mongoose.Schema({
  institution: String,
  degree: String,
  year: Number,
  gpa: Number,
  notes: String
}, { _id: false });

const ViolationSchema = new mongoose.Schema({
  type: String,
  date: Date,
  description: String
}, { _id: false });

const userSchema = new mongoose.Schema({
  studentId: { type: String, required: true, unique: true },
  role: { type: String, enum: ['admin','student'], default: 'student' },
  passwordHash: String,
  firstName: String,
  lastName: String,
  email: { type: String, unique: true },
  phone: String,
  dob: Date,
  gender: String,
  course: String,
  courseCode: String,
  yearLevel: String,
  personalAddress: String,
  academicHistory: [AcademicRecordSchema],
  nonAcademicActivities: [String],
  violations: [ViolationSchema],
  // skills stored as objects with name and level for better accuracy
  skills: [{ name: String, level: Number }],
  affiliations: [String],
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
}, { timestamps: true });
// Auto-generate studentId if missing before validation
userSchema.pre('validate', async function() {
  if (this.isNew && (!this.studentId || String(this.studentId).trim() === '')) {
    const { getNextSequence } = require('./Counter');
    const coll = mongoose.connection.collection('users');
    let seq;
    let candidate;
    // Loop until we find a sequence that doesn't collide with existing studentId
    do {
      seq = await getNextSequence('student');
      if (seq > 999999) throw new Error('No more student IDs available');
      candidate = 'S' + String(seq).padStart(3, '0');
      // check raw collection for existing studentId
      // if collection doesn't exist yet, findOne will return null
      // eslint-disable-next-line no-await-in-loop
      const existing = await coll.findOne({ studentId: candidate });
      if (!existing) break;
      // otherwise loop again to get next sequence
    } while (true);
    this.studentId = candidate;
  }
  // Ensure department defaults to CCS (create department doc if missing)
  if (this.isNew && (!this.department || String(this.department).trim() === '')) {
    const Department = require('./Department');
    const dep = await Department.findOneAndUpdate(
      { name: new RegExp('^\\s*CCS\\s*$', 'i') },
      { $setOnInsert: { name: 'CCS', code: 'CCS' } },
      { new: true, upsert: true }
    );
    if (dep) this.department = dep._id;
  }

  // Derive or lookup courseCode for new students when course provided
  if (this.isNew && this.course && (!this.courseCode || String(this.courseCode).trim() === '')) {
    const Syllabus = require('./Syllabus');
    const escapeRegex = (t) => String(t).replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
    let syllabus = await Syllabus.findOne({ title: new RegExp('^' + escapeRegex(this.course) + '$', 'i') });
    if (!syllabus) syllabus = await Syllabus.findOne({ courseCode: new RegExp('^' + escapeRegex(this.course) + '$', 'i') });
    if (syllabus && syllabus.courseCode) {
      this.courseCode = syllabus.courseCode;
    } else {
      // fallback: derive initials from course name (e.g., 'BS Information Technology' -> 'BSIT')
      const initials = (this.course.match(/\b[A-Za-z0-9]/g) || []).join('').toUpperCase().slice(0, 6);
      this.courseCode = initials || String(this.course).replace(/\s+/g, '').toUpperCase().slice(0, 6);
    }
  }
});

// Normalize arrays to lowercase for simple case-insensitive querying
userSchema.pre('save', function() {
  // normalize skills: if string, split into array; then convert to objects
  if (this.skills) {
    if (typeof this.skills === 'string') {
      this.skills = this.skills.split(',').map(s => s.trim()).filter(Boolean);
    }
    if (Array.isArray(this.skills)) {
      this.skills = this.skills.map(s => {
        if (s == null) return null;
        if (typeof s === 'string') {
          const parts = s.split(':').map(p => p.trim());
          const name = parts[0] || '';
          // default to neutral 3 on a 1..5 scale; if caller provided a numeric level, honor it
          let level = parts[1] ? Number(parts[1]) || 3 : 3;
          level = Math.max(1, Math.min(5, parseInt(level, 10) || 3));
          return { name: String(name).toLowerCase(), level };
        }
        // object shape: assume level is already on 1..5 scale, just coerce and clamp
        const name = s.name || s.skill || '';
        let level = typeof s.level === 'number' ? s.level : (s.level ? Number(s.level) : 3);
        level = Math.max(1, Math.min(5, parseInt(level, 10) || 3));
        return { name: String(name).toLowerCase(), level };
      }).filter(Boolean);
    }
  }
  if (this.nonAcademicActivities && Array.isArray(this.nonAcademicActivities)) {
    this.nonAcademicActivities = this.nonAcademicActivities.map(a => String(a).toLowerCase());
  }
  if (this.affiliations && Array.isArray(this.affiliations)) {
    this.affiliations = this.affiliations.map(a => String(a).toLowerCase());
  }
});

module.exports = mongoose.model("User", userSchema);