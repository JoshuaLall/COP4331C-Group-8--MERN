import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient } from 'mongodb';

let mongoServer;
let mongoClient;
let serverClient;
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
  const { startServer, getClient, getDb } = await import('../server.js');
  await startServer();

  // Get references to the client from the server
  serverClient = getClient();
  db = getDb();

  console.log('✅ Test database ready');
});

// Runs once after ALL tests
afterAll(async () => {
  console.log('🧹 Cleaning up test database...');

  try {
    if (serverClient) await serverClient.close();
    if (mongoServer) await mongoServer.stop();
  } catch (err) {
    console.error('Error during cleanup:', err);
  }

  console.log('✅ Cleanup complete');
});

// Optional: Clear all data between test files
afterEach(async () => {
  if (db) {
    try {
      const collections = await db.listCollections().toArray();
      for (const collection of collections) {
        await db.collection(collection.name).deleteMany({});
      }
    } catch (err) {
      console.error('Error clearing collections:', err);
    }
  }
});