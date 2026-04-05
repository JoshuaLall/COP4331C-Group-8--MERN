const express = require('express');
const router = express.Router();

module.exports = function(db) {

  // POST /api/auth/register
  // incoming: FirstName, LastName, Login, Password, Email
  // outgoing: UserID, error
  router.post('/register', async(req, res) => {
    //console.log('register hit');
    //console.log(req.body);

    var error = '';
    try {
      const{ FirstName, LastName, Login, Password, Email } = req.body;
      
      // check if Login or Email already exists
      //console.log('register hit');
      const existing = await db.collection('Users').findOne({ $or:[{ Login }, { Email }] });
      //console.log('findOne done');
      if (existing) return res.status(400).json({ error: 'Login or Email already in use' });

      // create new user
      const newUser = {
        //TODO: add UserID
        FirstName, 
        LastName, 
        Login, 
        Password, 
        Email: Email.toLowerCase(), 
        Verified: false, 
        VerifyToken: '', 
        ResetToken: '',
        ResetExpires: null,
        HouseholdID: null,
        CreatedAt: new Date().toISOString(),
        UpdatedAt: new Date().toISOString()
      };

      const result = await db.collection('Users').insertOne(newUser);
      res.status(200).json({ UserID: result.insertedId, error: '' });

    } catch(e) {
      res.status(500).json({ error: e.toString() });
    }
  });

  // POST /api/auth/login
  // incoming: Login, Password
  // outgoing: UserID, FirstName, LastName, error
  router.post('/login', async(req, res) => {
    var error = '';
    try {
      const{ Login, Password } = req.body;

      // check if user exists
      const user = await db.collection('Users').findOne({ Login, Password });
      if (!user) return res.status(400).json({ error: 'Invalid username/password' });

      res.status(200).json({
        UserID: user.UserID,
        FirstName: user.FirstName,
        LastName: user.LastName,
        HouseholdID: user.HouseholdId,
        error: ''
      });

    } catch(e) {
      res.status(500).json({ error: e.toString() });
    }
  });

  // POST /api/auth/verify-email
  // incoming: VerifyToken
  // outgoing: error
  router.post('/verify-email', async(req, res) => {
    var error = '';
    try {
      const{ VerifyToken } = req.body;

      // check if token matches
      const user = await db.collection('Users').findOne({ VerifyToken });
      if (!user) return res.status(400).json({ error: 'Invalid token' });

      // set user as verified
      await db.collection('Users').updateOne(
        { VerifyToken },
        { $set: {Verified: true, VerifyToken: '' } }
      );

      res.status(200).json({ error: '' });
    } catch(e) {
      res.status(500).json({ error: e.toString() });
    }
  });

  // POST api/auth/forgot-password
  // incoming: Email
  // outgoing: error
  router.post('/forgot-password', async(req, res) => {
    var error = '';
    try {
      const{ Email } = req.body;

      // check if email matches
      const email = await db.collection('Users').findOne({ Email });
      if (!email) return res.status(400).json({ error: 'Email not found' });

      // generate a reset token and set exp
      const ResetToken = Math.random().toString(36).substring(2);
      const ResetExpires = new Date(Date.now() + 3600000).toISOString();

      // update user
      await db.collection('Users').updateOne(
        { Email },
        { $set: {ResetToken, ResetExpires } }
      );

      res.status(200).json({ error: '' });
    } catch(e) {
      res.status(500).json({ error: e.toString() });
    }
  });

  // POST api/auth/reset-password
  // incoming: ResetToken, Password
  // outgoing: error
  router.post('/reset-password', async(req, res) => {
    var error = '';
    try {
      const{ ResetToken, Password } = req.body;

      // check if reset tken matches
      const user = await db.collection('Users').findOne({ ResetToken });
      if (!user) return res.status(400).json({ error: 'Invalid token' });

      // check reset token exp has not passed
      if (new Date() > new Date(user.ResetExpires)) return res.status(400).json({ error: 'Reset token has expired' });
      
      // set new password and clear reset token and exp
      await db.collection('Users').updateOne(
        { ResetToken },
        { $set: { Password, ResetToken: '', ResetExpires: null, UpdatedAt: new Date().toISOString() } }
      );

      res.status(200).json({ error: '' });
    } catch(e) {
      res.status(500).json({ error: e.toString() });
    }
  });

  // GET api/auth/me
  // incoming: UserID
  // outgoing: UserID, FirstName, LastName, Email, HouseholdID, error
  router.get('/me', async(req, res) => {
    var error = '';
    try {
      const{ UserID } = req.query;
      
      // check if user exists
      const user = await db.collection('Users').findOne({ _id: UserID });
      if (!user) return res.status(400).json({ error: 'User not found' });


      res.status(200).json({
        UserID: user._id,
        FirstName: user.FirstName,
        LastName: user.LastName,
        Email: user.Email,
        HouseholdID: user.HouseholdId,
        error: ''
      });
    } catch(e) {
      res.status(500).json({ error: e.toString() });
    }
  });

  return router;
};
