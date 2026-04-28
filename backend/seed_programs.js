const mongoose = require('mongoose');
const Course = require('./models/Course');

const uri = process.env.MONGO_URI || 'mongodb+srv://labiagalorenzo13_db_user:SssGsIdweezd3glB@studentprofiling.3w5hi5f.mongodb.net/profiling_db?appName=Studentprofiling';

const programs = [
  { courseCode: 'BIT', title: 'BS Information Technology', description: 'Bachelor of Science in Information Technology' },
  { courseCode: 'BSCS', title: 'BS Computer Science', description: 'Bachelor of Science in Computer Science' },
  { courseCode: 'BSE', title: 'BS Education', description: 'Bachelor of Science in Education' },
  { courseCode: 'BSBA', title: 'BS Business Administration', description: 'Bachelor of Science in Business Administration' },
  { courseCode: 'BSPSY', title: 'BS Psychology', description: 'Bachelor of Science in Psychology' },
  { courseCode: 'BSN', title: 'BS Nursing', description: 'Bachelor of Science in Nursing' }
];

async function run() {
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');
  let inserted = 0;
  for (const p of programs) {
    try {
      const existing = await Course.findOne({ courseCode: p.courseCode });
      if (existing) {
        console.log('Already exists:', p.courseCode);
        continue;
      }
      const c = new Course(p);
      await c.save();
      console.log('Created program:', p.courseCode);
      inserted++;
    } catch (err) {
      console.error('Error creating', p.courseCode, err.message || err);
    }
  }
  console.log(`Inserted ${inserted} / ${programs.length} programs`);
  await mongoose.disconnect();
}

run().catch(err => { console.error(err); process.exit(1); });
