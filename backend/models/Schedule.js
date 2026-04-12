const mongoose = require('mongoose');

const ScheduleSchema = new mongoose.Schema({
  title: { type: String },
  section: { type: mongoose.Schema.Types.ObjectId, ref: 'Section' },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  start: { type: Date },
  end: { type: Date },
  location: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Schedule', ScheduleSchema);
