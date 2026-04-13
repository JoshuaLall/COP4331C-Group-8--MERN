import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Resend } from 'resend';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "ourplace_secret_key";
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;
const EMAIL_FROM = process.env.EMAIL_FROM || 'OurPlace <noreply@cop4331c.com>';
const FRONTEND_BASE_URL = (process.env.FRONTEND_BASE_URL || 'http://localhost:5173').replace(/\/$/, '');

async function sendEmailOrLog({ to, subject, html, fallbackLabel, fallbackLink }) {
  if (!resend) {
    console.log(`${fallbackLabel} skipped for ${to}; RESEND_API_KEY is not configured.`);
    console.log(`${fallbackLabel} link: ${fallbackLink}`);
    return;
  }

  await resend.emails.send({
    from: EMAIL_FROM,
    to,
    subject,
    html
  });
}

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

export default function (db, authenticateToken) {

  // REGISTER
  router.post('/register', async (req, res) => {
    try {
      const { FirstName, LastName, HouseholdName, Email, Login, Password, InviteCode } = req.body;

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

      if (!invitedHousehold && !String(HouseholdName || '').trim()) {
        return res.status(400).json({ error: 'Household name is required', UserID: -1 });
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
        const finalHouseholdName = String(HouseholdName).trim();

        await db.collection('Households').insertOne({
          HouseholdID: newHouseholdId,
          HouseholdName: finalHouseholdName,
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
      const verifyLink = `${FRONTEND_BASE_URL}/verify-email?token=${verifyToken}`;

      try {
        await sendEmailOrLog({
          to: normalizedEmail,
          subject: 'Verify your OurPlace account',
          fallbackLabel: 'Verification email',
          fallbackLink: verifyLink,
          html: `
            <h2>Welcome to OurPlace!</h2>
            <p>Hi ${FirstName},</p>
            <p>Thank you for registering! Please verify your email address to complete your account setup.</p>
            <p><a href="${verifyLink}" style="background-color: #4CAF50; color: white; padding: 14px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">Verify Email</a></p>
            <p>Or copy and paste this link into your browser:</p>
            <p>${verifyLink}</p>
            <p>This link will expire in 24 hours.</p>
            <p>If you didn't create an account, please ignore this email.</p>
          `
        });
        console.log(`✓ Verification email sent to ${normalizedEmail}`);
      } catch (e) {
        console.error("EMAIL FAILED:", e);
      }

      res.status(200).json({ error: '', UserID: newUserID });

    } catch (e) {
      console.error("REGISTER ERROR:", e);
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

      if (!user) {
        return res.status(404).json({ error: 'Account does not exist', UserID: -1 });
      }

      const passwordMatches = await bcrypt.compare(Password, user.Password);
      if (!passwordMatches) {
        return res.status(401).json({ error: 'Incorrect password', UserID: -1 });
      }

      if (!user.EmailVerified) {
        return res.status(403).json({
          error: 'Email not verified. Please verify your email before logging in.',
          UserID: -1
        });
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

  // VERIFY EMAIL
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
          },
          $unset: {
            PendingEmail: ""
          }
        }
      );

      if (!result.matchedCount) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.status(200).json({ error: '' });
    } catch (e) {
      console.error("VERIFY EMAIL ERROR:", e);
      res.status(500).json({ error: e.toString() });
    }
  });

  // VERIFY EMAIL CHANGE
  router.post('/verify-email-change', async (req, res) => {
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

      const user = await db.collection('Users').findOne({ UserID: decoded.UserID });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (!decoded.PendingEmail || user.PendingEmail !== decoded.PendingEmail) {
        return res.status(400).json({ error: 'This email change request is no longer valid.' });
      }

      const existing = await db.collection('Users').findOne({
        Email: decoded.PendingEmail,
        UserID: { $ne: decoded.UserID }
      });

      if (existing) {
        return res.status(400).json({ error: 'That email is already in use.' });
      }

      await db.collection('Users').updateOne(
        { UserID: decoded.UserID },
        {
          $set: {
            Email: decoded.PendingEmail,
            EmailVerified: true,
            UpdatedAt: new Date().toISOString()
          },
          $unset: {
            PendingEmail: ""
          }
        }
      );

      res.status(200).json({ error: '' });
    } catch (e) {
      console.error("VERIFY EMAIL CHANGE ERROR:", e);
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
      console.error("CHANGE PASSWORD ERROR:", err);
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
      const resetLink = `${FRONTEND_BASE_URL}/reset-password?token=${resetToken}`;

      try {
        await sendEmailOrLog({
          to: user.Email,
          subject: 'Reset Your OurPlace Password',
          fallbackLabel: 'Password reset email',
          fallbackLink: resetLink,
          html: `
            <h2>Password Reset Request</h2>
            <p>Hi ${user.FirstName},</p>
            <p>We received a request to reset your password. Click the button below to reset it:</p>
            <p><a href="${resetLink}" style="background-color: #4CAF50; color: white; padding: 14px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">Reset Password</a></p>
            <p>Or copy and paste this link into your browser:</p>
            <p>${resetLink}</p>
            <p>This link will expire in 15 minutes.</p>
            <p>If you didn't request a password reset, please ignore this email.</p>
          `
        });
        console.log(`✓ Password reset email sent to ${user.Email}`);
      } catch (err) {
        console.error("RESET EMAIL FAILED:", err);
      }

      res.status(200).json({ error: '' });

    } catch (err) {
      console.error("FORGOT PASSWORD ERROR:", err);
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
      console.error("RESET PASSWORD ERROR:", e);
      res.status(500).json({ error: e.toString() });
    }
  });

  return router;
};
