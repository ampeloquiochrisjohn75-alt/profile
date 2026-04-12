const mongoose = require('mongoose');

const SyllabusSchema = new mongoose.Schema({
  title: { type: String, required: true },
  courseCode: { type: String },
  description: { type: String },
  files: [{ type: String }], // store file paths or URLs
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Syllabus', SyllabusSchema);
