const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();
const nodemailer = require('nodemailer');

const JWT_SECRET = process.env.JWT_SECRET || "ourplace_secret_key";
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

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

      const normalizedEmail = String(Email).toLowerCase().trim();

      const existingLogin = await db.collection('Users').findOne({ Login });
      if (existingLogin) {
        return res.status(400).json({ error: 'Login already exists', UserID: -1 });
      }

      const existingEmail = await db.collection('Users').findOne({ Email: normalizedEmail });
      if (existingEmail) {
        return res.status(400).json({ error: 'Email already exists', UserID: -1 });
      }

      const lastUser = await db
        .collection('Users')
        .find({})
        .sort({ UserID: -1 })
        .limit(1)
        .toArray();

      const newUserID = lastUser.length > 0 ? lastUser[0].UserID + 1 : 1;

      const hashedPassword = await bcrypt.hash(Password, 10);

      // get next household id
      const lastHousehold = await db
        .collection('Households')
        .find({ HouseholdID: { $exists: true } })
        .sort({ HouseholdID: -1 })
        .limit(1)
        .toArray();

      const newHouseholdId = lastHousehold.length > 0
        ? Number(lastHousehold[0].HouseholdID) + 1
        : 1;

      // generate invite code
      const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

      // create household FIRST
      await db.collection('Households').insertOne({
        HouseholdID: newHouseholdId,
        HouseholdName: `${FirstName}'s Household`,
        MemberIDs: [newUserID],
        InviteCode: inviteCode,
        CreatedAt: new Date().toISOString()
      });

      // create user WITH household
      await db.collection('Users').insertOne({
        UserID: newUserID,
        FirstName,
        LastName,
        Email: normalizedEmail,
        Login,
        Password: hashedPassword,
        HouseholdID: newHouseholdId,
        EmailVerified: false,
        UpdatedAt: new Date().toISOString()
      });

      const verifyToken = jwt.sign(
        { UserID: newUserID },
        JWT_SECRET,
        { expiresIn: '1d' }
      );

      const verifyLink = `http://localhost:5173/verify-email?token=${verifyToken}`;

      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: normalizedEmail,
        subject: 'Verify your OurPlace account',
        html: `
          <h2>Welcome to OurPlace!</h2>
          <p>Please verify your email to activate your account.</p>
          <a href="${verifyLink}" style="
            display:inline-block;
            padding:12px 20px;
            background:#4CAF50;
            color:white;
            text-decoration:none;
            border-radius:8px;
            font-weight:bold;
          ">Verify Email</a>
          <p style="margin-top:16px;">This link expires in 24 hours.</p>
        `
      });

      res.status(200).json({ error: '', UserID: newUserID });
    } catch (e) {
      res.status(500).json({ error: e.toString(), UserID: -1 });
    }
  });

  // POST /api/auth/verify-email
  router.post('/verify-email', async (req, res) => {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({ error: 'Missing token' });
      }

      let decoded;
      try {
        decoded = jwt.verify(token, JWT_SECRET);
      } catch {
        return res.status(400).json({ error: 'Invalid or expired token' });
      }

      const result = await db.collection('Users').updateOne(
        { UserID: decoded.UserID },
        {
          $set: {
            EmailVerified: true,
            UpdatedAt: new Date().toISOString()
          }
        }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.status(200).json({ error: '' });
    } catch (e) {
      res.status(500).json({ error: e.toString() });
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

      if (!user.EmailVerified) {
        return res.status(401).json({
          error: 'Please verify your email first',
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

  // POST /api/auth/forgot-password
  router.post('/forgot-password', async (req, res) => {
    try {
      const { Email } = req.body;

      if (!Email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      const normalizedEmail = String(Email).toLowerCase().trim();

      const user = await db.collection('Users').findOne({ Email: normalizedEmail });

      // don't reveal whether email exists
      if (!user) {
        return res.status(200).json({ error: '' });
      }

      const resetToken = jwt.sign(
        { UserID: user.UserID },
        JWT_SECRET,
        { expiresIn: '15m' }
      );

      const resetLink = `http://localhost:5173/reset-password?token=${resetToken}`;

      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: normalizedEmail,
        subject: 'Reset your OurPlace password',
        html: `
          <h2>Password Reset</h2>
          <p>You requested a password reset for your OurPlace account.</p>
          <p>Click the button below to reset your password:</p>
          <a href="${resetLink}" style="
            display:inline-block;
            padding:12px 20px;
            background:#8B3A3A;
            color:white;
            text-decoration:none;
            border-radius:8px;
            font-weight:bold;
          ">Reset Password</a>
          <p style="margin-top:16px;">This link expires in 15 minutes.</p>
        `
      });

      res.status(200).json({ error: '' });
    } catch (e) {
      res.status(500).json({ error: e.toString() });
    }
  });

  // POST /api/auth/reset-password
  router.post('/reset-password', async (req, res) => {
    try {
      const { ResetToken, Password } = req.body;

      if (!ResetToken || !Password) {
        return res.status(400).json({ error: 'ResetToken and Password are required' });
      }

      let decoded;
      try {
        decoded = jwt.verify(ResetToken, JWT_SECRET);
      } catch (err) {
        return res.status(400).json({ error: 'Invalid or expired reset token' });
      }

      const hashedPassword = await bcrypt.hash(Password, 10);

      const result = await db.collection('Users').updateOne(
        { UserID: decoded.UserID },
        {
          $set: {
            Password: hashedPassword,
            UpdatedAt: new Date().toISOString()
          }
        }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.status(200).json({ error: '' });
    } catch (e) {
      res.status(500).json({ error: e.toString() });
    }
  });

  return router;
};