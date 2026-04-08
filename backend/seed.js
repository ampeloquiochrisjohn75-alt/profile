const mongoose = require('mongoose');
const User = require('./models/Users');
const bcrypt = require('bcryptjs');

async function seed(){
  const uri = process.env.MONGO_URI || 'mongodb+srv://labiagalorenzo13_db_user:SssGsIdweezd3glB@studentprofiling.3w5hi5f.mongodb.net/profiling_db?appName=Studentprofiling';
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  // Clear existing data to have a clean seed
  await User.deleteMany({});

  const defaultPasswordHash = bcrypt.hashSync('password123', 10);

  const sample = [
    {
      studentId: 'S001', firstName: 'Alex', lastName: 'Rivera', email: 'alex@example.com', course: 'BS Information Technology', role: 'student', passwordHash: defaultPasswordHash, skills: [{name: 'basketball', level: 4},{name: 'leadership', level: 5}], nonAcademicActivities: ['team captain'], affiliations: ['sports club']
    },
    {
      studentId: 'S002', firstName: 'Jamie', lastName: 'Lopez', email: 'jamie@example.com', course: 'BS Computer Science', role: 'student', passwordHash: defaultPasswordHash, skills: [{name: 'programming', level: 4},{name: 'javascript', level: 5}], nonAcademicActivities: ['hackathon'], affiliations: ['cs club']
    },
    {
      studentId: 'S003', firstName: 'Taylor', lastName: 'Ng', email: 'taylor@example.com', course: 'BS Education', role: 'student', passwordHash: defaultPasswordHash, skills: [{name: 'python', level: 4},{name: 'data analysis', level: 5}], nonAcademicActivities: ['coding club'], affiliations: ['it society']
    }
  ];

  await User.insertMany(sample);
  console.log('Seeded sample students');

  // Create admin
  const adminPassword = process.env.SEED_ADMIN_PW || 'Admin123!';
  const adminHash = await bcrypt.hash(adminPassword, 10);
  const admin = new User({
    email: 'admin@example.com',
    passwordHash: adminHash,
    role: 'admin',
    studentId: 'ADMIN',
    firstName: 'Site',
    lastName: 'Admin',
    course: ''
  });

  await admin.save();
  console.log(`Created admin user: admin@example.com (password: ${adminPassword})`);

  await mongoose.disconnect();
}

seed().catch(err => { console.error(err); process.exit(1); });
