import request from 'supertest';
import jwt from 'jsonwebtoken';

let app;
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
    HouseholdID: 1,
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

function createRecurringChore(overrides = {}) {
  return {
    RecurringTemplateID: 1,
    HouseholdID: 1,
    Title: 'Recurring Chore',
    Description: 'Repeating task',
    RepeatFrequency: 'weekly',
    RepeatInterval: 1,
    DefaultAssignedUserID: null,
    NextDueDate: new Date().toISOString().split('T')[0],
    CreatedByUserID: 1,
    IsActive: true,
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
  const db = getDb();
  await db.collection('Users').deleteMany({});
  await db.collection('Households').deleteMany({});
  await db.collection('Chores').deleteMany({});
  await db.collection('RecurringChores').deleteMany({});
});

afterAll(async () => {
  // Cleanup handled by setup.js
});

describe('Chore Routes Integration Tests', () => {
  
  describe('POST /api/chores', () => {
    
    it('should create a new chore', async () => {
      const db = getDb();
      const token = jwt.sign({ UserID: 1 }, JWT_SECRET);
      
      await db.collection('Households').insertOne(createHousehold());
      await db.collection('Users').insertOne(createUser());
      
      const response = await request(app)
        .post('/api/chores')
        .set('Authorization', `Bearer ${token}`)
        .send({
          HouseholdID: 1,
          Title: 'Clean kitchen',
          Description: 'Wipe counters',
          DueDate: '2026-05-01',
          Priority: 'high',
          CreatedByUserID: 1
        })
        .expect(200);
      
      expect(response.body.error).toBe('');
      expect(response.body.ChoreID).toBe(1);
      
      const chore = await db.collection('Chores').findOne({ ChoreID: 1 });
      expect(chore.Title).toBe('Clean kitchen');
      expect(chore.Status).toBe('open');
    });
    
    it('should create assigned chore when AssignedToUserID provided', async () => {
      const db = getDb();
      const token = jwt.sign({ UserID: 1 }, JWT_SECRET);
      
      await db.collection('Households').insertOne(createHousehold());
      await db.collection('Users').insertOne(createUser());
      
      const response = await request(app)
        .post('/api/chores')
        .set('Authorization', `Bearer ${token}`)
        .send({
          HouseholdID: 1,
          Title: 'Vacuum',
          Description: 'Vacuum all rooms',
          Priority: 'medium',
          CreatedByUserID: 1,
          AssignedToUserID: 1
        })
        .expect(200);
      
      const chore = await db.collection('Chores').findOne({ ChoreID: 1 });
      expect(chore.Status).toBe('assigned');
      expect(chore.AssignedToUserID).toBe(1);
    });
    
    it('should reject missing required fields', async () => {
      const db = getDb();
      const token = jwt.sign({ UserID: 1 }, JWT_SECRET);
      
      await db.collection('Users').insertOne(createUser());
      
      const response = await request(app)
        .post('/api/chores')
        .set('Authorization', `Bearer ${token}`)
        .send({
          Title: 'Missing fields'
        })
        .expect(400);
      
      expect(response.body.error).toContain('Missing required fields');
    });
  });
  
  describe('GET /api/chores', () => {
    
    it('should get all chores for household', async () => {
      const db = getDb();
      const token = jwt.sign({ UserID: 1 }, JWT_SECRET);
      
      await db.collection('Users').insertOne(createUser());
      await db.collection('Chores').insertMany([
        createChore({ ChoreID: 1, HouseholdID: 1, Title: 'Chore 1' }),
        createChore({ ChoreID: 2, HouseholdID: 1, Title: 'Chore 2' }),
        createChore({ ChoreID: 3, HouseholdID: 2, Title: 'Other household' })
      ]);
      
      const response = await request(app)
        .get('/api/chores?HouseholdID=1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      expect(response.body.error).toBe('');
      expect(response.body.results).toHaveLength(2);
    });
    
    it('should require HouseholdID', async () => {
      const db = getDb();
      const token = jwt.sign({ UserID: 1 }, JWT_SECRET);
      
      await db.collection('Users').insertOne(createUser());
      
      const response = await request(app)
        .get('/api/chores')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
      
      expect(response.body.error).toContain('HouseholdID is required');
    });
  });
  
  describe('GET /api/chores/open', () => {
    
    it('should get only open unassigned chores', async () => {
      const db = getDb();
      const token = jwt.sign({ UserID: 1 }, JWT_SECRET);
      
      await db.collection('Users').insertOne(createUser());
      await db.collection('Chores').insertMany([
        createChore({ ChoreID: 1, HouseholdID: 1, Status: 'open', AssignedToUserID: null }),
        createChore({ ChoreID: 2, HouseholdID: 1, Status: 'assigned', AssignedToUserID: 1 }),
        createChore({ ChoreID: 3, HouseholdID: 1, Status: 'completed' })
      ]);
      
      const response = await request(app)
        .get('/api/chores/open?HouseholdID=1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      expect(response.body.results).toHaveLength(1);
      expect(response.body.results[0].ChoreID).toBe(1);
    });
  });
  
  describe('GET /api/chores/assigned', () => {
    
    it('should get all assigned chores', async () => {
      const db = getDb();
      const token = jwt.sign({ UserID: 1 }, JWT_SECRET);
      
      await db.collection('Users').insertOne(createUser());
      await db.collection('Chores').insertMany([
        createChore({ ChoreID: 1, HouseholdID: 1, Status: 'assigned', AssignedToUserID: 1 }),
        createChore({ ChoreID: 2, HouseholdID: 1, Status: 'assigned', AssignedToUserID: 2 }),
        createChore({ ChoreID: 3, HouseholdID: 1, Status: 'open' })
      ]);
      
      const response = await request(app)
        .get('/api/chores/assigned?HouseholdID=1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      expect(response.body.results).toHaveLength(2);
    });
  });
  
  describe('GET /api/chores/my', () => {
    
    it('should get chores assigned to specific user', async () => {
      const db = getDb();
      const token = jwt.sign({ UserID: 1 }, JWT_SECRET);
      
      await db.collection('Users').insertOne(createUser());
      await db.collection('Chores').insertMany([
        createChore({ ChoreID: 1, HouseholdID: 1, Status: 'assigned', AssignedToUserID: 1 }),
        createChore({ ChoreID: 2, HouseholdID: 1, Status: 'assigned', AssignedToUserID: 2 })
      ]);
      
      const response = await request(app)
        .get('/api/chores/my?UserID=1&HouseholdID=1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      expect(response.body.results).toHaveLength(1);
      expect(response.body.results[0].AssignedToUserID).toBe(1);
    });
    
    it('should require UserID and HouseholdID', async () => {
      const db = getDb();
      const token = jwt.sign({ UserID: 1 }, JWT_SECRET);
      
      await db.collection('Users').insertOne(createUser());
      
      const response = await request(app)
        .get('/api/chores/my?UserID=1')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
      
      expect(response.body.error).toContain('HouseholdID is required');
    });
  });
  
  describe('GET /api/chores/completed', () => {
    
    it('should get completed chores by user', async () => {
      const db = getDb();
      const token = jwt.sign({ UserID: 1 }, JWT_SECRET);
      
      await db.collection('Users').insertOne(createUser());
      await db.collection('Chores').insertMany([
        createChore({ ChoreID: 1, HouseholdID: 1, Status: 'completed', CompletedByUserID: 1 }),
        createChore({ ChoreID: 2, HouseholdID: 1, Status: 'completed', CompletedByUserID: 2 }),
        createChore({ ChoreID: 3, HouseholdID: 1, Status: 'assigned' })
      ]);
      
      const response = await request(app)
        .get('/api/chores/completed?UserID=1&HouseholdID=1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      expect(response.body.results).toHaveLength(1);
      expect(response.body.results[0].CompletedByUserID).toBe(1);
    });
  });
  
  describe('GET /api/chores/:id', () => {
    
    it('should get single chore by ID', async () => {
      const db = getDb();
      const token = jwt.sign({ UserID: 1 }, JWT_SECRET);
      
      await db.collection('Users').insertOne(createUser());
      await db.collection('Chores').insertOne(createChore({ ChoreID: 1, Title: 'Specific Chore' }));
      
      const response = await request(app)
        .get('/api/chores/1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      expect(response.body.error).toBe('');
      expect(response.body.chore.Title).toBe('Specific Chore');
    });
    
    it('should return 404 for non-existent chore', async () => {
      const db = getDb();
      const token = jwt.sign({ UserID: 1 }, JWT_SECRET);
      
      await db.collection('Users').insertOne(createUser());
      
      const response = await request(app)
        .get('/api/chores/999')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
      
      expect(response.body.error).toContain('Chore not found');
    });
  });
  
  describe('PUT /api/chores/:id', () => {
    
    it('should update chore fields', async () => {
      const db = getDb();
      const token = jwt.sign({ UserID: 1 }, JWT_SECRET);
      
      await db.collection('Users').insertOne(createUser());
      await db.collection('Chores').insertOne(createChore({ ChoreID: 1 }));
      
      const response = await request(app)
        .put('/api/chores/1')
        .set('Authorization', `Bearer ${token}`)
        .send({
          Title: 'Updated Title',
          Description: 'Updated Description',
          Priority: 'high'
        })
        .expect(200);
      
      const chore = await db.collection('Chores').findOne({ ChoreID: 1 });
      expect(chore.Title).toBe('Updated Title');
      expect(chore.Priority).toBe('high');
    });
    
    it('should assign chore when AssignedToUserID provided', async () => {
      const db = getDb();
      const token = jwt.sign({ UserID: 1 }, JWT_SECRET);
      
      await db.collection('Users').insertOne(createUser());
      await db.collection('Chores').insertOne(createChore({ ChoreID: 1, Status: 'open' }));
      
      await request(app)
        .put('/api/chores/1')
        .set('Authorization', `Bearer ${token}`)
        .send({ AssignedToUserID: 1 })
        .expect(200);
      
      const chore = await db.collection('Chores').findOne({ ChoreID: 1 });
      expect(chore.AssignedToUserID).toBe(1);
      expect(chore.Status).toBe('assigned');
    });
    
    it('should return 404 for non-existent chore', async () => {
      const db = getDb();
      const token = jwt.sign({ UserID: 1 }, JWT_SECRET);
      
      await db.collection('Users').insertOne(createUser());
      
      const response = await request(app)
        .put('/api/chores/999')
        .set('Authorization', `Bearer ${token}`)
        .send({ Title: 'Test' })
        .expect(404);
      
      expect(response.body.error).toContain('Chore not found');
    });
  });
  
  describe('PATCH /api/chores/:id/claim', () => {
    
    it('should claim an open chore', async () => {
      const db = getDb();
      const token = jwt.sign({ UserID: 1 }, JWT_SECRET);
      
      await db.collection('Users').insertOne(createUser());
      await db.collection('Chores').insertOne(createChore({ ChoreID: 1, Status: 'open' }));
      
      const response = await request(app)
        .patch('/api/chores/1/claim')
        .set('Authorization', `Bearer ${token}`)
        .send({ AssignedToUserID: 1 })
        .expect(200);
      
      const chore = await db.collection('Chores').findOne({ ChoreID: 1 });
      expect(chore.Status).toBe('assigned');
      expect(chore.AssignedToUserID).toBe(1);
    });
    
    it('should require AssignedToUserID', async () => {
      const db = getDb();
      const token = jwt.sign({ UserID: 1 }, JWT_SECRET);
      
      await db.collection('Users').insertOne(createUser());
      await db.collection('Chores').insertOne(createChore({ ChoreID: 1 }));
      
      const response = await request(app)
        .patch('/api/chores/1/claim')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400);
      
      expect(response.body.error).toContain('AssignedToUserID is required');
    });
    
    it('should return 404 for non-existent chore', async () => {
      const db = getDb();
      const token = jwt.sign({ UserID: 1 }, JWT_SECRET);
      
      await db.collection('Users').insertOne(createUser());
      
      const response = await request(app)
        .patch('/api/chores/999/claim')
        .set('Authorization', `Bearer ${token}`)
        .send({ AssignedToUserID: 1 })
        .expect(404);
      
      expect(response.body.error).toContain('Chore not found');
    });
  });
  
  describe('PATCH /api/chores/:id/complete', () => {
    
    it('should complete a chore', async () => {
      const db = getDb();
      const token = jwt.sign({ UserID: 1 }, JWT_SECRET);
      
      await db.collection('Users').insertOne(createUser());
      await db.collection('Chores').insertOne(createChore({ 
        ChoreID: 1, 
        Status: 'assigned',
        AssignedToUserID: 1
      }));
      
      const response = await request(app)
        .patch('/api/chores/1/complete')
        .set('Authorization', `Bearer ${token}`)
        .send({ CompletedByUserID: 1 })
        .expect(200);
      
      const chore = await db.collection('Chores').findOne({ ChoreID: 1 });
      expect(chore.Status).toBe('completed');
      expect(chore.CompletedByUserID).toBe(1);
      expect(chore.CompletedAt).toBeTruthy();
    });
    
    it('should create next instance for recurring chore', async () => {
      const db = getDb();
      const token = jwt.sign({ UserID: 1 }, JWT_SECRET);
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      
      await db.collection('Users').insertOne(createUser());
      await db.collection('RecurringChores').insertOne(createRecurringChore({
        RecurringTemplateID: 1,
        HouseholdID: 1,
        Title: 'Weekly Cleanup',
        RepeatFrequency: 'daily',
        RepeatInterval: 1,
        NextDueDate: tomorrowStr
      }));
      
      await db.collection('Chores').insertOne(createChore({
        ChoreID: 1,
        HouseholdID: 1,
        Title: 'Weekly Cleanup',
        Status: 'assigned',
        AssignedToUserID: 1,
        IsRecurring: true,
        RecurringTemplateID: 1,
        DueDate: new Date().toISOString().split('T')[0]
      }));
      
      await request(app)
        .patch('/api/chores/1/complete')
        .set('Authorization', `Bearer ${token}`)
        .send({ CompletedByUserID: 1 })
        .expect(200);
      
      const chores = await db.collection('Chores').find({ HouseholdID: 1 }).toArray();
      expect(chores.length).toBeGreaterThan(1);
      
      const completedChore = chores.find(c => c.ChoreID === 1);
      expect(completedChore.Status).toBe('completed');
      
      const nextChore = chores.find(c => c.ChoreID !== 1);
      expect(nextChore.IsRecurring).toBe(true);
    });
    
    it('should require CompletedByUserID', async () => {
      const db = getDb();
      const token = jwt.sign({ UserID: 1 }, JWT_SECRET);
      
      await db.collection('Users').insertOne(createUser());
      await db.collection('Chores').insertOne(createChore({ ChoreID: 1 }));
      
      const response = await request(app)
        .patch('/api/chores/1/complete')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(400);
      
      expect(response.body.error).toContain('CompletedByUserID is required');
    });
    
    it('should return 404 for non-existent chore', async () => {
      const db = getDb();
      const token = jwt.sign({ UserID: 1 }, JWT_SECRET);
      
      await db.collection('Users').insertOne(createUser());
      
      const response = await request(app)
        .patch('/api/chores/999/complete')
        .set('Authorization', `Bearer ${token}`)
        .send({ CompletedByUserID: 1 })
        .expect(404);
      
      expect(response.body.error).toContain('Chore not found');
    });
  });
  
  describe('DELETE /api/chores/:id', () => {
    
    it('should delete a chore', async () => {
      const db = getDb();
      const token = jwt.sign({ UserID: 1 }, JWT_SECRET);
      
      await db.collection('Users').insertOne(createUser());
      await db.collection('Chores').insertOne(createChore({ ChoreID: 1 }));
      
      const response = await request(app)
        .delete('/api/chores/1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      expect(response.body.error).toBe('');
      
      const chore = await db.collection('Chores').findOne({ ChoreID: 1 });
      expect(chore).toBeNull();
    });
    
    it('should return 404 for non-existent chore', async () => {
      const db = getDb();
      const token = jwt.sign({ UserID: 1 }, JWT_SECRET);
      
      await db.collection('Users').insertOne(createUser());
      
      const response = await request(app)
        .delete('/api/chores/999')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
      
      expect(response.body.error).toContain('Chore not found');
    });
  });
});