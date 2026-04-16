import request from 'supertest';
import jwt from 'jsonwebtoken';

let app;
let db;
let getDb;

const JWT_SECRET = process.env.JWT_SECRET || "ourplace_secret_key";

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

describe('Household Routes Integration Tests', () => {
  
  describe('POST /api/households', () => {
    
    it('should create a new household', async () => {
      const token = jwt.sign({ UserID: 1 }, JWT_SECRET);
      
      await db.collection('Users').insertOne(createUser());
      
      const response = await request(app)
        .post('/api/households')
        .set('Authorization', `Bearer ${token}`)
        .send({
          HouseholdName: 'My New House',
          UserID: 1
        })
        .expect(200);
      
      expect(response.body.error).toBe('');
      expect(response.body.HouseholdID).toBe(1);
      expect(response.body.InviteCode).toBeTruthy();
      expect(response.body.InviteCode).toMatch(/^[A-Z0-9]{6}$/);
      
      const household = await db.collection('Households').findOne({ HouseholdID: 1 });
      expect(household.HouseholdName).toBe('My New House');
      expect(household.MemberIDs).toEqual([1]);
      
      const user = await db.collection('Users').findOne({ UserID: 1 });
      expect(user.HouseholdID).toBe(1);
    });
    
    it('should work with CreatedByUserID', async () => {
      const token = jwt.sign({ UserID: 1 }, JWT_SECRET);
      
      await db.collection('Users').insertOne(createUser());
      
      const response = await request(app)
        .post('/api/households')
        .set('Authorization', `Bearer ${token}`)
        .send({
          HouseholdName: 'Test House',
          CreatedByUserID: 1
        })
        .expect(200);
      
      expect(response.body.HouseholdID).toBe(1);
    });
    
    it('should reject missing HouseholdName', async () => {
      const token = jwt.sign({ UserID: 1 }, JWT_SECRET);
      
      await db.collection('Users').insertOne(createUser());
      
      const response = await request(app)
        .post('/api/households')
        .set('Authorization', `Bearer ${token}`)
        .send({
          UserID: 1
        })
        .expect(400);
      
      expect(response.body.error).toContain('HouseholdName and UserID are required');
    });
    
    it('should reject missing UserID', async () => {
      const token = jwt.sign({ UserID: 1 }, JWT_SECRET);
      
      await db.collection('Users').insertOne(createUser());
      
      const response = await request(app)
        .post('/api/households')
        .set('Authorization', `Bearer ${token}`)
        .send({
          HouseholdName: 'Test'
        })
        .expect(400);
      
      expect(response.body.error).toContain('HouseholdName and UserID are required');
    });
    
    it('should return 404 for non-existent user', async () => {
      const token = jwt.sign({ UserID: 999 }, JWT_SECRET);
      
      const response = await request(app)
        .post('/api/households')
        .set('Authorization', `Bearer ${token}`)
        .send({
          HouseholdName: 'Test',
          UserID: 999
        })
        .expect(404);
      
      expect(response.body.error).toContain('Creator user not found');
    });
  });
  
  describe('GET /api/households/:id', () => {
    
    it('should get household details', async () => {
      const token = jwt.sign({ UserID: 1 }, JWT_SECRET);
      
      await db.collection('Users').insertOne(createUser());
      await db.collection('Households').insertOne(createHousehold({
        HouseholdID: 1,
        HouseholdName: 'My House',
        MemberIDs: [1, 2],
        InviteCode: 'TEST99'
      }));
      
      const response = await request(app)
        .get('/api/households/1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      expect(response.body.error).toBe('');
      expect(response.body.result.HouseholdID).toBe(1);
      expect(response.body.result.HouseholdName).toBe('My House');
      expect(response.body.result.MemberIDs).toEqual([1, 2]);
      expect(response.body.result.InviteCode).toBe('TEST99');
    });
    
    it('should generate invite code if missing', async () => {
      const token = jwt.sign({ UserID: 1 }, JWT_SECRET);
      
      await db.collection('Users').insertOne(createUser());
      await db.collection('Households').insertOne({
        HouseholdID: 1,
        HouseholdName: 'Test',
        MemberIDs: [1],
        CreatedAt: new Date().toISOString()
        // No InviteCode
      });
      
      const response = await request(app)
        .get('/api/households/1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      expect(response.body.result.InviteCode).toBeTruthy();
      expect(response.body.result.InviteCode).toMatch(/^[A-Z0-9]{6}$/);
      
      const household = await db.collection('Households').findOne({ HouseholdID: 1 });
      expect(household.InviteCode).toBe(response.body.result.InviteCode);
    });
    
    it('should return 404 for non-existent household', async () => {
      const token = jwt.sign({ UserID: 1 }, JWT_SECRET);
      
      await db.collection('Users').insertOne(createUser());
      
      const response = await request(app)
        .get('/api/households/999')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
      
      expect(response.body.error).toContain('Household not found');
    });
  });
  
  describe('POST /api/households/:id/invite', () => {
    
    it('should return invite code without email', async () => {
      const token = jwt.sign({ UserID: 1 }, JWT_SECRET);
      
      await db.collection('Users').insertOne(createUser());
      await db.collection('Households').insertOne(createHousehold({
        HouseholdID: 1,
        InviteCode: 'ABC123'
      }));
      
      const response = await request(app)
        .post('/api/households/1/invite')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(200);
      
      expect(response.body.error).toBe('');
      expect(response.body.InviteCode).toBe('ABC123');
    });
    
    it('should send invite email when email provided', async () => {
      const token = jwt.sign({ UserID: 1 }, JWT_SECRET);
      
      await db.collection('Users').insertOne(createUser());
      await db.collection('Households').insertOne(createHousehold({
        HouseholdID: 1,
        InviteCode: 'XYZ789'
      }));
      
      const response = await request(app)
        .post('/api/households/1/invite')
        .set('Authorization', `Bearer ${token}`)
        .send({
          Email: 'newuser@example.com'
        })
        .expect(200);
      
      expect(response.body.InviteCode).toBe('XYZ789');
    });
    
    it('should reject if user already in household', async () => {
      const token = jwt.sign({ UserID: 1 }, JWT_SECRET);
      
      await db.collection('Users').insertMany([
        createUser(),
        createUser({
          UserID: 2,
          Email: 'existing@example.com',
          Login: 'existing'
        })
      ]);
      
      await db.collection('Households').insertOne(createHousehold({
        HouseholdID: 1,
        MemberIDs: [1, 2]
      }));
      
      const response = await request(app)
        .post('/api/households/1/invite')
        .set('Authorization', `Bearer ${token}`)
        .send({
          Email: 'existing@example.com'
        })
        .expect(400);
      
      expect(response.body.error).toContain('already a member');
    });
    
    it('should return 404 for non-existent household', async () => {
      const token = jwt.sign({ UserID: 1 }, JWT_SECRET);
      
      await db.collection('Users').insertOne(createUser());
      
      const response = await request(app)
        .post('/api/households/999/invite')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(404);
      
      expect(response.body.error).toContain('Household not found');
    });
  });
  
  describe('POST /api/households/join', () => {
    
    it('should join household with invite code', async () => {
      const token = jwt.sign({ UserID: 2 }, JWT_SECRET);
      
      await db.collection('Households').insertOne(createHousehold({
        HouseholdID: 1,
        MemberIDs: [1],
        InviteCode: 'JOIN99'
      }));
      
      await db.collection('Users').insertOne(createUser({
        UserID: 2,
        Email: 'user2@example.com',
        Login: 'user2',
        HouseholdID: null
      }));
      
      const response = await request(app)
        .post('/api/households/join')
        .set('Authorization', `Bearer ${token}`)
        .send({
          InviteCode: 'JOIN99',
          UserID: 2
        })
        .expect(200);
      
      expect(response.body.error).toBe('');
      expect(response.body.HouseholdID).toBe(1);
      
      const household = await db.collection('Households').findOne({ HouseholdID: 1 });
      expect(household.MemberIDs).toContain(2);
      
      const user = await db.collection('Users').findOne({ UserID: 2 });
      expect(user.HouseholdID).toBe(1);
    });
    
    it('should join household with HouseholdID', async () => {
      const token = jwt.sign({ UserID: 2 }, JWT_SECRET);
      
      await db.collection('Households').insertOne(createHousehold({
        HouseholdID: 1,
        MemberIDs: [1]
      }));
      
      await db.collection('Users').insertOne(createUser({
        UserID: 2,
        Email: 'user2@example.com',
        Login: 'user2',
        HouseholdID: null
      }));
      
      const response = await request(app)
        .post('/api/households/join')
        .set('Authorization', `Bearer ${token}`)
        .send({
          HouseholdID: 1,
          UserID: 2
        })
        .expect(200);
      
      expect(response.body.HouseholdID).toBe(1);
    });
    
    it('should transfer user from old household to new', async () => {
      const token = jwt.sign({ UserID: 2 }, JWT_SECRET);
      
      await db.collection('Households').insertMany([
        createHousehold({ HouseholdID: 1, MemberIDs: [1], InviteCode: 'OLD111' }),
        createHousehold({ HouseholdID: 2, HouseholdName: 'New House', MemberIDs: [3], InviteCode: 'NEW222' })
      ]);
      
      await db.collection('Users').insertOne(createUser({
        UserID: 2,
        Email: 'user2@example.com',
        Login: 'user2',
        HouseholdID: 1
      }));
      
      await db.collection('Chores').insertOne(createChore({
        ChoreID: 1,
        HouseholdID: 1,
        AssignedToUserID: 2,
        Status: 'assigned'
      }));
      
      const response = await request(app)
        .post('/api/households/join')
        .set('Authorization', `Bearer ${token}`)
        .send({
          InviteCode: 'NEW222',
          UserID: 2
        })
        .expect(200);
      
      expect(response.body.HouseholdID).toBe(2);
      
      const user = await db.collection('Users').findOne({ UserID: 2 });
      expect(user.HouseholdID).toBe(2);
      
      const newHousehold = await db.collection('Households').findOne({ HouseholdID: 2 });
      expect(newHousehold.MemberIDs).toContain(2);
      
      const chore = await db.collection('Chores').findOne({ ChoreID: 1 });
      expect(chore.AssignedToUserID).toBeNull();
      expect(chore.Status).toBe('open');
    });
    
    it('should delete old household if last member leaves', async () => {
      const token = jwt.sign({ UserID: 1 }, JWT_SECRET);
      
      await db.collection('Households').insertMany([
        createHousehold({ HouseholdID: 1, MemberIDs: [1], InviteCode: 'OLD111' }),
        createHousehold({ HouseholdID: 2, MemberIDs: [2], InviteCode: 'NEW222' })
      ]);
      
      await db.collection('Users').insertOne(createUser({
        UserID: 1,
        HouseholdID: 1
      }));
      
      await request(app)
        .post('/api/households/join')
        .set('Authorization', `Bearer ${token}`)
        .send({
          InviteCode: 'NEW222',
          UserID: 1
        })
        .expect(200);
      
      const oldHousehold = await db.collection('Households').findOne({ HouseholdID: 1 });
      expect(oldHousehold).toBeNull();
    });
    
    it('should reject if already in target household', async () => {
      const token = jwt.sign({ UserID: 1 }, JWT_SECRET);
      
      await db.collection('Households').insertOne(createHousehold({
        HouseholdID: 1,
        MemberIDs: [1],
        InviteCode: 'TEST99'
      }));
      
      await db.collection('Users').insertOne(createUser({
        UserID: 1,
        HouseholdID: 1
      }));
      
      const response = await request(app)
        .post('/api/households/join')
        .set('Authorization', `Bearer ${token}`)
        .send({
          InviteCode: 'TEST99',
          UserID: 1
        })
        .expect(400);
      
      expect(response.body.error).toContain('already in this household');
    });
    
    it('should reject unauthorized user transfer', async () => {
      const token = jwt.sign({ UserID: 1 }, JWT_SECRET);
      
      await db.collection('Households').insertOne(createHousehold());
      await db.collection('Users').insertMany([
        createUser(),
        createUser({ UserID: 2, Email: 'user2@example.com', Login: 'user2' })
      ]);
      
      const response = await request(app)
        .post('/api/households/join')
        .set('Authorization', `Bearer ${token}`)
        .send({
          InviteCode: 'ABC123',
          UserID: 2
        })
        .expect(403);
      
      expect(response.body.error).toContain('Not authorized');
    });
    
    it('should return 404 for invalid invite code', async () => {
      const token = jwt.sign({ UserID: 1 }, JWT_SECRET);
      
      await db.collection('Users').insertOne(createUser());
      
      const response = await request(app)
        .post('/api/households/join')
        .set('Authorization', `Bearer ${token}`)
        .send({
          InviteCode: 'INVALID',
          UserID: 1
        })
        .expect(404);
      
      expect(response.body.error).toContain('Invalid invite code');
    });
  });
  
  describe('PUT /api/households/:id', () => {
    
    it('should update household name', async () => {
      const token = jwt.sign({ UserID: 1 }, JWT_SECRET);
      
      await db.collection('Users').insertOne(createUser());
      await db.collection('Households').insertOne(createHousehold({
        HouseholdID: 1,
        HouseholdName: 'Old Name'
      }));
      
      const response = await request(app)
        .put('/api/households/1')
        .set('Authorization', `Bearer ${token}`)
        .send({
          HouseholdName: 'New Name'
        })
        .expect(200);
      
      expect(response.body.error).toBe('');
      
      const household = await db.collection('Households').findOne({ HouseholdID: 1 });
      expect(household.HouseholdName).toBe('New Name');
    });
    
    it('should trim household name', async () => {
      const token = jwt.sign({ UserID: 1 }, JWT_SECRET);
      
      await db.collection('Users').insertOne(createUser());
      await db.collection('Households').insertOne(createHousehold());
      
      await request(app)
        .put('/api/households/1')
        .set('Authorization', `Bearer ${token}`)
        .send({
          HouseholdName: '  Trimmed Name  '
        })
        .expect(200);
      
      const household = await db.collection('Households').findOne({ HouseholdID: 1 });
      expect(household.HouseholdName).toBe('Trimmed Name');
    });
    
    it('should reject empty household name', async () => {
      const token = jwt.sign({ UserID: 1 }, JWT_SECRET);
      
      await db.collection('Users').insertOne(createUser());
      await db.collection('Households').insertOne(createHousehold());
      
      const response = await request(app)
        .put('/api/households/1')
        .set('Authorization', `Bearer ${token}`)
        .send({
          HouseholdName: '   '
        })
        .expect(400);
      
      expect(response.body.error).toContain('HouseholdName is required');
    });
    
    it('should return 404 for non-existent household', async () => {
      const token = jwt.sign({ UserID: 1 }, JWT_SECRET);
      
      await db.collection('Users').insertOne(createUser());
      
      const response = await request(app)
        .put('/api/households/999')
        .set('Authorization', `Bearer ${token}`)
        .send({
          HouseholdName: 'Test'
        })
        .expect(404);
      
      expect(response.body.error).toContain('Household not found');
    });
  });
});