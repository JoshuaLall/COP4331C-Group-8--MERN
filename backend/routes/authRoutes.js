const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "ourplace_secret_key";

module.exports = function (db) {

  // POST /api/auth/register
  // incoming: FirstName, LastName, Email, Login, Password
  // outgoing: UserID, error
  router.post('/register', async (req, res) => {
    try {
      const {
        FirstName,
        LastName,
        Email,
        Login,
        Password
      } = req.body;

      if (!FirstName || !Email || !Login || !Password) {
        return res.status(400).json({ error: 'Missing required fields', UserID: -1 });
      }

      const existingUser = await db.collection('Users').findOne({ Login });
      if (existingUser) {
        return res.status(400).json({ error: 'Login already exists', UserID: -1 });
      }

      const lastUser = await db
        .collection('Users')
        .find({})
        .sort({ UserID: -1 })
        .limit(1)
        .toArray();

      const newUserID = lastUser.length > 0 ? lastUser[0].UserID + 1 : 1;

      const hashedPassword = await bcrypt.hash(Password, 10);

      await db.collection('Users').insertOne({
        UserID: newUserID,
        FirstName,
        LastName,
        Email,
        Login,
        Password: hashedPassword,
        HouseholdID: null
      });

      res.status(200).json({ error: '', UserID: newUserID });
    } catch (e) {
      res.status(500).json({ error: e.toString(), UserID: -1 });
    }
  });

  // POST /api/auth/login
  router.post('/login', async (req, res) => {
    try {
      const { Login, Password } = req.body;

      if (!Login || !Password) {
        return res.status(400).json({
          error: 'Login and Password are required',
          UserID: -1,
          HouseholdID: -1
        });
      }

      const user = await db.collection('Users').findOne({ Login });

      if (!user) {
        return res.status(401).json({
          error: 'Invalid login or password',
          UserID: -1,
          HouseholdID: -1
        });
      }

      const passwordMatch = await bcrypt.compare(Password, user.Password);

      if (!passwordMatch) {
        return res.status(401).json({
          error: 'Invalid login or password',
          UserID: -1,
          HouseholdID: -1
        });
      }

      const token = jwt.sign(
        {
          UserID: user.UserID,
          HouseholdID: user.HouseholdID
        },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      res.status(200).json({
        error: '',
        token,
        UserID: user.UserID,
        HouseholdID: user.HouseholdID,
        FirstName: user.FirstName,
        LastName: user.LastName
      });
    } catch (e) {
      res.status(500).json({
        error: e.toString(),
        UserID: -1,
        HouseholdID: -1
      });
    }
  });

  return router;
};