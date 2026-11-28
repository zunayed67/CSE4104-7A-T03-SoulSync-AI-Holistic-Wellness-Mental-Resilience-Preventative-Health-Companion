import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let server;

/**
 * Start a throwaway MongoDB for one test file and connect Mongoose to it, then build the indexes
 * (the unique and partial indexes are part of the behaviour under test).
 * Set TEST_MONGODB_URI to use an existing MongoDB instead of downloading one (CI service, Docker);
 * set MONGOMS_SYSTEM_BINARY to use a locally installed mongod.
 */
export async function startTestDb() {
  let uri = process.env.TEST_MONGODB_URI;
  if (!uri) {
    server = await MongoMemoryServer.create();
    uri = server.getUri();
  }
  await mongoose.connect(uri, { dbName: `soulsync_test_${process.pid}_${Date.now()}` });
  await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
}

/** Remove all documents between tests (indexes are kept). */
export async function clearTestDb() {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((collection) => collection.deleteMany({})));
}

export async function stopTestDb() {
  if (mongoose.connection.readyState !== 0) {
    if (process.env.TEST_MONGODB_URI) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
  await server?.stop();
  server = undefined;
}
