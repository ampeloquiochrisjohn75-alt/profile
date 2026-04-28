const mongoose = require('mongoose');
const Course = require('./models/Course');
const User = require('./models/Users');
const bcrypt = require('bcryptjs');

const uri = process.env.MONGO_URI || 'mongodb+srv://labiagalorenzo13_db_user:SssGsIdweezd3glB@studentprofiling.3w5hi5f.mongodb.net/profiling_db?appName=Studentprofiling';

async function run(){
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');
  const courses = await Course.find();
  const defaultHash = bcrypt.hashSync('password123', 10);
  let created = 0;
  for (const c of courses){
    const count = await User.countDocuments({ role: 'student', courseCode: { $regex: '^' + (c.courseCode || '') + '$', $options: 'i' } });
    if (count > 0){
      console.log(`Course ${c.courseCode} already has ${count} student(s)`);
      continue;
    }
    // create sample student for this course
    const email = `sample.${c.courseCode.toLowerCase()}.example@example.com`;
    const existing = await User.findOne({ email });
    if (existing){
      console.log('Sample email already exists:', email);
      continue;
    }
    const student = new User({
      firstName: 'Sample',
      lastName: c.courseCode,
      email,
      passwordHash: defaultHash,
      role: 'student',
      course: c.title || c.courseCode,
      courseCode: c.courseCode,
    });
    try {
      await student.save();
      console.log('Created sample student for', c.courseCode, 'email=', email);
      created++;
    } catch (err) {
      console.error('Failed to create student for', c.courseCode, err.message || err);
    }
  }
  console.log(`Created ${created} sample students`);
  await mongoose.disconnect();
}

run().catch(err => { console.error(err); process.exit(1); });
