const express = require('express');
const router = express.Router();

module.exports = function(db) {
  
  // GET /api/users/:id
  router.get('/users/:id', async(res, ret) => {
    // incoming: UserID
    // outgoing: UserID, FirstName, LastName, Email, HouseholdID, error

    //TODO
  });

  // PUT /api/users/:id
  // incoming: FirstName, LastName, Email, Login
  // outgoing: error

  // TODO

  // GET /api/users/household/:householdId
  // incoming: HouseholdID
  // outgoing: results[], error

  // TODO
};
