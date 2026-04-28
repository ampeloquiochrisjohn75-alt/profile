const mongoose = require('mongoose');
const User = require('./models/Users');
const bcrypt = require('bcryptjs');

const uri = process.env.MONGO_URI || 'mongodb+srv://labiagalorenzo13_db_user:SssGsIdweezd3glB@studentprofiling.3w5hi5f.mongodb.net/profiling_db?appName=Studentprofiling';

const samples = [
  { firstName: 'Mia', lastName: 'Santos', email: 'mia.santos.sample@example.com', course: 'BS Computer Science' },
  { firstName: 'Noah', lastName: 'Garcia', email: 'noah.garcia.sample@example.com', course: 'BS Information Technology' },
  { firstName: 'Olivia', lastName: 'Reyes', email: 'olivia.reyes.sample@example.com', course: 'BS Education' },
  { firstName: 'Liam', lastName: 'Torres', email: 'liam.torres.sample@example.com', course: 'BS Business Administration' },
  { firstName: 'Sophia', lastName: 'Kim', email: 'sophia.kim.sample@example.com', course: 'BS Psychology' },
  { firstName: 'Ethan', lastName: 'Lee', email: 'ethan.lee.sample@example.com', course: 'BS Nursing' }
];

async function run() {
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to MongoDB');
  const defaultHash = bcrypt.hashSync('password123', 10);
  let inserted = 0;
  for (const s of samples) {
    try {
      const exists = await User.findOne({ email: s.email });
      if (exists) {
        console.log('Skipping existing email:', s.email);
        continue;
      }
      const u = new User({ ...s, passwordHash: defaultHash, role: 'student' });
      await u.save();
      console.log('Inserted:', s.email);
      inserted++;
    } catch (err) {
      console.error('Error inserting', s.email, err.message || err);
    }
  }
  console.log(`Inserted ${inserted} / ${samples.length} sample students`);
  await mongoose.disconnect();
}

run().catch(err => { console.error(err); process.exit(1); });
