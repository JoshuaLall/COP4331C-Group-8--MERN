import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';

// Import routes and middleware at the top (STATIC imports)
import authenticateToken from './routes/authenticateToken.js';
import authRoutesModule from './routes/authRoutes.js';
import userRoutesModule from './routes/userRoutes.js';
import householdRoutesModule from './routes/householdRoutes.js';
import choreRoutesModule from './routes/choreRoutes.js';
import recurringChoreRoutesModule from './routes/recurringChoreRoutes.js';

const app = express();
app.use(cors());
app.use(express.json());

const url = 'mongodb+srv://Admin:12345678Ab@cluster0.tt0dzm0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const client = new MongoClient(url);
let db;

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

    // Call route functions (NO dynamic imports here)
    const authRoutes = authRoutesModule(db, authenticateToken);
    const userRoutes = userRoutesModule(db);
    const householdRoutes = householdRoutesModule(db);
    const choreRoutes = choreRoutesModule(db);
    const recurringChoreRoutes = recurringChoreRoutesModule(db);

    // Register API Routes
    app.use('/api/auth', authRoutes);
    app.use('/api/users', authenticateToken, userRoutes);
    app.use('/api/households', authenticateToken, householdRoutes);
    app.use('/api/chores', authenticateToken, choreRoutes);
    app.use('/api/recurring-chores', authenticateToken, recurringChoreRoutes);

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
export { startServer, db };