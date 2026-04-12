const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  start: { type: Date },
  end: { type: Date },
  location: { type: String },
  // target departments (optional) - when set, only users in these departments will see the event
  departments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Department' }],
  // target programs/course codes (optional) - store as courseCode strings
  programs: [{ type: String }],
  // visibility: 'all' = everyone, 'students' = students only, 'faculty' = faculty only, 'admins' = admins only
  visibility: { type: String, enum: ['all', 'students', 'faculty', 'admins'], default: 'all' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Event', EventSchema);
