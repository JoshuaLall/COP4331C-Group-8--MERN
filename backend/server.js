import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';

// Import the middleware creator function
import createAuthMiddleware from './routes/middleware.js';
// Import routes
import authRoutesModule from './routes/authRoutes.js';
import userRoutesModule from './routes/userRoutes.js';
import householdRoutesModule from './routes/householdRoutes.js';
import choreRoutesModule from './routes/choreRoutes.js';
import recurringChoreRoutesModule from './routes/recurringChoreRoutes.js';

const app = express();
app.disable('etag');
app.use(cors());
app.use(express.json());
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

const url = process.env.MONGODB_URI || 'mongodb+srv://Admin:12345678Ab@cluster0.tt0dzm0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const useTls = url.startsWith('mongodb+srv://') || url.includes('.mongodb.net');
const client = new MongoClient(url, useTls ? { tls: true } : {});
let db;

async function ensureDatabaseIndexes(database) {
  await Promise.all([
    database.collection('Chores').createIndexes([
      { key: { ChoreID: 1 } },
      { key: { HouseholdID: 1 } },
      { key: { HouseholdID: 1, Status: 1, AssignedToUserID: 1 } },
      { key: { HouseholdID: 1, CompletedByUserID: 1, Status: 1, CompletedAt: -1 } },
      { key: { RecurringTemplateID: 1, HouseholdID: 1, Status: 1 } }
    ]),
    database.collection('RecurringChores').createIndexes([
      { key: { RecurringTemplateID: 1 } },
      { key: { HouseholdID: 1 } },
      { key: { HouseholdID: 1, IsActive: 1 } }
    ]),
    database.collection('Users').createIndexes([
      { key: { UserID: 1 } },
      { key: { HouseholdID: 1 } },
      { key: { Email: 1 } },
      { key: { Login: 1 } }
    ]),
    database.collection('Households').createIndexes([
      { key: { HouseholdID: 1 } },
      { key: { InviteCode: 1 } }
    ])
  ]);
}

async function warmDatabase(database, reason = 'scheduled') {
  const start = Date.now();

  try {
    await database.command({ ping: 1 });
    await Promise.all([
      database.collection('Users').findOne({}, { projection: { _id: 1 } }),
      database.collection('Chores').findOne({}, { projection: { _id: 1 } }),
      database.collection('RecurringChores').findOne({}, { projection: { _id: 1 } }),
      database.collection('Households').findOne({}, { projection: { _id: 1 } })
    ]);

    const elapsed = Date.now() - start;
    if (elapsed > 500) {
      console.log(`[timing] Mongo warm-up ${reason} total=${elapsed}ms`);
    }
  } catch (e) {
    console.warn(`Mongo warm-up ${reason} failed:`, e.toString());
  }
}

function startDatabaseWarmup(database) {
  warmDatabase(database, 'startup');

  const interval = setInterval(() => {
    warmDatabase(database);
  }, 4 * 60 * 1000);

  if (typeof interval.unref === 'function') {
    interval.unref();
  }
}

// Simple routes
app.get('/api/ping', (req, res) => {
  res.status(200).json({ message: 'Hello World' });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.post('/api/testinsert', async (req, res) => {
  try {
    const result = await db.collection('Test').insertOne(req.body);
    res.status(200).json({ error: '', result });
  } catch (e) {
    res.status(500).json({ error: e.toString() });
  }
});

app.get('/api/testread', async (req, res) => {
  try {
    const results = await db.collection('Test').find({}).toArray();
    res.status(200).json({ error: '', results });
  } catch (e) {
    res.status(500).json({ error: e.toString() });
  }
});

async function startServer() {
  try {
    await client.connect();
    db = client.db('ChoreApp');
    console.log('MongoDB connected');
    await ensureDatabaseIndexes(db);
    console.log('Database indexes ready');
    startDatabaseWarmup(db);

    // NOW create authenticateToken with db
    const authenticateToken = createAuthMiddleware(db);

    // Call route functions
    const authRoutes = authRoutesModule(db, authenticateToken);
    const userRoutes = userRoutesModule(db, authenticateToken);
    const householdRoutes = householdRoutesModule(db, authenticateToken);
    const choreRoutes = choreRoutesModule(db, authenticateToken);
    const recurringChoreRoutes = recurringChoreRoutesModule(db, authenticateToken);

    // Register API Routes
    app.use('/api/auth', authRoutes);
    app.use('/api/users', userRoutes);
    app.use('/api/households', householdRoutes);
    app.use('/api/chores', choreRoutes);
    app.use('/api/recurring-chores', recurringChoreRoutes);

    // Only start server if not in test mode
    if (process.env.NODE_ENV !== 'test') {
      app.listen(5000, () => {
        console.log('Server running on port 5000');
      });
    }
  } catch (err) {
    console.error('Startup error:', err);
  }
}

// Only auto-call startServer if NOT in test mode
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;
export { startServer };
export function getDb() {
  return db;
}
export function getClient() {
  return client;
}
