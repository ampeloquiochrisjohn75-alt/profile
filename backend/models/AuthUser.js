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

module.exports = mongoose.model('AuthUser', authUserSchema);
