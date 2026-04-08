const mongoose = require('mongoose');
const User = require('./models/Users');
const bcrypt = require('bcryptjs');

async function addAdmin() {
  const uri = process.env.MONGO_URI || 'mongodb+srv://labiagalorenzo13_db_user:SssGsIdweezd3glB@studentprofiling.3w5hi5f.mongodb.net/profiling_db?appName=Studentprofiling';
  const email = process.env.NEW_ADMIN_EMAIL || 'admin2@example.com';
  const password = process.env.NEW_ADMIN_PW || 'Admin123!';
  const studentId = process.env.NEW_ADMIN_ID || 'ADMIN2';
  const firstName = process.env.NEW_ADMIN_FIRST || 'Site';
  const lastName = process.env.NEW_ADMIN_LAST || 'Admin2';

  await mongoose.connect(uri);

  const existingByEmail = await User.findOne({ email }).exec();
  if (existingByEmail) {
    console.log(`A user with email ${email} already exists.`);
    await mongoose.disconnect();
    return;
  }

  const existingById = await User.findOne({ studentId }).exec();
  if (existingById) {
    console.log(`A user with studentId ${studentId} already exists.`);
    await mongoose.disconnect();
    return;
  }

  const hash = await bcrypt.hash(password, 10);

  const admin = new User({
    email,
    passwordHash: hash,
    role: 'admin',
    studentId,
    firstName,
    lastName,
    course: ''
  });

  await admin.save();
  console.log(`Created admin user: ${email} (password: ${password})`);

  await mongoose.disconnect();
}

addAdmin().catch(err => { console.error(err); process.exit(1); });
