const mongoose = require('mongoose');

const FacultySchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, index: true },
  title: { type: String },
  department: { type: String },
  employeeId: { type: String, index: true },
  bio: { type: String },
  createdAt: { type: Date, default: Date.now },
});

// Auto-generate employeeId before validation when missing
FacultySchema.pre('validate', async function() {
  if (this.isNew && (!this.employeeId || String(this.employeeId).trim() === '')) {
    const { getNextSequence } = require('./Counter');
    const coll = mongoose.connection.collection('faculties');
    let seq;
    let candidate;
    do {
      seq = await getNextSequence('faculty');
      if (seq > 999999) throw new Error('No more faculty IDs available');
      candidate = 'F' + String(seq).padStart(3, '0');
      const existing = await coll.findOne({ employeeId: candidate });
      if (!existing) break;
    } while (true);
    this.employeeId = candidate;
  }
  // Default department to CCS for new faculty when not provided
  if (this.isNew && (!this.department || String(this.department).trim() === '')) {
    this.department = 'CCS';
  }
});

module.exports = mongoose.model('Faculty', FacultySchema);
