const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');
const app = express();
app.use(cors());
app.use(express.json());

const url = 'mongodb+srv://Admin:12345678Ab@cluster0.tt0dzm0.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const client = new MongoClient(url);
let db;

//  Routes registered FIRST, outside async function
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
    db = client.db('mernproject');
    console.log('MongoDB connected');
    app.listen(5000, () => {
      console.log('Server running on port 5000');
    });
  } catch (err) {
    console.error('Startup error:', err);
  }
}

startServer();
