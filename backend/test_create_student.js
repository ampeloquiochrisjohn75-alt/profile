require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/Users');

async function main(){
  try {
    const uri = process.env.MONGO_URI;
    await mongoose.connect(uri);
    const ts = Date.now();
    const u = new User({
      email: `auto.student.${ts}@example.com`,
      firstName: 'Auto',
      lastName: 'Student',
      role: 'student',
      course: 'BS Information Technology'
    });
    await u.save();
    console.log('Created student:', { id: u._id, studentId: u.studentId, department: u.department, course: u.course, courseCode: u.courseCode });
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Test insert failed', err && err.stack ? err.stack : err);
    try { await mongoose.disconnect(); } catch(e){}
    process.exit(1);
  }
}

main();
