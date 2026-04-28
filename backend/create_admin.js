const mongoose = require('mongoose');
const User = require('./models/Users');
const bcrypt = require('bcryptjs');

const uri = process.env.MONGO_URI || 'mongodb+srv://labiagalorenzo13_db_user:SssGsIdweezd3glB@studentprofiling.3w5hi5f.mongodb.net/profiling_db?appName=Studentprofiling';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin2@example.com';
const ADMIN_PW = process.env.ADMIN_PW || 'Admin123!';
const ADMIN_ID = process.env.ADMIN_ID || 'ADMIN2';
const ADMIN_FIRST = process.env.ADMIN_FIRST || 'Site';
const ADMIN_LAST = process.env.ADMIN_LAST || 'Admin';

async function run(){
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');
  const hash = await bcrypt.hash(ADMIN_PW, 10);
  const update = { $set: { email: ADMIN_EMAIL, passwordHash: hash, role: 'admin', studentId: ADMIN_ID, firstName: ADMIN_FIRST, lastName: ADMIN_LAST } };
  const opts = { upsert: true };
  try{
    await User.findOneAndUpdate({ email: ADMIN_EMAIL }, update, opts);
    console.log(`Created/updated admin: ${ADMIN_EMAIL} (id: ${ADMIN_ID}) password: ${ADMIN_PW}`);
  }catch(err){
    console.error('Error creating admin:', err && err.message ? err.message : err);
  }finally{
    await mongoose.disconnect();
  }
}

run().catch(err => { console.error(err); process.exit(1); });
