const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { Resend } = require('resend');

module.exports = function (db) {
  const JWT_SECRET = process.env.JWT_SECRET || "ourplace_secret_key";
  const resend = process.env.RESEND_API_KEY
    ? new Resend(process.env.RESEND_API_KEY)
    : null;
  const EMAIL_FROM = process.env.EMAIL_FROM || 'OurPlace <noreply@cop4331c.com>';
  const FRONTEND_BASE_URL = (process.env.FRONTEND_BASE_URL || 'http://localhost:5173').replace(/\/$/, '');

  async function sendEmailOrLog({ to, subject, html, fallbackLink }) {
    if (!resend) {
      console.log(`Email change verification skipped for ${to}; RESEND_API_KEY is not configured.`);
      console.log(`Email change verification link: ${fallbackLink}`);
      return;
    }

    await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject,
      html
    });
  }

  // GET /api/users/household/:householdId
  // incoming: HouseholdID
  // outgoing: results[], error
  router.get('/household/:householdId', async (req, res) => {
    try {
      const householdId = Number(req.params.householdId);

      if (!householdId) {
        return res.status(400).json({ error: 'HouseholdID is required', results: [] });
      }

      const results = await db.collection('Users').find(
        { HouseholdID: householdId },
        {
          projection: {
            _id: 0,
            UserID: 1,
            FirstName: 1,
            LastName: 1,
            Login: 1,
            Email: 1,
            HouseholdID: 1
          }
        }
      ).toArray();

      res.status(200).json({ error: '', results });
    } catch (e) {
      res.status(500).json({ error: e.toString(), results: [] });
    }
  });

  // GET /api/users/:id
  // incoming: UserID
  // outgoing: result, error
  router.get('/:id', async (req, res) => {
    try {
      const userId = Number(req.params.id);

      if (!userId) {
        return res.status(400).json({ error: 'UserID is required' });
      }

      const user = await db.collection('Users').findOne({ UserID: userId });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.status(200).json({
        error: '',
        result: {
          UserID: user.UserID,
          FirstName: user.FirstName,
          LastName: user.LastName,
          Login: user.Login,
          Email: user.Email,
          HouseholdID: user.HouseholdID
        }
      });
    } catch (e) {
      res.status(500).json({ error: e.toString() });
    }
  });

  // PUT /api/users/:id
  // incoming: FirstName, LastName, Email, Login
  // outgoing: error
  router.put('/:id', async (req, res) => {
    try {
      const userId = Number(req.params.id);
      const { FirstName, LastName, Email, Login } = req.body || {};

      if (!userId) {
        return res.status(400).json({ error: 'UserID is required' });
      }

      const user = await db.collection('Users').findOne({ UserID: userId });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (Login !== undefined) {
        const normalizedLogin = String(Login).trim();

        if (!normalizedLogin) {
          return res.status(400).json({ error: 'Username cannot be empty.' });
        }

        const existingUser = await db.collection('Users').findOne({
          Login: normalizedLogin,
          UserID: { $ne: userId }
        });

        if (existingUser) {
          return res.status(400).json({ error: 'Username already taken.' });
        }
      }

      const updateFields = {
        UpdatedAt: new Date().toISOString()
      };

      if (FirstName !== undefined) updateFields.FirstName = String(FirstName).trim();
      if (LastName !== undefined) updateFields.LastName = String(LastName).trim();
      if (Login !== undefined) updateFields.Login = String(Login).trim();

      // EMAIL CHANGE LOGIC
      if (Email !== undefined) {
        const normalizedEmail = String(Email).toLowerCase().trim();
        const currentEmail = String(user.Email || '').toLowerCase().trim();

        if (!normalizedEmail) {
          return res.status(400).json({ error: 'Email cannot be empty' });
        }

        // only if actually changing
        if (normalizedEmail !== currentEmail) {
          const existing = await db.collection('Users').findOne({
            Email: normalizedEmail,
            UserID: { $ne: userId }
          });

          if (existing) {
            return res.status(400).json({ error: 'Email already in use' });
          }

          updateFields.PendingEmail = normalizedEmail;
          updateFields.EmailVerified = false;

          const verifyToken = jwt.sign(
            { UserID: userId, PendingEmail: normalizedEmail },
            JWT_SECRET,
            { expiresIn: '1d' }
          );

          const verifyLink = `${FRONTEND_BASE_URL}/verify-email-change?token=${verifyToken}`;

          await sendEmailOrLog({
            to: normalizedEmail,
            subject: 'Verify your new email',
            fallbackLink: verifyLink,
            html: `
              <h2>Confirm your new email</h2>
              <p>Click below to confirm your email change:</p>
              <a href="${verifyLink}" style="
                display:inline-block;
                padding:12px 20px;
                background:#4CAF50;
                color:white;
                text-decoration:none;
                border-radius:8px;
                font-weight:bold;
              ">Verify Email</a>
            `
          });
        }
      }

      await db.collection('Users').updateOne(
        { UserID: userId },
        { $set: updateFields }
      );

      res.status(200).json({ error: '' });
    } catch (e) {
      res.status(500).json({ error: e.toString() });
    }
  });

  // PUT /api/users/:id/remove-from-household
  // incoming: none
  // outgoing: error
  router.put('/:id/remove-from-household', async (req, res) => {
    try {
      const userId = Number(req.params.id);

      if (!userId) {
        return res.status(400).json({ error: 'UserID is required' });
      }

      const user = await db.collection('Users').findOne({ UserID: userId });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const householdId = user.HouseholdID;

      if (!householdId) {
        return res.status(400).json({ error: 'User is not in a household' });
      }

      const household = await db.collection('Households').findOne({ HouseholdID: householdId });

      await db.collection('Households').updateOne(
        { HouseholdID: householdId },
        { $pull: { MemberIDs: userId } }
      );

      await db.collection('Chores').updateMany(
        { AssignedToUserID: userId, HouseholdID: householdId },
        {
          $set: {
            AssignedToUserID: null,
            Status: 'open',
            CompletedAt: null,
            CompletedByUserID: null,
            UpdatedAt: new Date().toISOString()
          }
        }
      );

      await db.collection('RecurringChores').updateMany(
        { DefaultAssignedUserID: userId, HouseholdID: householdId },
        {
          $set: {
            DefaultAssignedUserID: null,
            UpdatedAt: new Date().toISOString()
          }
        }
      );

      await db.collection('Users').updateOne(
        { UserID: userId },
        {
          $set: {
            HouseholdID: null,
            UpdatedAt: new Date().toISOString()
          }
        }
      );

      const updatedOldHousehold = await db.collection('Households').findOne({ HouseholdID: householdId });

      if (updatedOldHousehold && (!updatedOldHousehold.MemberIDs || updatedOldHousehold.MemberIDs.length === 0)) {
        await db.collection('Households').deleteOne({ HouseholdID: householdId });
        await db.collection('Chores').deleteMany({ HouseholdID: householdId });
        await db.collection('RecurringChores').deleteMany({ HouseholdID: householdId });
      }

      res.status(200).json({ error: '' });
    } catch (e) {
      res.status(500).json({ error: e.toString() });
    }
  });

  // DELETE /api/users/:id
  // incoming: UserID
  // outgoing: error
  router.delete('/:id', async (req, res) => {
    try {
      const userId = Number(req.params.id);

      if (!userId) {
        return res.status(400).json({ error: 'UserID is required' });
      }

      if (!req.user || Number(req.user.UserID) !== userId) {
        return res.status(403).json({ error: 'Not authorized to delete this account' });
      }

      const user = await db.collection('Users').findOne({ UserID: userId });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const householdId = user.HouseholdID;

      if (householdId) {
        await db.collection('Households').updateOne(
          { HouseholdID: householdId },
          { $pull: { MemberIDs: userId } }
        );

        await db.collection('Chores').updateMany(
          { AssignedToUserID: userId, HouseholdID: householdId },
          {
            $set: {
              AssignedToUserID: null,
              Status: 'open',
              CompletedAt: null,
              CompletedByUserID: null,
              UpdatedAt: new Date().toISOString()
            }
          }
        );

        await db.collection('RecurringChores').updateMany(
          { DefaultAssignedUserID: userId, HouseholdID: householdId },
          {
            $set: {
              DefaultAssignedUserID: null,
              UpdatedAt: new Date().toISOString()
            }
          }
        );

        const updatedHousehold = await db.collection('Households').findOne({ HouseholdID: householdId });

        if (updatedHousehold && (!updatedHousehold.MemberIDs || updatedHousehold.MemberIDs.length === 0)) {
          await db.collection('Households').deleteOne({ HouseholdID: householdId });
          await db.collection('Chores').deleteMany({ HouseholdID: householdId });
          await db.collection('RecurringChores').deleteMany({ HouseholdID: householdId });
        }
      }

      await db.collection('Users').deleteOne({ UserID: userId });

      res.status(200).json({ error: '' });
    } catch (e) {
      res.status(500).json({ error: e.toString() });
    }
  });

  return router;
};
