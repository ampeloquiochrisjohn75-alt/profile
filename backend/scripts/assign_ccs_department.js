// Migration script: ensure a 'CCS' Department exists and assign it to all users and faculty
// Usage: from backend folder run `node scripts/assign_ccs_department.js`
require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://labiagalorenzo13_db_user:SssGsIdweezd3glB@studentprofiling.3w5hi5f.mongodb.net/profiling_db?appName=Studentprofiling";

async function main() {
  try {
    await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB');

    const Department = require('../models/Department');
    const User = require('../models/Users');
    const Faculty = require('../models/Faculty');

    // Ensure CCS department exists
    const ccs = await Department.findOneAndUpdate(
      { name: new RegExp('^\\s*CCS\\s*$', 'i') },
      { $setOnInsert: { name: 'CCS', code: 'CCS' } },
      { new: true, upsert: true }
    );
    console.log('CCS department ensured:', ccs._id.toString());

    // Assign CCS department to all users (students and admins) — adjust filter if you want to limit
    const usersResult = await User.updateMany({}, { $set: { department: ccs._id } });
    console.log(`Updated users: matched=${usersResult.matchedCount || usersResult.n || 0}, modified=${usersResult.modifiedCount || usersResult.nModified || 0}`);

    // Update faculty records (faculty.department is stored as a string) to 'CCS'
    if (Faculty) {
      const facultyResult = await Faculty.updateMany({}, { $set: { department: 'CCS' } });
      console.log(`Updated faculty: matched=${facultyResult.matchedCount || facultyResult.n || 0}, modified=${facultyResult.modifiedCount || facultyResult.nModified || 0}`);
    }

    console.log('Migration complete.');
  } catch (err) {
    console.error('Migration failed:', err && err.stack ? err.stack : err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

main();
