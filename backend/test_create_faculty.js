require('dotenv').config();
const mongoose = require('mongoose');
const Faculty = require('./models/Faculty');

async function main(){
  try {
    const uri = process.env.MONGO_URI;
    await mongoose.connect(uri);
    const ts = Date.now();
    const f = new Faculty({
      firstName: 'Auto',
      lastName: 'Faculty' + ts,
      email: `auto.faculty.${ts}@example.com`,
      title: 'Lecturer'
    });
    await f.save();
    console.log('Created faculty:', { id: f._id, employeeId: f.employeeId, department: f.department });
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Test insert failed', err && err.stack ? err.stack : err);
    try { await mongoose.disconnect(); } catch(e){}
    process.exit(1);
  }
}

main();
