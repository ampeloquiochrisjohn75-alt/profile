const mongoose = require('mongoose');

async function cleanup() {
  const uri = process.env.MONGO_URI || 'mongodb+srv://labiagalorenzo13_db_user:SssGsIdweezd3glB@studentprofiling.3w5hi5f.mongodb.net/profiling_db?appName=Studentprofiling';

  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const collectionsToRemove = ['authusers', 'students'];
  const existingCollections = await db.listCollections().toArray();
  const existingNames = existingCollections.map((c) => c.name);

  for (const name of collectionsToRemove) {
    if (existingNames.includes(name)) {
      console.log(`Dropping collection: ${name}`);
      await db.dropCollection(name);
    } else {
      console.log(`Collection not found, skipping: ${name}`);
    }
  }

  await mongoose.disconnect();
  console.log('Cleanup complete.');
}

cleanup().catch((err) => {
  console.error('Cleanup failed:', err);
  process.exit(1);
});
