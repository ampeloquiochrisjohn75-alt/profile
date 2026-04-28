const mongoose = require('mongoose');
const User = require('./models/Users');
const bcrypt = require('bcryptjs');

async function seed(){
  const uri = process.env.MONGO_URI || 'mongodb+srv://labiagalorenzo13_db_user:SssGsIdweezd3glB@studentprofiling.3w5hi5f.mongodb.net/profiling_db?appName=Studentprofiling';
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  // Determine seed mode: append or fresh
  const SEED_COUNT = parseInt(process.env.SEED_COUNT, 10) || 500;
  const APPEND = (process.env.APPEND === 'true' || process.env.APPEND === '1');

  if (!APPEND) {
    // Clear existing data to have a clean seed
    await User.deleteMany({});
    console.log('Cleared existing users');
  } else {
    console.log('Appending users to existing collection');
  }

  const defaultPasswordHash = bcrypt.hashSync('password123', 10);

  // Generate 500 sample students with varied names, courses, skills
  const firstNames = ['Alex','Jamie','Taylor','Jordan','Casey','Morgan','Riley','Avery','Parker','Quinn','Sam','Cameron','Drew','Elliot','Harper','Hayden','Jesse','Logan','Rowan','Skyler'];
  const lastNames = ['Rivera','Lopez','Ng','Garcia','Smith','Johnson','Brown','DelaCruz','Santos','Reyes','Torres','Cruz','Lee','Kim','Patel','Singh','Martinez','Gonzalez','Ramirez','Diaz'];
  const courses = ['BS Information Technology','BS Computer Science','BS Education','BS Business Administration','BS Psychology','BS Nursing'];
  const skillsPool = ['programming','javascript','python','data analysis','leadership','communication','basketball','volleyball','research','design'];

  const sample = [];
  // determine starting index so generated emails remain unique when appending
  const existingCount = APPEND ? await User.countDocuments({ role: 'student' }) : 0;
  const startIdx = existingCount + 1;
  for (let i = 0; i < SEED_COUNT; i++) {
    const idx = startIdx + i;
    const fnIndex = ((idx - 1) % firstNames.length);
    const lnIndex = ((idx - 1) % lastNames.length);
    const fn = firstNames[fnIndex];
    const course = courses[idx % courses.length];
    const ln = lastNames[lnIndex];
    // create a unique email
    const email = `${fn.toLowerCase()}.${ln.toLowerCase()}.${idx}@example.com`;

    // pick 1-3 skills
    const numSkills = 1 + (idx % 3);
    const skills = [];
    for (let s = 0; s < numSkills; s++) {
      const name = skillsPool[(idx + s) % skillsPool.length];
      const level = 2 + ((idx + s) % 4); // levels 2..5
      skills.push({ name, level });
    }

    sample.push({
      // omit studentId to let the model auto-generate unique IDs
      firstName: fn,
      lastName: ln,
      email,
      course,
      role: 'student',
      passwordHash: defaultPasswordHash,
      skills,
      nonAcademicActivities: [(i % 2) ? 'club' : 'volunteer'],
      affiliations: [(i % 5 === 0) ? 'honor society' : 'general']
    });
  }

  let insertedCount = 0;
  try {
    const inserted = await User.insertMany(sample, { ordered: false });
    insertedCount = inserted.length;
  } catch (err) {
    // insertMany with ordered:false may throw BulkWriteError for duplicates; count successful inserts if possible
    if (err && err.insertedDocs) insertedCount = err.insertedDocs.length;
    console.error('Insert warnings/errors:', err.message || err);
  }
  console.log(`Seeded ${insertedCount} sample students`);

  // Create admin
  const adminPassword = process.env.SEED_ADMIN_PW || 'Admin123!';
  const adminHash = await bcrypt.hash(adminPassword, 10);
  // Upsert admin user so running seed multiple times won't fail on unique email
  await User.findOneAndUpdate(
    { email: 'admin@example.com' },
    { $set: { passwordHash: adminHash, role: 'admin', studentId: 'ADMIN', firstName: 'Site', lastName: 'Admin', course: '' } },
    { upsert: true }
  );
  console.log(`Created/updated admin user: admin@example.com (password: ${adminPassword})`);

  await mongoose.disconnect();
}

seed().catch(err => { console.error(err); process.exit(1); });
