import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient } from 'mongodb';

let mongoServer;
let client;
let db;

// Runs once before ALL tests
beforeAll(async () => {
  console.log('Starting test database...');
  
  // Create in-memory MongoDB instance
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  // Set environment variable so app connects to test DB
  process.env.MONGODB_URI = mongoUri;
  process.env.NODE_ENV = 'test';
  
  // NOW call startServer() so the server connects to our test database
  const { startServer } = await import('../server.js');
  await startServer();
  
  console.log('✅ Test database ready');
});

// Runs once after ALL tests
afterAll(async () => {
  console.log('🧹 Cleaning up test database...');
  
  if (client) await client.close();
  if (mongoServer) await mongoServer.stop();
  
  console.log('✅ Cleanup complete');
});

// Optional: Clear all data between test files
afterEach(async () => {
  if (db) {
    const collections = await db.listCollections().toArray();
    for (const collection of collections) {
      await db.collection(collection.name).deleteMany({});
    }
  }
});