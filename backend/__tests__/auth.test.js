import request from 'supertest';
import { MongoClient } from 'mongodb';
import { MongoMemoryServer } from 'mongodb-memory-server';
import jwt from 'jsonwebtoken';

let app;
let db;
let getDb;
let mongoClient;

const JWT_SECRET = process.env.JWT_SECRET || "ourplace_secret_key";

beforeAll(async () => {
  const appModule = await import('../server.js');
  app = appModule.default;
  getDb = appModule.getDb;
});

beforeEach(async () => {
  db = getDb();
  await db.collection('Users').deleteMany({});
});

afterAll(async () => {
  // Don't close connections - setup.js handles that
});

describe('Auth Integration Tests', () => {
  
  describe('POST /api/auth/register', () => {
    
    it('should register user with invite code (no household name needed)', async () => {
      // Create first user with household
      const firstUser = await request(app)
        .post('/api/auth/register')
        .send({
          FirstName: 'First',
          Email: 'first@example.com',
          Login: 'first',
          Password: 'Test1234!@',
          HouseholdName: 'Test House'
        })
        .expect(200);
      
      // Find the user's household by looking up which household has this user
      const user = await db.collection('Users').findOne({ UserID: firstUser.body.UserID });
      const household = await db.collection('Households').findOne({
        HouseholdID: user.HouseholdID
      });
      
      expect(household).toBeTruthy();
      
      // Second user joins with invite code
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          FirstName: 'Second',
          Email: 'second@example.com',
          Login: 'second',
          Password: 'Test1234!@',
          InviteCode: household.InviteCode
        })
        .expect(200);
      
      const secondUser = await db.collection('Users').findOne({
        UserID: response.body.UserID
      });
      
      expect(secondUser.HouseholdID).toBe(user.HouseholdID);
      
      const updatedHousehold = await db.collection('Households').findOne({
        HouseholdID: household.HouseholdID
      });
      expect(updatedHousehold.MemberIDs).toHaveLength(2);
    });
    
    
    it('should reject registration without household name or invite code', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          FirstName: 'Test',
          Email: 'test@example.com',
          Login: 'test',
          Password: 'Test1234!@'
          // No HouseholdName or InviteCode
        })
        .expect(400);
      
      expect(response.body.error).toContain('Household name is required');
    });
    
    it('should reject duplicate email', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({
          FirstName: 'First',
          Email: 'same@example.com',
          Login: 'user1',
          Password: 'Test1234!@',
          HouseholdName: 'House 1'
        });
      
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          FirstName: 'Second',
          Email: 'same@example.com',
          Login: 'user2',
          Password: 'Test1234!@',
          HouseholdName: 'House 2'
        })
        .expect(400);
      
      expect(response.body.error).toContain('Email already exists');
    });
    
    it('should reject duplicate login', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({
          FirstName: 'First',
          Email: 'first@example.com',
          Login: 'samelogin',
          Password: 'Test1234!@',
          HouseholdName: 'House 1'
        });
      
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          FirstName: 'Second',
          Email: 'second@example.com',
          Login: 'samelogin',
          Password: 'Test1234!@',
          HouseholdName: 'House 2'
        })
        .expect(400);
      
      expect(response.body.error).toContain('Login already exists');
    });
    
    it('should reject invalid invite code', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          FirstName: 'Test',
          Email: 'test@example.com',
          Login: 'test',
          Password: 'Test1234!@',
          InviteCode: 'INVALID'
        })
        .expect(400);
      
      expect(response.body.error).toContain('Invalid invite code');
    });
    
    it('should reject password without uppercase', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          FirstName: 'Test',
          Email: 'test@example.com',
          Login: 'test',
          Password: 'nouppercase1!',
          HouseholdName: 'Test House'
        })
        .expect(400);
      
      expect(response.body.error).toContain('uppercase');
    });
    
    it('should reject password without lowercase', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          FirstName: 'Test',
          Email: 'test@example.com',
          Login: 'test',
          Password: 'NOLOWERCASE1!',
          HouseholdName: 'Test House'
        })
        .expect(400);
      
      expect(response.body.error).toContain('lowercase');
    });
    
    it('should reject password without number', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          FirstName: 'Test',
          Email: 'test@example.com',
          Login: 'test',
          Password: 'NoNumbers!@',
          HouseholdName: 'Test House'
        })
        .expect(400);
      
      expect(response.body.error).toContain('number');
    });
    
    it('should reject password without special character', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          FirstName: 'Test',
          Email: 'test@example.com',
          Login: 'test',
          Password: 'NoSpecial123',
          HouseholdName: 'Test House'
        })
        .expect(400);
      
      expect(response.body.error).toContain('special character');
    });
    
    it('should reject password with spaces', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          FirstName: 'Test',
          Email: 'test@example.com',
          Login: 'test',
          Password: 'Has Spaces1!',
          HouseholdName: 'Test House'
        })
        .expect(400);
      
      expect(response.body.error).toContain('cannot contain spaces');
    });
    
    it('should reject password too short', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          FirstName: 'Test',
          Email: 'test@example.com',
          Login: 'test',
          Password: 'Short1!',
          HouseholdName: 'Test House'
        })
        .expect(400);
      
      expect(response.body.error).toContain('at least 8 characters');
    });
  });
  
  describe('POST /api/auth/login', () => {
    
    beforeEach(async () => {
      // Create verified user for login tests
      await request(app)
        .post('/api/auth/register')
        .send({
          FirstName: 'Test',
          Email: 'test@example.com',
          Login: 'testuser',
          Password: 'Test1234!@',
          HouseholdName: 'Test House'
        });
      
      // Manually verify the email
      await db.collection('Users').updateOne(
        { Login: 'testuser' },
        { $set: { EmailVerified: true } }
      );
    });
    
    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          Login: 'testuser',
          Password: 'Test1234!@'
        })
        .expect(200);
      
      expect(response.body.error).toBe('');
      expect(response.body.UserID).toBeGreaterThan(0);
      expect(response.body.HouseholdID).toBeGreaterThan(0);
      expect(response.body.token).toBeTruthy();
      expect(response.body.token.split('.')).toHaveLength(3); // JWT format
    });
    
    it('should reject login if email not verified', async () => {
      // Create unverified user
      await request(app)
        .post('/api/auth/register')
        .send({
          FirstName: 'Unverified',
          Email: 'unverified@example.com',
          Login: 'unverified',
          Password: 'Test1234!@',
          HouseholdName: 'Test House'
        });
      
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          Login: 'unverified',
          Password: 'Test1234!@'
        })
        .expect(403);
      
      expect(response.body.error).toContain('Email not verified');
    });
    
    it('should reject invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          Login: 'testuser',
          Password: 'WrongPassword123!@'
        })
        .expect(401);
      
      expect(response.body.error).toContain('Incorrect password');
    });
    
    it('should reject non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          Login: 'nonexistent',
          Password: 'Test1234!@'
        })
        .expect(404);
      
      expect(response.body.error).toContain('Account does not exist');
    });
    
    it('should require both login and password', async () => {
      const response1 = await request(app)
        .post('/api/auth/login')
        .send({ Login: 'testuser' })
        .expect(400);
      
      expect(response1.body.error).toContain('Login and Password required');
      
      const response2 = await request(app)
        .post('/api/auth/login')
        .send({ Password: 'Test1234!@' })
        .expect(400);
      
      expect(response2.body.error).toContain('Login and Password required');
    });
  });
  
  describe('POST /api/auth/verify-email', () => {
    
    it('should verify email with valid token', async () => {
      // Register user
      const regResponse = await request(app)
        .post('/api/auth/register')
        .send({
          FirstName: 'Test',
          Email: 'test@example.com',
          Login: 'testuser',
          Password: 'Test1234!@',
          HouseholdName: 'Test House'
        });
      
      const userId = regResponse.body.UserID;
      
      // Generate verification token
      const token = jwt.sign({ UserID: userId }, JWT_SECRET, { expiresIn: '1d' });
      
      // Verify email
      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({ token })
        .expect(200);
      
      expect(response.body.error).toBe('');
      
      // Check database
      const user = await db.collection('Users').findOne({ UserID: userId });
      expect(user.EmailVerified).toBe(true);
    });
    
    it('should reject invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: 'invalid.token.here' })
        .expect(400);
      
      expect(response.body.error).toContain('Invalid or expired token');
    });
    
    it('should reject missing token', async () => {
      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({})
        .expect(400);
      
      expect(response.body.error).toContain('Missing token');
    });
    
    it('should reject expired token', async () => {
      const userId = 999;
      const expiredToken = jwt.sign({ UserID: userId }, JWT_SECRET, { expiresIn: '-1h' });
      
      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: expiredToken })
        .expect(400);
      
      expect(response.body.error).toContain('Invalid or expired token');
    });
  });
  
  describe('POST /api/auth/verify-email-change', () => {
    
    it('should verify email change with valid token', async () => {
      // Create user
      const regResponse = await request(app)
        .post('/api/auth/register')
        .send({
          FirstName: 'Test',
          Email: 'old@example.com',
          Login: 'testuser',
          Password: 'Test1234!@',
          HouseholdName: 'Test House'
        });
      
      const userId = regResponse.body.UserID;
      const newEmail = 'new@example.com';
      
      // Set pending email
      await db.collection('Users').updateOne(
        { UserID: userId },
        { $set: { PendingEmail: newEmail } }
      );
      
      // Generate token
      const token = jwt.sign(
        { UserID: userId, PendingEmail: newEmail },
        JWT_SECRET,
        { expiresIn: '1d' }
      );
      
      // Verify email change
      const response = await request(app)
        .post('/api/auth/verify-email-change')
        .send({ token })
        .expect(200);
      
      expect(response.body.error).toBe('');
      
      // Check database
      const user = await db.collection('Users').findOne({ UserID: userId });
      expect(user.Email).toBe(newEmail);
      expect(user.EmailVerified).toBe(true);
      expect(user.PendingEmail).toBeUndefined();
    });
    
    it('should reject if pending email does not match', async () => {
      const regResponse = await request(app)
        .post('/api/auth/register')
        .send({
          FirstName: 'Test',
          Email: 'old@example.com',
          Login: 'testuser',
          Password: 'Test1234!@',
          HouseholdName: 'Test House'
        });
      
      const userId = regResponse.body.UserID;
      
      // Token has different email than PendingEmail
      await db.collection('Users').updateOne(
        { UserID: userId },
        { $set: { PendingEmail: 'different@example.com' } }
      );
      
      const token = jwt.sign(
        { UserID: userId, PendingEmail: 'notmatching@example.com' },
        JWT_SECRET,
        { expiresIn: '1d' }
      );
      
      const response = await request(app)
        .post('/api/auth/verify-email-change')
        .send({ token })
        .expect(400);
      
      expect(response.body.error).toContain('no longer valid');
    });
    
    it('should reject if email already in use by another user', async () => {
      // Create two users
      await request(app)
        .post('/api/auth/register')
        .send({
          FirstName: 'User1',
          Email: 'user1@example.com',
          Login: 'user1',
          Password: 'Test1234!@',
          HouseholdName: 'House 1'
        });
      
      const user2Response = await request(app)
        .post('/api/auth/register')
        .send({
          FirstName: 'User2',
          Email: 'user2@example.com',
          Login: 'user2',
          Password: 'Test1234!@',
          HouseholdName: 'House 2'
        });
      
      const userId2 = user2Response.body.UserID;
      
      // User2 tries to change email to user1's email
      await db.collection('Users').updateOne(
        { UserID: userId2 },
        { $set: { PendingEmail: 'user1@example.com' } }
      );
      
      const token = jwt.sign(
        { UserID: userId2, PendingEmail: 'user1@example.com' },
        JWT_SECRET,
        { expiresIn: '1d' }
      );
      
      const response = await request(app)
        .post('/api/auth/verify-email-change')
        .send({ token })
        .expect(400);
      
      expect(response.body.error).toContain('already in use');
    });
  });
  
  describe('POST /api/auth/change-password', () => {
    let authToken;
    let userId;
    
    beforeEach(async () => {
      const regResponse = await request(app)
        .post('/api/auth/register')
        .send({
          FirstName: 'Test',
          Email: 'test@example.com',
          Login: 'testuser',
          Password: 'OldPassword123!@',
          HouseholdName: 'Test House'
        });
      
      userId = regResponse.body.UserID;
      
      // Verify email
      await db.collection('Users').updateOne(
        { UserID: userId },
        { $set: { EmailVerified: true } }
      );
      
      // Login to get token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          Login: 'testuser',
          Password: 'OldPassword123!@'
        });
      
      authToken = loginResponse.body.token;
    });
    
    it('should change password successfully', async () => {
      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          CurrentPassword: 'OldPassword123!@',
          NewPassword: 'NewPassword456!@'
        })
        .expect(200);
      
      expect(response.body.error).toBe('');
      
      // Verify can login with new password
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          Login: 'testuser',
          Password: 'NewPassword456!@'
        })
        .expect(200);
      
      expect(loginResponse.body.token).toBeTruthy();
    });
    
    it('should reject incorrect current password', async () => {
      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          CurrentPassword: 'WrongPassword123!@',
          NewPassword: 'NewPassword456!@'
        })
        .expect(400);
      
      expect(response.body.error).toContain('Incorrect current password');
    });
    
    it('should reject weak new password', async () => {
      const response = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          CurrentPassword: 'OldPassword123!@',
          NewPassword: 'weak'
        })
        .expect(400);
      
      expect(response.body.error).toBeTruthy();
    });
    
    it('should require authentication', async () => {
      await request(app)
        .post('/api/auth/change-password')
        .send({
          CurrentPassword: 'OldPassword123!@',
          NewPassword: 'NewPassword456!@'
        })
        .expect(401);
    });
  });
  
  describe('POST /api/auth/forgot-password', () => {
    
    beforeEach(async () => {
      await request(app)
        .post('/api/auth/register')
        .send({
          FirstName: 'Test',
          Email: 'test@example.com',
          Login: 'testuser',
          Password: 'Test1234!@',
          HouseholdName: 'Test House'
        });
    });
    
    it('should return success even for non-existent email (security)', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ Email: 'nonexistent@example.com' })
        .expect(200);
      
      expect(response.body.error).toBe('');
    });
    
    it('should return success for existing email', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ Email: 'test@example.com' })
        .expect(200);
      
      expect(response.body.error).toBe('');
    });
    
    it('should require email field', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({})
        .expect(400);
      
      expect(response.body.error).toContain('Email is required');
    });
  });
  
  describe('POST /api/auth/reset-password', () => {
    let userId;
    
    beforeEach(async () => {
      const regResponse = await request(app)
        .post('/api/auth/register')
        .send({
          FirstName: 'Test',
          Email: 'test@example.com',
          Login: 'testuser',
          Password: 'OldPassword123!@',
          HouseholdName: 'Test House'
        });
      
      userId = regResponse.body.UserID;
      
      // Verify email so they can login
      await db.collection('Users').updateOne(
        { UserID: userId },
        { $set: { EmailVerified: true } }
      );
    });
    
    it('should reset password with valid token', async () => {
      const resetToken = jwt.sign({ UserID: userId }, JWT_SECRET, { expiresIn: '15m' });
      
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          ResetToken: resetToken,
          Password: 'NewPassword456!@'
        })
        .expect(200);
      
      expect(response.body.error).toBe('');
      
      // Verify can login with new password
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          Login: 'testuser',
          Password: 'NewPassword456!@'
        })
        .expect(200);
      
      expect(loginResponse.body.token).toBeTruthy();
    });
    
    it('should reject invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          ResetToken: 'invalid.token.here',
          Password: 'NewPassword456!@'
        })
        .expect(500);
      
      expect(response.body.error).toBeTruthy();
    });
    
    it('should reject weak password', async () => {
      const resetToken = jwt.sign({ UserID: userId }, JWT_SECRET, { expiresIn: '15m' });
      
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({
          ResetToken: resetToken,
          Password: 'weak'
        })
        .expect(400);
      
      expect(response.body.error).toBeTruthy();
    });
    
    it('should require both token and password', async () => {
      const response = await request(app)
        .post('/api/auth/reset-password')
        .send({ Password: 'NewPassword456!@' })
        .expect(400);
      
      expect(response.body.error).toContain('ResetToken and Password are required');
    });
  });
});