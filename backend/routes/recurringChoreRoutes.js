const express = require('express');
const router = express.Router();

module.exports = function(db) {

  // POST /api/recurring-chores
  // incoming: HouseholdID, Title, Description, DefaultAssignedUserID, RepeatFrequency, RepeatInterval, NextDueDate, CreatedByUserID
  // outgoing: RecurringTemplateID, error

  // GET /api/recurring-chores
  // incoming: HouseholdID
  // outgoing: results[], error

  // PUT /api/recurring-chores/:id
  // incoming: Title, Description, DefaultAssignedUserID, RepeatFrequency, RepeatInterval, NextDueDate, IsActive
  // outgoing: error

  // DELETE /api/recurring-chores/:id
  // incoming: RecurringTemplateID
  // outgoing: error

  //NOTE: IsActive should be set here

  return router;
};
