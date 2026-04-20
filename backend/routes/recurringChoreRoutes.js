import express from 'express';

const router = express.Router();

export default function (db, authenticateToken) {

  // POST /api/recurring-chores
  // incoming: HouseholdID, Title, Description, DefaultAssignedUserID, RepeatFrequency, RepeatInterval, NextDueDate, CreatedByUserID
  // outgoing: RecurringTemplateID, error
  router.post('/', authenticateToken, async (req, res) => {
    try {
      const {
        HouseholdID,
        Title,
        Description,
        DefaultAssignedUserID,
        RepeatFrequency,
        RepeatInterval,
        NextDueDate,
        CreatedByUserID,
        Priority
      } = req.body;

      if (
        !HouseholdID ||
        !Title ||
        !RepeatFrequency ||
        !RepeatInterval ||
        !NextDueDate ||
        !CreatedByUserID
      ) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      if (Number(HouseholdID) !== req.user.HouseholdID) {
        return res.status(403).json({ error: 'Forbidden. You can only create recurring chores in your own household.' });
      }

      const lastTemplate = await db
        .collection('RecurringChores')
        .find({})
        .sort({ RecurringTemplateID: -1 })
        .limit(1)
        .toArray();

      const newRecurringTemplateID =
        lastTemplate.length > 0 ? lastTemplate[0].RecurringTemplateID + 1 : 1;

      const now = new Date().toISOString();

      const newTemplate = {
        RecurringTemplateID: newRecurringTemplateID,
        HouseholdID: Number(HouseholdID),
        Title,
        Description: Description || "",
        DefaultAssignedUserID: DefaultAssignedUserID ? Number(DefaultAssignedUserID) : null,
        RepeatFrequency,
        RepeatInterval: Number(RepeatInterval),
        NextDueDate,
        Priority: (Priority || 'medium').toLowerCase(),
        CreatedByUserID: Number(CreatedByUserID),
        IsActive: true,
        CreatedAt: now,
        UpdatedAt: now
      };

      await db.collection('RecurringChores').insertOne(newTemplate);

      const lastChore = await db.collection('Chores')
        .find({})
        .sort({ ChoreID: -1 })
        .limit(1)
        .toArray();

      const newChoreID = lastChore.length > 0 ? lastChore[0].ChoreID + 1 : 1;

      await db.collection('Chores').insertOne({
        ChoreID: newChoreID,
        HouseholdID: Number(HouseholdID),
        Title,
        Description: Description || "",
        Status: DefaultAssignedUserID ? 'assigned' : 'open',
        CreatedByUserID: Number(CreatedByUserID),
        AssignedToUserID: DefaultAssignedUserID ? Number(DefaultAssignedUserID) : null,
        DueDate: NextDueDate,
        Priority: (Priority || 'medium').toLowerCase(),

        IsRecurring: true,
        RecurringTemplateID: newRecurringTemplateID,

        RepeatFrequency: RepeatFrequency,
        RepeatInterval: Number(RepeatInterval),

        CompletedAt: null,
        CompletedByUserID: null,
        CreatedAt: now,
        UpdatedAt: now
      });

      res.status(200).json({ RecurringTemplateID: newRecurringTemplateID, error: '' });
    } catch (e) {
      res.status(500).json({ error: e.toString() });
    }
  });

  router.post('/generate', authenticateToken, async (req, res) => {
    try {
      const today = new Date();
      const templates = await db.collection('RecurringChores').find({
        HouseholdID: req.user.HouseholdID,
        IsActive: true
      }).toArray();

      let generatedCount = 0;

      for (const template of templates) {
        const nextDue = new Date(template.NextDueDate);

        if (nextDue <= today) {
          const existingChore = await db.collection('Chores').findOne({
            RecurringTemplateID: template.RecurringTemplateID,
            DueDate: template.NextDueDate
          });

          if (existingChore) {
            continue;
          }

          const lastChore = await db.collection('Chores')
            .find({})
            .sort({ ChoreID: -1 })
            .limit(1)
            .toArray();

          const newChoreID = lastChore.length > 0 ? lastChore[0].ChoreID + 1 : 1;
          const now = new Date().toISOString();

          const newChore = {
            ChoreID: newChoreID,
            HouseholdID: template.HouseholdID,
            Title: template.Title,
            Description: template.Description || "",
            Status: template.DefaultAssignedUserID ? 'assigned' : 'open',
            CreatedByUserID: template.CreatedByUserID,
            AssignedToUserID: template.DefaultAssignedUserID || null,
            DueDate: template.NextDueDate,
            Priority: 'medium',
            IsRecurring: true,
            RecurringTemplateID: template.RecurringTemplateID,
            RepeatFrequency: template.RepeatFrequency,
            RepeatInterval: template.RepeatInterval,
            CompletedAt: null,
            CompletedByUserID: null,
            CreatedAt: now,
            UpdatedAt: now,
          };

          await db.collection('Chores').insertOne(newChore);

          const updatedNextDue = new Date(template.NextDueDate);

          if (template.RepeatFrequency === 'daily') {
            updatedNextDue.setDate(updatedNextDue.getDate() + Number(template.RepeatInterval));
          } else if (template.RepeatFrequency === 'weekly') {
            updatedNextDue.setDate(updatedNextDue.getDate() + 7 * Number(template.RepeatInterval));
          } else if (template.RepeatFrequency === 'monthly') {
            updatedNextDue.setMonth(updatedNextDue.getMonth() + Number(template.RepeatInterval));
          }

          await db.collection('RecurringChores').updateOne(
            { RecurringTemplateID: template.RecurringTemplateID },
            {
              $set: {
                NextDueDate: updatedNextDue.toISOString().split('T')[0],
                UpdatedAt: now
              }
            }
          );

          generatedCount++;
        }
      }

      res.status(200).json({ error: '', generatedCount });
    } catch (e) {
      res.status(500).json({ error: e.toString() });
    }
  });

  // GET /api/recurring-chores
  // incoming: HouseholdID
  // outgoing: results[], error
  router.get('/', authenticateToken, async (req, res) => {
    try {
      const householdId = parseInt(req.query.HouseholdID);

      if (!householdId) {
        return res.status(400).json({ error: 'HouseholdID is required', results: [] });
      }

      if (householdId !== req.user.HouseholdID) {
        return res.status(403).json({
          error: 'Forbidden. You can only access recurring chores from your own household.',
          results: []
        });
      }

      const results = await db.collection('RecurringChores').find({
        HouseholdID: householdId
      }).toArray();

      res.status(200).json({ error: '', results });
    } catch (e) {
      res.status(500).json({ error: e.toString(), results: [] });
    }
  });

  // PUT /api/recurring-chores/:id
  // incoming: Title, Description, DefaultAssignedUserID, RepeatFrequency, RepeatInterval, NextDueDate, IsActive
  // outgoing: error
  router.put('/:id', authenticateToken, async (req, res) => {
    try {
      const RecurringTemplateID = parseInt(req.params.id);
      const {
        Title,
        Description,
        DefaultAssignedUserID,
        RepeatFrequency,
        RepeatInterval,
        NextDueDate,
        IsActive,
        Priority
      } = req.body || {};

      if (!RecurringTemplateID) {
        return res.status(400).json({ error: 'RecurringTemplateID is required' });
      }

      const existingTemplate = await db.collection('RecurringChores').findOne({ RecurringTemplateID });

      if (!existingTemplate) {
        return res.status(404).json({ error: 'Recurring chore not found' });
      }

      if (existingTemplate.HouseholdID !== req.user.HouseholdID) {
        return res.status(403).json({ error: 'Forbidden. You can only update recurring chores from your own household.' });
      }

      const updateFields = {
        UpdatedAt: new Date().toISOString()
      };

      if (Title) updateFields.Title = Title;
      if (Description !== undefined) updateFields.Description = Description;
      if (DefaultAssignedUserID !== undefined) {
        updateFields.DefaultAssignedUserID = DefaultAssignedUserID === null ? null : Number(DefaultAssignedUserID);
      }
      if (RepeatFrequency) updateFields.RepeatFrequency = RepeatFrequency;
      if (RepeatInterval !== undefined) updateFields.RepeatInterval = Number(RepeatInterval);
      if (NextDueDate !== undefined) updateFields.NextDueDate = NextDueDate;
      if (IsActive !== undefined) updateFields.IsActive = IsActive;
      if (Priority) updateFields.Priority = Priority.toLowerCase();

      await db.collection('RecurringChores').updateOne(
        { RecurringTemplateID },
        { $set: updateFields }
      );

      const choreUpdateFields = {
        UpdatedAt: updateFields.UpdatedAt
      };

      if (Title) choreUpdateFields.Title = Title;
      if (Description !== undefined) choreUpdateFields.Description = Description;
      if (DefaultAssignedUserID !== undefined) {
        const assignedUserId = DefaultAssignedUserID === null ? null : Number(DefaultAssignedUserID);
        choreUpdateFields.AssignedToUserID = assignedUserId;
        choreUpdateFields.Status = assignedUserId ? 'assigned' : 'open';
      }
      if (RepeatFrequency) choreUpdateFields.RepeatFrequency = RepeatFrequency;
      if (RepeatInterval !== undefined) choreUpdateFields.RepeatInterval = Number(RepeatInterval);
      if (NextDueDate !== undefined) choreUpdateFields.DueDate = NextDueDate;
      if (Priority) choreUpdateFields.Priority = Priority.toLowerCase();

      if (Object.keys(choreUpdateFields).length > 1) {
        await db.collection('Chores').updateMany(
          {
            RecurringTemplateID,
            HouseholdID: existingTemplate.HouseholdID,
            Status: { $ne: 'completed' }
          },
          { $set: choreUpdateFields }
        );
      }

      res.status(200).json({ error: '' });
    } catch (e) {
      res.status(500).json({ error: e.toString() });
    }
  });

  // DELETE /api/recurring-chores/:id
  // incoming: RecurringTemplateID
  // outgoing: error
  router.delete('/:id', authenticateToken, async (req, res) => {
    try {
      const RecurringTemplateID = parseInt(req.params.id);

      if (!RecurringTemplateID) {
        return res.status(400).json({ error: 'RecurringTemplateID is required' });
      }

      const existingTemplate = await db.collection('RecurringChores').findOne({ RecurringTemplateID });

      if (!existingTemplate) {
        return res.status(404).json({ error: 'Recurring chore not found' });
      }

      if (existingTemplate.HouseholdID !== req.user.HouseholdID) {
        return res.status(403).json({ error: 'Forbidden. You can only delete recurring chores from your own household.' });
      }

      const result = await db.collection('RecurringChores').deleteOne({ RecurringTemplateID });

      if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'Recurring chore not found' });
      }

      res.status(200).json({ error: '' });
    } catch (e) {
      res.status(500).json({ error: e.toString() });
    }
  });

  //NOTE: IsActive should be set here

  return router;
};
