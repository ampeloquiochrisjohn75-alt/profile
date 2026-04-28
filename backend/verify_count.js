const mongoose = require('mongoose');
const User = require('./models/Users');

const uri = process.env.MONGO_URI || 'mongodb+srv://labiagalorenzo13_db_user:SssGsIdweezd3glB@studentprofiling.3w5hi5f.mongodb.net/profiling_db?appName=Studentprofiling';

async function run(){
  try{
    await mongoose.connect(uri);
    const count = await User.countDocuments({ role: 'student' });
    console.log('STUDENT_COUNT:' + count);
    await mongoose.disconnect();
  }catch(e){
    console.error('ERR', e.message || e);
    process.exit(1);
  }
}

run();
