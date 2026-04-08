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