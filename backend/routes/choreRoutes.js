const express = require('express');
const router = express.Router();

module.exports = function(db) {

  // POST /api/chores
  // incoming: HouseholdID, Title, Description, DueDate, *Priority, CreatedByUserID
  // outgoing: ChoreID, error
  router.post('/', async (req, res) => {
    try {
      const {
        HouseholdID,
        Title,
        Description,
        DueDate,
        Priority,
        CreatedByUserID
      } = req.body;

      if (!HouseholdID || !Title || !Priority || !CreatedByUserID) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const lastChore = await db
        .collection('Chores')
        .find({})
        .sort({ ChoreID: -1 })
        .limit(1)
        .toArray();

      const newChoreID = lastChore.length > 0 ? lastChore[0].ChoreID + 1 : 1;
      const now = new Date().toISOString();

      const newChore = {
        ChoreID: newChoreID,
        HouseholdID: Number(HouseholdID),
        Title,
        Description,
        Status: 'open',
        CreatedByUserID: Number(CreatedByUserID),
        AssignedToUserID: null,
        DueDate: DueDate || null,
        Priority: Priority.toLowerCase(),
        IsRecurring: false,
        RecurringTemplateID: null,
        CompletedAt: null,
        CompletedByUserID: null,
        CreatedAt: now,
        UpdatedAt: now,
        Completed: false
      };

      await db.collection('Chores').insertOne(newChore);

      res.status(200).json({ ChoreID: newChoreID, error: '' });
    } catch (e) {
      res.status(500).json({ error: e.toString() });
    }
  });


  // GET /api/chores
  // incoming: HouseholdID
  // outgoing: results[], error
  router.get('/', async (req, res) => {
    try {
      const householdId = parseInt(req.query.HouseholdID);

      if (!householdId) {
        return res.status(400).json({ error: 'HouseholdID is required', results: [] });
      }

      const results = await db.collection('Chores').find({
        HouseholdID: householdId
      }).toArray();

      res.status(200).json({ error: '', results });
    } catch (e) {
      res.status(500).json({ error: e.toString(), results: [] });
    }
  });
  
  // GET /api/chores/open
  // incoming: HouseholdID
  // outgoing: results[], error
  // returns chores that are NOT assigned yet
  router.get('/open', async (req, res) => {
  const householdId = parseInt(req.query.HouseholdID);

  if (!householdId) {
    return res.status(400).json({ error: 'HouseholdID is required' });
  }

  try {
    const results = await db.collection('Chores').find({
      HouseholdID: householdId,
      Status: 'open'
    }).toArray();

    res.status(200).json({ error: "", results });
  } catch (e) {
    res.status(500).json({ error: e.toString(), results: [] });
  }
});

  // GET /api/chores/assigned
  // incoming: HouseholdID
  // outgoing: results[], error
  router.get('/assigned', async (req, res) => {
    const householdId = parseInt(req.query.HouseholdID);

    if (!householdId) {
      return res.status(400).json({ error: 'HouseholdID is required' });
    }

    try {
      const results = await db.collection('Chores').find({
        HouseholdID: householdId,
        Status: 'assigned'
      }).toArray();

      res.status(200).json({ error: '', results });
    } catch (e) {
      res.status(500).json({ error: e.toString(), results: [] });
    }
  });

  // GET /api/chores/my
  // incoming: UserID
  // outgoing: results[], error

  router.get('/my', async (req, res) => {
    const userId = parseInt(req.query.UserID);
    const householdId = parseInt(req.query.HouseholdID);

    if (!userId) {
      return res.status(400).json({ error: "UserID is required" });
    }

    if (!householdId) {
      return res.status(400).json({ error: "HouseholdID is required" });
    }

    try {
      const results = await db.collection('Chores').find({
        HouseholdID: householdId,
        AssignedToUserID: userId,
        Status: 'assigned'
      }).toArray();

      res.status(200).json({ error: "", results });
    } catch (e) {
      res.status(500).json({ error: e.toString(), results: [] });
    }
  });

  // GET /api/chores/completed
  // incoming: HouseholdID
  // outgoing: results[], error
  // Purpose: return chores completed by the logged-in user
  router.get('/completed', async (req, res) => {
    const userId = parseInt(req.query.UserID);
    const householdId = parseInt(req.query.HouseholdID);

    if (!userId) {
      return res.status(400).json({ error: "UserID is required" });
    }

    if (!householdId) {
      return res.status(400).json({ error: "HouseholdID is required" });
    }

    try {
      const results = await db.collection('Chores').find({
        HouseholdID: householdId,
        CompletedByUserID: userId,
        Status: 'completed'
      }).toArray();

      res.status(200).json({ error: "", results });
    } catch (e) {
      res.status(500).json({ error: e.toString(), results: [] });
    }
  });


  // GET /api/chores/:id
  // incoming: ChoreID
  // outgoing: chore object, error
  router.get('/:id', async (req, res) => {
    try {
      const ChoreID = parseInt(req.params.id);

      if (!ChoreID) {
        return res.status(400).json({ error: 'ChoreID is required' });
      }

      const chore = await db.collection('Chores').findOne({ ChoreID });

      if (!chore) {
        return res.status(404).json({ error: 'Chore not found' });
      }

      res.status(200).json({ error: '', chore });

    } catch (e) {
      res.status(500).json({ error: e.toString() });
    }
  });

  // PUT /api/chores/:id
  // incoming: Title, Description, DueDate, *Priority
  // outgoing: error
  router.put('/:id', async (req, res) => {
    try {
      const ChoreID = parseInt(req.params.id);
      const { Title, Description, DueDate, Priority } = req.body;

      if (!ChoreID) {
        return res.status(400).json({ error: 'ChoreID is required' });
      }

      const updateFields = {
        UpdatedAt: new Date().toISOString()
      };

      if (Title) updateFields.Title = Title;
      if (Description) updateFields.Description = Description;
      if (DueDate !== undefined) updateFields.DueDate = DueDate;
      if (Priority) updateFields.Priority = Priority.toLowerCase();

      const result = await db.collection('Chores').updateOne(
        { ChoreID },
        { $set: updateFields }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: 'Chore not found' });
      }

      res.status(200).json({ error: '' });

    } catch (e) {
      res.status(500).json({ error: e.toString() });
    }
  });

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

  // PATCH /api/chores/:id/complete
  // incoming: CompletedByUserID
  // outgoing: error
  // Purpose: mark a chore as completed
  router.patch('/:id/complete', async (req, res) => {
    try {
      const ChoreID = parseInt(req.params.id);
      const { CompletedByUserID } = req.body;
      const chore = await db.collection('Chores').findOne({ ChoreID });

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
            CompletedByUserID: Number(CompletedByUserID),
            CompletedAt: new Date(),
            UpdatedAt: new Date().toISOString()
          }
        }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: 'Chore not found' });
      }

      if (chore && chore.IsRecurring && chore.RecurringTemplateID) {
        const template = await db.collection('RecurringChores').findOne({
          RecurringTemplateID: chore.RecurringTemplateID
        });

        if (template && template.IsActive) {
          const updatedNextDue = new Date(template.NextDueDate);

          if (template.RepeatFrequency === 'daily') {
            updatedNextDue.setDate(updatedNextDue.getDate() + Number(template.RepeatInterval));
          } else if (template.RepeatFrequency === 'weekly') {
            updatedNextDue.setDate(updatedNextDue.getDate() + 7 * Number(template.RepeatInterval));
          } else if (template.RepeatFrequency === 'monthly') {
            updatedNextDue.setMonth(updatedNextDue.getMonth() + Number(template.RepeatInterval));
          }

          const lastChore = await db.collection('Chores')
            .find({})
            .sort({ ChoreID: -1 })
            .limit(1)
            .toArray();

          const newChoreID = lastChore.length > 0 ? lastChore[0].ChoreID + 1 : 1;
          const now = new Date().toISOString();
          const nextDueDate = updatedNextDue.toISOString().split('T')[0];

          await db.collection('Chores').insertOne({
            ChoreID: newChoreID,
            HouseholdID: template.HouseholdID,
            Title: template.Title,
            Description: template.Description || "",
            Status: template.DefaultAssignedUserID ? 'assigned' : 'open',
            CreatedByUserID: template.CreatedByUserID,
            AssignedToUserID: template.DefaultAssignedUserID || null,
            DueDate: nextDueDate,
            Priority: 'medium',
            IsRecurring: true,
            RecurringTemplateID: template.RecurringTemplateID,
            CompletedAt: null,
            CompletedByUserID: null,
            CreatedAt: now,
            UpdatedAt: now,
            Completed: false
          });

          await db.collection('RecurringChores').updateOne(
            { RecurringTemplateID: template.RecurringTemplateID },
            {
              $set: {
                NextDueDate: nextDueDate,
                UpdatedAt: now
              }
            }
          );
        }
      }

      res.status(200).json({ error: '' });

    } catch (e) {
      res.status(500).json({ error: e.toString() });
    }
  });

  // DELETE /api/chores/:id
  // incoming: ChoreID
  // outgoing: error
  router.delete('/:id', async (req, res) => {
    try {
      const ChoreID = parseInt(req.params.id);

      if (!ChoreID) {
        return res.status(400).json({ error: 'ChoreID is required' });
      }

      const result = await db.collection('Chores').deleteOne({ ChoreID });

      if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'Chore not found' });
      }

      res.status(200).json({ error: '' });
    } catch (e) {
      res.status(500).json({ error: e.toString() });
    }
  });


  // *NOTE: Priority should be set here

  return router;
};
