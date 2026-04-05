const express = require('express');
const router = express.Router();

module.exports = function(db) {

  // POST /api/chores
  // incoming: HouseholdID, Title, Description, DueDate, *Priority, CreatedByUserID
  // outgoing: ChoreID, error

  // GET /api/chores
  // incoming: HouseholdID
  // outgoing: results[], error
  
  // GET /api/chores/open
  // incoming: HouseholdID
  // outgoing: results[], error

  // returns chores that are NOT assigned yet
  router.get('/open', async (req, res) => {
    try {
      const results = await db.collection('Chores').find({
        AssignedToUserID: null
      }).toArray();

      res.status(200).json({ error: "", results });
    } catch (e) {
      res.status(500).json({ error: e.toString() });
    }
  });

  // GET /api/chores/assigned
  // incoming: HouseholdID
  // outgoing: results[], error

  // GET /api/chores/my
  // incoming: UserID
  // outgoing: results[], error

  router.get('/my', async (req, res) => {

    // 1: get UserID from query params
    // Example request: /api/chores/my?UserID=1
    const userId = parseInt(req.query.UserID);

    // 2: basic validation
    // if no userId is provided -> send error
    if (!userId) {
      return res.status(400).json({ error: "UserID is required" });
    }

    try {
      // 3: query MongoDB
      // find all chores where AssignedToUserID matches this user
      const results = await db.collection('Chores').find({
        AssignedToUserID: userId,
        Status: { $ne: 'completed' }
      }).toArray();

      // 4: send results back to frontend
      // frontend will use this to display "My Chores"
      res.status(200).json({
        error: "",
        results: results
      });

    } catch (e) {
      // 5: handle errors (server/db issues)
      res.status(500).json({
        error: e.toString()
      });
    }
  });

  // GET /api/chores/completed
  // incoming: HouseholdID
  // outgoing: results[], error
  // Purpose: return chores completed by the logged-in user
  router.get('/completed', async (req, res) => {

    // get UserID from query params
    // example: /api/chores/completed?UserID=1
    const userId = parseInt(req.query.UserID);

    // make sure UserID was provided
    if (!userId) {
      return res.status(400).json({ error: "UserID is required" });
    }

    try {
      // find chores completed by this user
      const results = await db.collection('Chores').find({
        CompletedByUserID: userId,
        Status: 'completed'
      }).toArray();

      // send them back to frontend
      res.status(200).json({
        error: "",
        results: results
      });

    } catch (e) {
      res.status(500).json({
        error: e.toString()
      });
    }
  });


  // GET /api/chores/:id
  // incoming: ChoreID
  // outgoing: chore object, error

  // PUT /api/chores/:id
  // incoming: Title, Description, DueDate, *Priority
  // outgoing: error

  // PATCH /api/chores/:id/claim
  // incoming: AssignedToUserID
  // outgoing: error
  // Purpose: assign an open chore to a specific user
  router.patch('/:id/claim', async (req, res) => {
    try {
      // get chore id from the URL
      // example: /api/chores/1/claim
      const ChoreID = parseInt(req.params.id);

      // get the user claiming the chore from the request body
      const { AssignedToUserID } = req.body;

      // make sure a user id was provided
      if (!AssignedToUserID) {
        return res.status(400).json({ error: 'AssignedToUserID is required' });
      }

      // update the chore in MongoDB
      // set the assigned user and change status to assigned
      const result = await db.collection('Chores').updateOne(
        { ChoreID: ChoreID },
        {
          $set: {
            AssignedToUserID: AssignedToUserID,
            Status: 'assigned',
            UpdatedAt: new Date().toISOString()
          }
        }
      );

      // if no chore matched that id, send not found
      if (result.matchedCount === 0) {
        return res.status(404).json({ error: 'Chore not found' });
      }

      // success
      res.status(200).json({ error: '' });

    } catch (e) {
      res.status(500).json({ error: e.toString() });
    }
  });

  // PATCH /api/chores/:id/claim
  // incoming: UserID
  // outgoing: error

  // PATCH /api/chores/:id/complete
  // incoming: CompletedByUserID
  // outgoing: error
  // Purpose: mark a chore as completed
  router.patch('/:id/complete', async (req, res) => {
    try {
      const ChoreID = parseInt(req.params.id);
      const { CompletedByUserID } = req.body;

      // validate input
      if (!CompletedByUserID) {
        return res.status(400).json({ error: 'CompletedByUserID is required' });
      }

      // update chore
      const result = await db.collection('Chores').updateOne(
        { ChoreID },
        {
          $set: {
            Status: 'completed',
            CompletedByUserID,
            CompletedAt: new Date().toISOString(),
            UpdatedAt: new Date().toISOString()
          }
        }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: 'Chore not found' });
      }

      res.status(200).json({ error: '' });

    } catch (e) {
      res.status(500).json({ error: e.toString() });
    }
  });

  // DELETE /api/chores/:id
  // incoming: ChoreID
  // outgoing: error


  // *NOTE: Priority should be set here

  return router;
};
