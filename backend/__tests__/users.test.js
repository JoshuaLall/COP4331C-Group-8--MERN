import request from 'supertest';
import jwt from 'jsonwebtoken';

let app;
let db;
let getDb;

const JWT_SECRET = process.env.JWT_SECRET || "ourplace_secret_key";

// Helper to create valid user document
function createUser(overrides = {}) {
  return {
    UserID: 1,
    FirstName: 'John',
    LastName: 'Doe',
    Login: 'john',
    Email: 'john@example.com',
    Password: '$2a$10$hashedpassword',
    HouseholdID: null,
    EmailVerified: true,
    CreatedAt: new Date().toISOString(),
    ...overrides
  };
}

// Helper to create valid household document
function createHousehold(overrides = {}) {
  return {
    HouseholdID: 1,
    HouseholdName: 'Test House',
    MemberIDs: [1],
    InviteCode: 'ABC123',
    CreatedAt: new Date().toISOString(),
    ...overrides
  };
}

// Helper to create valid chore document
function createChore(overrides = {}) {
  return {
    ChoreID: 1,
    HouseholdID: 1,
    Title: 'Test Chore',
    Description: 'Test description',
    AssignedToUserID: null,
    Status: 'open',
    DueDate: new Date().toISOString().split('T')[0],
    Priority: 'medium',
    CreatedByUserID: 1,
    IsRecurring: false,
    RecurringTemplateID: null,
    CompletedAt: null,
    CompletedByUserID: null,
    CreatedAt: new Date().toISOString(),
    UpdatedAt: new Date().toISOString(),
    ...overrides
  };
}

beforeAll(async () => {
  const appModule = await import('../server.js');
  app = appModule.default;
  getDb = appModule.getDb;
});

beforeEach(async () => {
  db = getDb();
  await db.collection('Users').deleteMany({});
  await db.collection('Households').deleteMany({});
  await db.collection('Chores').deleteMany({});
  await db.collection('RecurringChores').deleteMany({});
});

afterAll(async () => {
  // Cleanup handled by setup.js
});

describe('User Routes Integration Tests', () => {
  
  describe('GET /api/users/household/:householdId', () => {
    
    it('should get all users in a household', async () => {
      const token = jwt.sign({ UserID: 1 }, JWT_SECRET);
      
      await db.collection('Households').insertOne(createHousehold({
        MemberIDs: [1, 2]
      }));
      
      await db.collection('Users').insertMany([
        createUser({ UserID: 1, Login: 'john', Email: 'john@example.com', HouseholdID: 1 }),
        createUser({ UserID: 2, FirstName: 'Jane', Login: 'jane', Email: 'jane@example.com', HouseholdID: 1 })
      ]);
      
      const response = await request(app)
        .get('/api/users/household/1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      expect(response.body.error).toBe('');
      expect(response.body.results).toHaveLength(2);
      expect(response.body.results[0]).not.toHaveProperty('Password');
      expect(response.body.results[0]).not.toHaveProperty('_id');
    });
    
    it('should return empty array for household with no users', async () => {
      const token = jwt.sign({ UserID: 1 }, JWT_SECRET);
      
      await db.collection('Users').insertOne(createUser());
      
      const response = await request(app)
        .get('/api/users/household/999')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      expect(response.body.error).toBe('');
      expect(response.body.results).toEqual([]);
    });
  });
  
  describe('GET /api/users/:id', () => {
    
    it('should get user by id', async () => {
      const token = jwt.sign({ UserID: 1 }, JWT_SECRET);
      
      await db.collection('Users').insertOne(createUser({ HouseholdID: 1 }));
      
      const response = await request(app)
        .get('/api/users/1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      expect(response.body.error).toBe('');
      expect(response.body.result.UserID).toBe(1);
      expect(response.body.result.FirstName).toBe('John');
      expect(response.body.result).not.toHaveProperty('Password');
    });
    
    it('should return 404 for non-existent user', async () => {
      const token = jwt.sign({ UserID: 1 }, JWT_SECRET);
      
      await db.collection('Users').insertOne(createUser());
      
      const response = await request(app)
        .get('/api/users/999')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
      
      expect(response.body.error).toContain('User not found');
    });
  });
  
  describe('PUT /api/users/:id', () => {
    
    beforeEach(async () => {
      await db.collection('Users').insertOne(createUser({ HouseholdID: 1 }));
    });
    
    it('should update first name', async () => {
      const token = jwt.sign({ UserID: 1 }, JWT_SECRET);
      
      const response = await request(app)
        .put('/api/users/1')
        .set('Authorization', `Bearer ${token}`)
        .send({ FirstName: 'Johnny' })
        .expect(200);
      
      expect(response.body.error).toBe('');
      
      const user = await db.collection('Users').findOne({ UserID: 1 });
      expect(user.FirstName).toBe('Johnny');
    });
    
    it('should update last name', async () => {
      const token = jwt.sign({ UserID: 1 }, JWT_SECRET);
      
      const response = await request(app)
        .put('/api/users/1')
        .set('Authorization', `Bearer ${token}`)
        .send({ LastName: 'Smith' })
        .expect(200);
      
      const user = await db.collection('Users').findOne({ UserID: 1 });
      expect(user.LastName).toBe('Smith');
    });
    
    it('should update login', async () => {
      const token = jwt.sign({ UserID: 1 }, JWT_SECRET);
      
      const response = await request(app)
        .put('/api/users/1')
        .set('Authorization', `Bearer ${token}`)
        .send({ Login: 'johnny' })
        .expect(200);
      
      const user = await db.collection('Users').findOne({ UserID: 1 });
      expect(user.Login).toBe('johnny');
    });
    
    it('should reject duplicate login', async () => {
      const token = jwt.sign({ UserID: 1 }, JWT_SECRET);
      
      await db.collection('Users').insertOne(createUser({
        UserID: 2,
        Login: 'jane',
        Email: 'jane@example.com',
        HouseholdID: 1
      }));
      
      const response = await request(app)
        .put('/api/users/1')
        .set('Authorization', `Bearer ${token}`)
        .send({ Login: 'jane' })
        .expect(400);
      
      expect(response.body.error).toContain('already taken');
    });
    
    it('should reject empty login', async () => {
      const token = jwt.sign({ UserID: 1 }, JWT_SECRET);
      
      const response = await request(app)
        .put('/api/users/1')
        .set('Authorization', `Bearer ${token}`)
        .send({ Login: '  ' })
        .expect(400);
      
      expect(response.body.error).toContain('cannot be empty');
    });
    
    it('should update email and set pending verification', async () => {
      const token = jwt.sign({ UserID: 1 }, JWT_SECRET);
      
      const response = await request(app)
        .put('/api/users/1')
        .set('Authorization', `Bearer ${token}`)
        .send({ Email: 'newemail@example.com' })
        .expect(200);
      
      const user = await db.collection('Users').findOne({ UserID: 1 });
      expect(user.PendingEmail).toBe('newemail@example.com');
      expect(user.EmailVerified).toBe(false);
      expect(user.Email).toBe('john@example.com');
    });
    
    it('should reject duplicate email', async () => {
      const token = jwt.sign({ UserID: 1 }, JWT_SECRET);
      
      await db.collection('Users').insertOne(createUser({
        UserID: 2,
        Email: 'jane@example.com',
        Login: 'jane',
        HouseholdID: 1
      }));
      
      const response = await request(app)
        .put('/api/users/1')
        .set('Authorization', `Bearer ${token}`)
        .send({ Email: 'jane@example.com' })
        .expect(400);
      
      expect(response.body.error).toContain('already in use');
    });
    
    it('should reject empty email', async () => {
      const token = jwt.sign({ UserID: 1 }, JWT_SECRET);
      
      const response = await request(app)
        .put('/api/users/1')
        .set('Authorization', `Bearer ${token}`)
        .send({ Email: '  ' })
        .expect(400);
      
      expect(response.body.error).toContain('cannot be empty');
    });
    
    it('should return 404 for non-existent user', async () => {
      const token = jwt.sign({ UserID: 1 }, JWT_SECRET);
      
      const response = await request(app)
        .put('/api/users/999')
        .set('Authorization', `Bearer ${token}`)
        .send({ FirstName: 'Test' })
        .expect(404);
      
      expect(response.body.error).toContain('User not found');
    });
  });
  
  describe('PUT /api/users/:id/remove-from-household', () => {
    
    it('should remove user from household', async () => {
      const token = jwt.sign({ UserID: 1 }, JWT_SECRET);
      
      await db.collection('Households').insertOne(createHousehold({
        MemberIDs: [1, 2]
      }));
      
      await db.collection('Users').insertMany([
        createUser({ UserID: 1, HouseholdID: 1 }),
        createUser({ UserID: 2, FirstName: 'Jane', Login: 'jane', Email: 'jane@example.com', HouseholdID: 1 })
      ]);
      
      const response = await request(app)
        .put('/api/users/1/remove-from-household')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      expect(response.body.error).toBe('');
      
      const user = await db.collection('Users').findOne({ UserID: 1 });
      expect(user.HouseholdID).toBeNull();
      
      const household = await db.collection('Households').findOne({ HouseholdID: 1 });
      expect(household.MemberIDs).not.toContain(1);
      expect(household.MemberIDs).toHaveLength(1);
    });
    
    it('should delete household when last user leaves', async () => {
      const token = jwt.sign({ UserID: 1 }, JWT_SECRET);
      
      await db.collection('Households').insertOne(createHousehold());
      await db.collection('Users').insertOne(createUser({ HouseholdID: 1 }));
      
      await request(app)
        .put('/api/users/1/remove-from-household')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      const household = await db.collection('Households').findOne({ HouseholdID: 1 });
      expect(household).toBeNull();
    });
    
    it('should unassign chores when leaving household', async () => {
      const token = jwt.sign({ UserID: 1 }, JWT_SECRET);
      
      await db.collection('Households').insertOne(createHousehold());
      await db.collection('Users').insertOne(createUser({ HouseholdID: 1 }));
      await db.collection('Chores').insertOne(createChore({
        ChoreID: 1,
        HouseholdID: 1,
        AssignedToUserID: 1,
        Status: 'assigned'
      }));
      
      await request(app)
        .put('/api/users/1/remove-from-household')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      const chore = await db.collection('Chores').findOne({ ChoreID: 1 });
      expect(chore).toBeNull();
    });
    
    it('should reject if user not in household', async () => {
      const token = jwt.sign({ UserID: 1 }, JWT_SECRET);
      
      await db.collection('Users').insertOne(createUser({ HouseholdID: null }));
      
      const response = await request(app)
        .put('/api/users/1/remove-from-household')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
      
      expect(response.body.error).toContain('not in a household');
    });
    
    it('should return 404 for non-existent user', async () => {
      const token = jwt.sign({ UserID: 1 }, JWT_SECRET);
      
      await db.collection('Users').insertOne(createUser());
      
      const response = await request(app)
        .put('/api/users/999/remove-from-household')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
      
      expect(response.body.error).toContain('User not found');
    });
  });
  
  describe('DELETE /api/users/:id', () => {
    
    it('should delete user account with authentication', async () => {
      await db.collection('Users').insertOne(createUser({ HouseholdID: 1 }));
      
      const token = jwt.sign({ UserID: 1 }, JWT_SECRET);
      
      const response = await request(app)
        .delete('/api/users/1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      expect(response.body.error).toBe('');
      
      const user = await db.collection('Users').findOne({ UserID: 1 });
      expect(user).toBeNull();
    });
    
    it('should reject deletion without authentication', async () => {
      await db.collection('Users').insertOne(createUser());
      
      const response = await request(app)
        .delete('/api/users/1')
        .expect(401);
    });
    
    it('should reject deletion of different user', async () => {
      await db.collection('Users').insertMany([
        createUser({ UserID: 1 }),
        createUser({ UserID: 2, FirstName: 'Jane', Login: 'jane', Email: 'jane@example.com' })
      ]);
      
      const token = jwt.sign({ UserID: 1 }, JWT_SECRET);
      
      const response = await request(app)
        .delete('/api/users/2')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);
      
      expect(response.body.error).toContain('Not authorized');
    });
    
    it('should clean up household when deleting last member', async () => {
      await db.collection('Households').insertOne(createHousehold());
      await db.collection('Users').insertOne(createUser({ HouseholdID: 1 }));
      
      const token = jwt.sign({ UserID: 1 }, JWT_SECRET);
      
      await request(app)
        .delete('/api/users/1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      const household = await db.collection('Households').findOne({ HouseholdID: 1 });
      expect(household).toBeNull();
    });
    
    it('should return 403 when trying to delete a different user (even if non-existent)', async () => {
        const token = jwt.sign({ UserID: 1 }, JWT_SECRET);
        
        await db.collection('Users').insertOne(createUser());
        
        const response = await request(app)
            .delete('/api/users/999')
            .set('Authorization', `Bearer ${token}`)
            .expect(403);  // ← Changed from 404 to 403
        
        expect(response.body.error).toContain('Not authorized');  // ← Changed error message
    });
  });
});