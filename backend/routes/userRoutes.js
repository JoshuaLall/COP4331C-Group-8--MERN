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
  router.put('/:id', async (req, res) => {
    try {
      const userId = Number(req.params.id);
      const { FirstName, LastName, Email, Login } = req.body || {};

      if (!userId) {
        return res.status(400).json({ error: 'UserID is required' });
      }

      const updateFields = {
        UpdatedAt: new Date().toISOString()
      };

      if (FirstName !== undefined) updateFields.FirstName = FirstName;
      if (LastName !== undefined) updateFields.LastName = LastName;
      if (Email !== undefined) updateFields.Email = String(Email).toLowerCase();
      if (Login !== undefined) updateFields.Login = Login;

      const result = await db.collection('Users').updateOne(
        { UserID: userId },
        { $set: updateFields }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

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

      await db.collection('Users').updateOne(
        { UserID: userId },
        {
          $set: {
            HouseholdID: null,
            UpdatedAt: new Date().toISOString()
          }
        }
      );

      await db.collection('Households').updateOne(
        { HouseholdID: householdId },
        { $pull: { MemberIDs: userId } }
      );

      const household = await db.collection('Households').findOne({ HouseholdID: householdId });

      if (household && (!household.MemberIDs || household.MemberIDs.length === 0)) {
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
