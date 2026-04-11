const express = require('express');
const router = express.Router();

module.exports = function (db) {

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
        AssignedToUserID,
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
        Status: AssignedToUserID ? 'assigned' : 'open',
        CreatedByUserID: Number(CreatedByUserID),
        AssignedToUserID: AssignedToUserID ? Number(AssignedToUserID) : null,
        DueDate: DueDate || null,
        Priority: Priority.toLowerCase(),
        IsRecurring: false,
        RecurringTemplateID: null,
        CompletedAt: null,
        CompletedByUserID: null,
        CreatedAt: now,
        UpdatedAt: now
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
        Status: 'open',
        AssignedToUserID: null
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
      })
        .sort({ CompletedAt: -1 })
        .toArray();

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
      const { Title, Description, DueDate, Priority, AssignedToUserID } = req.body; //Added AssignedToUserID

      if (!ChoreID) {
        return res.status(400).json({ error: 'ChoreID is required' });
      }

      const existingChore = await db.collection('Chores').findOne({ ChoreID });
      if (!existingChore) {
        return res.status(404).json({ error: 'Chore not found' });
      }

      const updateFields = {
        UpdatedAt: new Date().toISOString()
      };

      if (Title) updateFields.Title = Title;
      if (Description) updateFields.Description = Description;
      if (DueDate !== undefined) updateFields.DueDate = DueDate;
      if (Priority) updateFields.Priority = Priority.toLowerCase();
      //Added the following two lines to allow changined the chore from one assigned user to another or to unassign a chore.
      if (AssignedToUserID !== undefined) updateFields.AssignedToUserID = AssignedToUserID ? Number(AssignedToUserID) : null;
      if (AssignedToUserID !== undefined) updateFields.Status = AssignedToUserID ? "assigned" : "open";

      const result = await db.collection('Chores').updateOne(
        { ChoreID },
        { $set: updateFields }
      );

      if (
        AssignedToUserID !== undefined &&
        existingChore.IsRecurring &&
        existingChore.RecurringTemplateID
      ) {
        const normalizedAssignedUserId = AssignedToUserID ? Number(AssignedToUserID) : null;
        const normalizedStatus = normalizedAssignedUserId ? 'assigned' : 'open';

        await db.collection('RecurringChores').updateOne(
          { RecurringTemplateID: Number(existingChore.RecurringTemplateID) },
          {
            $set: {
              DefaultAssignedUserID: normalizedAssignedUserId,
              UpdatedAt: new Date().toISOString()
            }
          }
        );

        await db.collection('Chores').updateMany(
          {
            RecurringTemplateID: Number(existingChore.RecurringTemplateID),
            HouseholdID: Number(existingChore.HouseholdID),
            Status: { $ne: 'completed' }
          },
          {
            $set: {
              AssignedToUserID: normalizedAssignedUserId,
              Status: normalizedStatus,
              UpdatedAt: new Date().toISOString()
            }
          }
        );
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
            AssignedToUserID: Number(AssignedToUserID),
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

      if (!chore) {
        return res.status(404).json({ error: 'Chore not found' });
      }

      // validate input
      if (!CompletedByUserID) {
        return res.status(400).json({ error: 'CompletedByUserID is required' });
      }

      const nowIso = new Date().toISOString();

      const incrementDueDate = (baseDate, frequency, interval) => {
        const next = new Date(baseDate);
        const step = Number(interval) || 1;

        if (frequency === 'daily') {
          next.setDate(next.getDate() + step);
        } else if (frequency === 'weekly') {
          next.setDate(next.getDate() + 7 * step);
        } else if (frequency === 'monthly') {
          next.setMonth(next.getMonth() + step);
        } else {
          next.setDate(next.getDate() + step);
        }

        return next;
      };

      // For recurring chores, create the next instance first so completion cannot
      // accidentally remove the only active occurrence.
      if (chore && chore.IsRecurring && chore.RecurringTemplateID) {
        const template = await db.collection('RecurringChores').findOne({
          RecurringTemplateID: chore.RecurringTemplateID
        });

        if (template && template.IsActive) {
          const templateBase = new Date(template.NextDueDate);
          const choreBase = chore.DueDate ? new Date(chore.DueDate) : null;
          const fallbackBase = new Date();

          const baseDate = Number.isNaN(templateBase.getTime())
            ? (choreBase && !Number.isNaN(choreBase.getTime()) ? choreBase : fallbackBase)
            : templateBase;

          const nextDueDateObj = incrementDueDate(
            baseDate,
            template.RepeatFrequency,
            template.RepeatInterval
          );
          const nextDueDate = nextDueDateObj.toISOString().split('T')[0];

          const existingNext = await db.collection('Chores').findOne({
            RecurringTemplateID: template.RecurringTemplateID,
            DueDate: nextDueDate,
            Status: { $ne: 'completed' }
          });

          if (!existingNext) {
            const lastChore = await db.collection('Chores')
              .find({})
              .sort({ ChoreID: -1 })
              .limit(1)
              .toArray();

            const newChoreID = lastChore.length > 0 ? lastChore[0].ChoreID + 1 : 1;

            await db.collection('Chores').insertOne({
              ChoreID: newChoreID,
              HouseholdID: template.HouseholdID,
              Title: template.Title,
              Description: template.Description || "",
              Status: template.DefaultAssignedUserID ? 'assigned' : 'open',
              CreatedByUserID: template.CreatedByUserID,
              AssignedToUserID: template.DefaultAssignedUserID || null,
              DueDate: nextDueDate,
              Priority: (chore.Priority || 'medium').toLowerCase(),
              IsRecurring: true,
              RecurringTemplateID: template.RecurringTemplateID,
              RepeatFrequency: template.RepeatFrequency,
              RepeatInterval: template.RepeatInterval,
              CompletedAt: null,
              CompletedByUserID: null,
              CreatedAt: nowIso,
              UpdatedAt: nowIso,
            });
          }

          await db.collection('RecurringChores').updateOne(
            { RecurringTemplateID: template.RecurringTemplateID },
            {
              $set: {
                NextDueDate: nextDueDate,
                UpdatedAt: nowIso
              }
            }
          );
        }
      }

      // update chore
      const result = await db.collection('Chores').updateOne(
        { ChoreID },
        {
          $set: {
            Status: 'completed',
            CompletedByUserID: Number(CompletedByUserID),
            CompletedAt: new Date(),
            UpdatedAt: nowIso
          }
        }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: 'Chore not found' });
      }

      res.status(200).json({ error: '' });

    } catch (e) {
      console.error("COMPLETE ROUTE ERROR:", JSON.stringify(e, null, 2));
      console.error("ERR INFO:", JSON.stringify(e.errInfo, null, 2));
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
