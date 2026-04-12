const mongoose = require('mongoose');

const authUserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['admin','student'], required: true },
  studentId: { type: String, required: true, unique: true },
  firstName: { type: String, default: '' },
  lastName: { type: String, default: '' },
  course: { type: String, default: '' },
}, { timestamps: true });

// Auto-generate studentId before validation when missing
authUserSchema.pre('validate', async function() {
  if (this.isNew && (!this.studentId || String(this.studentId).trim() === '')) {
    const { getNextSequence } = require('./Counter');
    const seq = await getNextSequence('student');
    if (seq > 999999) throw new Error('No more student IDs available');
    this.studentId = 'S' + String(seq).padStart(3, '0');
  }
});

module.exports = mongoose.model('AuthUser', authUserSchema);
