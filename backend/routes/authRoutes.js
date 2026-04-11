const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();
const { Resend } = require('resend');

const JWT_SECRET = process.env.JWT_SECRET || "ourplace_secret_key";
const resend = new Resend(process.env.RESEND_API_KEY);

function validatePassword(password) {
  if (typeof password !== 'string' || password.length === 0) {
    return 'Password is required';
  }
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (password.length > 72) return 'Password must be 72 characters or fewer.';
  if (/\s/.test(password)) return 'Password cannot contain spaces.';
  if (!/[a-z]/.test(password)) return 'Password must include at least one lowercase letter.';
  if (!/[A-Z]/.test(password)) return 'Password must include at least one uppercase letter.';
  if (!/\d/.test(password)) return 'Password must include at least one number.';
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password must include at least one special character.';
  return '';
}

module.exports = function (db, authenticateToken) {

  // REGISTER
  router.post('/register', async (req, res) => {
    try {
      const { FirstName, LastName, Email, Login, Password, InviteCode } = req.body;

      if (!FirstName || !Email || !Login || !Password) {
        return res.status(400).json({ error: 'Missing required fields', UserID: -1 });
      }

      const passwordError = validatePassword(Password);
      if (passwordError) {
        return res.status(400).json({ error: passwordError, UserID: -1 });
      }

      const normalizedEmail = String(Email).toLowerCase().trim();
      const normalizedLogin = String(Login).trim();

      let invitedHousehold = null;
      if (InviteCode) {
        const normalizedInviteCode = String(InviteCode).trim().toUpperCase();
        invitedHousehold = await db.collection('Households').findOne({ InviteCode: normalizedInviteCode });

        if (!invitedHousehold) {
          return res.status(400).json({ error: 'Invalid invite code', UserID: -1 });
        }
      }

      const existingLogin = await db.collection('Users').findOne({ Login: normalizedLogin });
      if (existingLogin) {
        return res.status(400).json({ error: 'Login already exists', UserID: -1 });
      }

      const existingEmail = await db.collection('Users').findOne({ Email: normalizedEmail });
      if (existingEmail) {
        return res.status(400).json({ error: 'Email already exists', UserID: -1 });
      }

      const lastUser = await db.collection('Users').find().sort({ UserID: -1 }).limit(1).toArray();
      const newUserID = lastUser.length > 0 ? lastUser[0].UserID + 1 : 1;

      const hashedPassword = await bcrypt.hash(Password, 10);

      let finalHouseholdId;

      if (invitedHousehold) {
        finalHouseholdId = invitedHousehold.HouseholdID;
      } else {
        const lastHousehold = await db.collection('Households')
          .find({ HouseholdID: { $exists: true } })
          .sort({ HouseholdID: -1 })
          .limit(1)
          .toArray();

        const newHouseholdId = lastHousehold.length > 0
          ? Number(lastHousehold[0].HouseholdID) + 1
          : 1;

        const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

        await db.collection('Households').insertOne({
          HouseholdID: newHouseholdId,
          HouseholdName: `${FirstName}'s Household`,
          MemberIDs: [newUserID],
          InviteCode: inviteCode,
          CreatedAt: new Date().toISOString()
        });

        finalHouseholdId = newHouseholdId;
      }

      await db.collection('Users').insertOne({
        UserID: newUserID,
        FirstName: String(FirstName).trim(),
        LastName: LastName ? String(LastName).trim() : '',
        Email: normalizedEmail,
        Login: normalizedLogin,
        Password: hashedPassword,
        HouseholdID: finalHouseholdId,
        EmailVerified: false,
        UpdatedAt: new Date().toISOString()
      });

      if (invitedHousehold) {
        await db.collection('Households').updateOne(
          { HouseholdID: finalHouseholdId },
          { $addToSet: { MemberIDs: newUserID } }
        );
      }

      const verifyToken = jwt.sign({ UserID: newUserID }, JWT_SECRET, { expiresIn: '1d' });
      const verifyLink = `https://cop4331c.com/verify-email?token=${verifyToken}`;

      try {
        await resend.emails.send({
          from: 'onboarding@resend.dev',
          to: normalizedEmail,
          subject: 'Verify your OurPlace account',
          html: `<h2>Welcome to OurPlace!</h2>
                 <p>Please verify your email.</p>
                 <a href="${verifyLink}">Verify Email</a>`
        });
      } catch (e) {
        console.log("EMAIL FAILED:", e);
      }

      res.status(200).json({ error: '', UserID: newUserID });

    } catch (e) {
      console.log("REGISTER ERROR:", e);
      res.status(500).json({ error: e.toString(), UserID: -1 });
    }
  });

  // LOGIN
  router.post('/login', async (req, res) => {
    try {
      const { Login, Password } = req.body;

      if (!Login || !Password) {
        return res.status(400).json({ error: 'Login and Password required', UserID: -1 });
      }

      const normalizedLogin = String(Login).trim();
      const user = await db.collection('Users').findOne({ Login: normalizedLogin });

      if (!user || !(await bcrypt.compare(Password, user.Password))) {
        return res.status(401).json({ error: 'Invalid login', UserID: -1 });
      }

      const token = jwt.sign(
        { UserID: user.UserID, HouseholdID: user.HouseholdID },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      res.status(200).json({
        error: '',
        UserID: user.UserID,
        HouseholdID: user.HouseholdID,
        token
      });

    } catch (e) {
      res.status(500).json({ error: e.toString() });
    }
  });

  // CHANGE PASSWORD
  router.post('/change-password', authenticateToken, async (req, res) => {
    try {
      const { CurrentPassword, NewPassword } = req.body;

      if (!CurrentPassword || !NewPassword) {
        return res.status(400).json({ error: 'CurrentPassword and NewPassword are required' });
      }

      const passwordError = validatePassword(NewPassword);
      if (passwordError) {
        return res.status(400).json({ error: passwordError });
      }

      const user = await db.collection('Users').findOne({ UserID: req.user.UserID });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const isValid = await bcrypt.compare(CurrentPassword, user.Password);
      if (!isValid) {
        return res.status(400).json({ error: 'Incorrect current password' });
      }

      const hashedPassword = await bcrypt.hash(NewPassword, 10);

      await db.collection('Users').updateOne(
        { UserID: req.user.UserID },
        { $set: { Password: hashedPassword, UpdatedAt: new Date().toISOString() } }
      );

      res.status(200).json({ error: '' });

    } catch (err) {
      console.log("CHANGE PASSWORD ERROR:", err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // FORGOT PASSWORD
  router.post('/forgot-password', async (req, res) => {
    try {
      const { Email } = req.body;

      if (!Email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      const normalizedEmail = String(Email).toLowerCase().trim();
      const user = await db.collection('Users').findOne({ Email: normalizedEmail });

      if (!user) {
        return res.status(200).json({ error: '' });
      }

      const resetToken = jwt.sign({ UserID: user.UserID }, JWT_SECRET, { expiresIn: '15m' });

      try {
        await resend.emails.send({
          from: 'onboarding@resend.dev',
          to: user.Email,
          subject: 'Reset Password',
          html: `<a href="https://cop4331c.com/reset-password?token=${resetToken}">Reset Password</a>`
        });
      } catch (err) {
        console.log("RESET EMAIL FAILED:", err);
      }

      res.status(200).json({ error: '' });

    } catch (err) {
      console.log("FORGOT PASSWORD ERROR:", err);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // RESET PASSWORD
  router.post('/reset-password', async (req, res) => {
    try {
      const { ResetToken, Password } = req.body;

      if (!ResetToken || !Password) {
        return res.status(400).json({ error: 'ResetToken and Password are required' });
      }

      const passwordError = validatePassword(Password);
      if (passwordError) {
        return res.status(400).json({ error: passwordError });
      }

      const decoded = jwt.verify(ResetToken, JWT_SECRET);
      const hashedPassword = await bcrypt.hash(Password, 10);

      await db.collection('Users').updateOne(
        { UserID: decoded.UserID },
        { $set: { Password: hashedPassword, UpdatedAt: new Date().toISOString() } }
      );

      res.status(200).json({ error: '' });

    } catch (e) {
      console.log("RESET PASSWORD ERROR:", e);
      res.status(500).json({ error: e.toString() });
    }
  });

  return router;
};