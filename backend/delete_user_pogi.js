const mongoose = require('mongoose');
const User = require('./models/Users');

async function run() {
  const uri = process.env.MONGO_URI || 'mongodb+srv://labiagalorenzo13_db_user:SssGsIdweezd3glB@studentprofiling.3w5hi5f.mongodb.net/profiling_db?appName=Studentprofiling';
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to MongoDB');

  const query = { $or: [ { studentId: 'pogi123' }, { email: 'pogi123' }, { firstName: 'pogi123' }, { lastName: 'pogi123' } ] };
  try {
    const res = await User.deleteMany(query);
    console.log('Delete result:', res);
    if (res.deletedCount && res.deletedCount > 0) {
      console.log(`Removed ${res.deletedCount} user(s) matching pogi123`);
    } else {
      console.log('No users matched pogi123');
    }
  } catch (err) {
    console.error('Delete failed', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected');
  }
}

run().catch((e) => { console.error(e); process.exit(1); });
