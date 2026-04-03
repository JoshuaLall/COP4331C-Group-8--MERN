const express = require('express');
const router = express.Router();

module.exports = function(db) {

  // POST /api/auth/register
  router.post('/register', async(req, res) => {
    // incoming: firstName, lastName, email, password
    // outgoing: id, error

    var error = '';
    try {
      const{firstName, lastName, email, password} = req.body;
      
      const existing = await db.collection('Users').findOne({email});
      if (existing) return res.status(400).json({error: 'Email already in use'});

      const result = await db.collection('Users').insertOne({firstName, lastName, email, password});
      res.status(200).json({id:result.insertedId, error:''});
    } catch(e) {
      res.status(500).json({error:e.toString()});
    }
  });

  // POST /api/auth/login
  router.post('/login', async(req, res) => {
    // incoming: email, password
    // outgoing: id, firstName, lastName, error

    var error = '';
    try {
      //TODO
    } catch(e) {
      //TODO
    }

  });

  // POST /api/auth/verify-email
  router.post('/verify-email', async(req, res) => {
    //TODO
  });

  // POST api/auth/forgot-password
  router.post('/forgot-password', async(req, res) => {
    //TODO
  });

  // GET api/auth/me
  router.get('/me', async(req, res) => {
    //TODO
  });

  return router;
};
