const express = require('express');
const router = express.Router();

module.exports = function (db) {

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
  const jwt = require('jsonwebtoken');
  const nodemailer = require('nodemailer');

  const JWT_SECRET = process.env.JWT_SECRET || "ourplace_secret_key";

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

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

      const updateFields = {
        UpdatedAt: new Date().toISOString()
      };

      if (FirstName !== undefined) updateFields.FirstName = FirstName;
      if (LastName !== undefined) updateFields.LastName = LastName;
      if (Login !== undefined) updateFields.Login = Login;

      // 🔥 EMAIL CHANGE LOGIC
      if (Email !== undefined) {
        const normalizedEmail = String(Email).toLowerCase().trim();

        // only if actually changing
        if (normalizedEmail !== user.Email) {

          // check if email already used
          const existing = await db.collection('Users').findOne({ Email: normalizedEmail });
          if (existing) {
            return res.status(400).json({ error: 'Email already in use' });
          }

          // store pending email
          updateFields.PendingEmail = normalizedEmail;
          updateFields.EmailVerified = false;

          // create token
          const verifyToken = jwt.sign(
            { UserID: userId, PendingEmail: normalizedEmail },
            JWT_SECRET,
            { expiresIn: '1d' }
          );

          const verifyLink = `http://localhost:5173/verify-email-change?token=${verifyToken}`;

          // send email
          await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: normalizedEmail,
            subject: 'Verify your new email',
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

  // Verify email change
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

      await db.collection('Users').updateOne(
        { UserID: decoded.UserID },
        {
          $set: {
            Email: decoded.PendingEmail,
            PendingEmail: null,
            EmailVerified: true,
            UpdatedAt: new Date().toISOString()
          }
        }
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

      if (household && household.MemberIDs.length === 1) {
        return res.status(400).json({ error: 'Cannot leave your own household' });
      }

      await db.collection('Households').updateOne(
        { HouseholdID: householdId },
        { $pull: { MemberIDs: userId } }
      );

      const lastHousehold = await db
        .collection('Households')
        .find({ HouseholdID: { $exists: true } })
        .sort({ HouseholdID: -1 })
        .limit(1)
        .toArray();

      const newHouseholdId = lastHousehold.length > 0
        ? Number(lastHousehold[0].HouseholdID) + 1
        : 1;

      const newInviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

      await db.collection('Households').insertOne({
        HouseholdID: newHouseholdId,
        HouseholdName: `${user.FirstName || user.Login}'s Household`,
        MemberIDs: [userId],
        InviteCode: newInviteCode,
        CreatedAt: new Date().toISOString()
      });

      await db.collection('Users').updateOne(
        { UserID: userId },
        {
          $set: {
            HouseholdID: newHouseholdId,
            UpdatedAt: new Date().toISOString()
          }
        }
      );

      const oldHousehold = await db.collection('Households').findOne({ HouseholdID: householdId });

      if (oldHousehold && (!oldHousehold.MemberIDs || oldHousehold.MemberIDs.length === 0)) {
        await db.collection('Households').deleteOne({ HouseholdID: householdId });

        await db.collection('Chores').deleteMany({ HouseholdID: householdId });
        await db.collection('RecurringChores').deleteMany({ HouseholdID: householdId });
      }

      await db.collection('Chores').updateMany(
        { AssignedToUserID: userId, HouseholdID: householdId },
        {
          $set: {
            AssignedToUserID: null,
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

      res.status(200).json({ error: '' });
    } catch (e) {
      res.status(500).json({ error: e.toString() });
    }
  });

  return router;
};