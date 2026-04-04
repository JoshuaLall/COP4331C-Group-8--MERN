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

  // GET /api/chores/assigned
  // incoming: HouseholdID
  // outgoing: results[], error

  // GET /api/chores/my
  // incoming: UserID
  // outgoing: results[], error

  // GET /api/chores/completed
  // incoming: HouseholdID
  // outgoing: results[], error

  // GET /api/chores/:id
  // incoming: ChoreID
  // outgoing: chore object, error

  // PUT /api/chores/:id
  // incoming: Title, Description, DueDate, *Priority
  // outgoing: error

  // PATCH /api/chores/:id/claim
  // incoming: AssignedToUserID
  // outgoing: error

  // PATCH /api/chores/:id/claim
  // incoming: UserID
  // outgoing: error

  // PATCH /api/chores/:id/complete
  // incoming: CompletedByUserID
  // outgoing: error

  // DELETE /api/chores/:id
  // incoming: ChoreID
  // outgoing: error


  // *NOTE: Priority should be set here

  return router;
};
