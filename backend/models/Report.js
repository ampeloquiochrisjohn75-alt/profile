const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
  title: { type: String, required: true },
  // long text content (plain text). Kept as string to allow arbitrary large text bodies.
  data: { type: String },
  // legacy visibility flag (still supported)
  visibility: { type: String, enum: ['admin', 'student', 'all'], default: 'admin' },
  // recipient targeting
  allStudents: { type: Boolean, default: false },
  studentRecipients: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  allFaculty: { type: Boolean, default: false },
  facultyRecipients: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Faculty' }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Report', ReportSchema);
