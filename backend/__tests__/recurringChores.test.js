import request from 'supertest';
import jwt from 'jsonwebtoken';

let app;
let db;

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

function createRecurringChore(overrides = {}) {
  return {
    RecurringTemplateID: 1,
    HouseholdID: 1,
    Title: 'Weekly Cleanup',
    Description: 'Clean the house',
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
  process.env.NODE_ENV = 'test';
  const appModule = await import('../server.js');
  app = appModule.default;
  await appModule.startServer();
  db = appModule.db;
});

beforeEach(async () => {
  await db.collection('Users').deleteMany({});
  await db.collection('Households').deleteMany({});
  await db.collection('Chores').deleteMany({});
  await db.collection('RecurringChores').deleteMany({});
});

afterAll(async () => {
  // Cleanup handled by setup.js
});

describe('Recurring Chore Routes Integration Tests', () => {
  
  describe('POST /api/recurring-chores', () => {
    
    it('should create recurring chore template and first instance', async () => {
      const token = jwt.sign({ UserID: 1 }, JWT_SECRET);
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      
      const response = await request(app)
        .post('/api/recurring-chores')
        .set('Authorization', `Bearer ${token}`)
        .send({
          HouseholdID: 1,
          Title: 'Weekly Cleaning',
          Description: 'Clean the kitchen',
          RepeatFrequency: 'weekly',
          RepeatInterval: 1,
          NextDueDate: tomorrowStr,
          CreatedByUserID: 1
        })
        .expect(200);
      
      expect(response.body.error).toBe('');
      expect(response.body.RecurringTemplateID).toBe(1);
      
      const template = await db.collection('RecurringChores').findOne({ RecurringTemplateID: 1 });
      expect(template.Title).toBe('Weekly Cleaning');
      expect(template.IsActive).toBe(true);
      expect(template.RepeatFrequency).toBe('weekly');
      
      const chore = await db.collection('Chores').findOne({ RecurringTemplateID: 1 });
      expect(chore).toBeTruthy();
      expect(chore.Title).toBe('Weekly Cleaning');
      expect(chore.IsRecurring).toBe(true);
      expect(chore.Status).toBe('open');
    });
    
    it('should create assigned chore when DefaultAssignedUserID provided', async () => {
      const token = jwt.sign({ UserID: 1 }, JWT_SECRET);
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const response = await request(app)
        .post('/api/recurring-chores')
        .set('Authorization', `Bearer ${token}`)
        .send({
          HouseholdID: 1,
          Title: 'Daily Task',
          RepeatFrequency: 'daily',
          RepeatInterval: 1,
          NextDueDate: tomorrow.toISOString().split('T')[0],
          CreatedByUserID: 1,
          DefaultAssignedUserID: 1
        })
        .expect(200);
      
      const chore = await db.collection('Chores').findOne({ RecurringTemplateID: 1 });
      expect(chore.Status).toBe('assigned');
      expect(chore.AssignedToUserID).toBe(1);
    });
    
    it('should reject missing required fields', async () => {
      const token = jwt.sign({ UserID: 1 }, JWT_SECRET);
      
      const response = await request(app)
        .post('/api/recurring-chores')
        .set('Authorization', `Bearer ${token}`)
        .send({
          Title: 'Missing fields'
        })
        .expect(400);
      
      expect(response.body.error).toContain('Missing required fields');
    });
  });
  
  describe('POST /api/recurring-chores/generate', () => {
    
    it('should generate chores from due templates', async () => {
      const token = jwt.sign({ UserID: 1 }, JWT_SECRET);
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      await db.collection('RecurringChores').insertOne(createRecurringChore({
        RecurringTemplateID: 1,
        RepeatFrequency: 'daily',
        RepeatInterval: 1,
        NextDueDate: yesterdayStr
      }));
      
      const response = await request(app)
        .post('/api/recurring-chores/generate')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      expect(response.body.error).toBe('');
      expect(response.body.generatedCount).toBe(1);
      
      const chore = await db.collection('Chores').findOne({ RecurringTemplateID: 1 });
      expect(chore).toBeTruthy();
      expect(chore.DueDate).toBe(yesterdayStr);
      
      const template = await db.collection('RecurringChores').findOne({ RecurringTemplateID: 1 });
      const today = new Date().toISOString().split('T')[0];
      expect(template.NextDueDate).toBe(today);
    });
    
    it('should not generate duplicate chores', async () => {
      const token = jwt.sign({ UserID: 1 }, JWT_SECRET);
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      await db.collection('RecurringChores').insertOne(createRecurringChore({
        RecurringTemplateID: 1,
        NextDueDate: yesterdayStr
      }));
      
      await db.collection('Chores').insertOne({
        ChoreID: 1,
        HouseholdID: 1,
        Title: 'Weekly Cleanup',
        Description: 'Clean the house',
        Status: 'open',
        CreatedByUserID: 1,
        AssignedToUserID: null,
        DueDate: yesterdayStr,
        Priority: 'medium',
        IsRecurring: true,
        RecurringTemplateID: 1,
        RepeatFrequency: 'weekly',
        RepeatInterval: 1,
        CompletedAt: null,
        CompletedByUserID: null,
        CreatedAt: new Date().toISOString(),
        UpdatedAt: new Date().toISOString()
      });
      
      const response = await request(app)
        .post('/api/recurring-chores/generate')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      expect(response.body.generatedCount).toBe(0);
      
      const chores = await db.collection('Chores').find({ RecurringTemplateID: 1 }).toArray();
      expect(chores).toHaveLength(1);
    });
    
    it('should skip templates not yet due', async () => {
      const token = jwt.sign({ UserID: 1 }, JWT_SECRET);
      
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      await db.collection('RecurringChores').insertOne(createRecurringChore({
        NextDueDate: tomorrow.toISOString().split('T')[0]
      }));
      
      const response = await request(app)
        .post('/api/recurring-chores/generate')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      expect(response.body.generatedCount).toBe(0);
    });
    
    it('should skip inactive templates', async () => {
      const token = jwt.sign({ UserID: 1 }, JWT_SECRET);
      
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      await db.collection('RecurringChores').insertOne(createRecurringChore({
        NextDueDate: yesterday.toISOString().split('T')[0],
        IsActive: false
      }));
      
      const response = await request(app)
        .post('/api/recurring-chores/generate')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      expect(response.body.generatedCount).toBe(0);
    });
  });
  
  describe('GET /api/recurring-chores', () => {
    
    it('should get all recurring chores for household', async () => {
      const token = jwt.sign({ UserID: 1 }, JWT_SECRET);
      
      await db.collection('RecurringChores').insertMany([
        createRecurringChore({ RecurringTemplateID: 1, HouseholdID: 1, Title: 'Chore 1' }),
        createRecurringChore({ RecurringTemplateID: 2, HouseholdID: 1, Title: 'Chore 2' }),
        createRecurringChore({ RecurringTemplateID: 3, HouseholdID: 2, Title: 'Other household' })
      ]);
      
      const response = await request(app)
        .get('/api/recurring-chores?HouseholdID=1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      expect(response.body.error).toBe('');
      expect(response.body.results).toHaveLength(2);
    });
    
    it('should require HouseholdID', async () => {
      const token = jwt.sign({ UserID: 1 }, JWT_SECRET);
      
      const response = await request(app)
        .get('/api/recurring-chores')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
      
      expect(response.body.error).toContain('HouseholdID is required');
    });
  });
  
  describe('PUT /api/recurring-chores/:id', () => {
    
    it('should update recurring chore template', async () => {
      const token = jwt.sign({ UserID: 1 }, JWT_SECRET);
      
      await db.collection('RecurringChores').insertOne(createRecurringChore({
        RecurringTemplateID: 1,
        Title: 'Old Title'
      }));
      
      const response = await request(app)
        .put('/api/recurring-chores/1')
        .set('Authorization', `Bearer ${token}`)
        .send({
          Title: 'New Title',
          Description: 'Updated description'
        })
        .expect(200);
      
      expect(response.body.error).toBe('');
      
      const template = await db.collection('RecurringChores').findOne({ RecurringTemplateID: 1 });
      expect(template.Title).toBe('New Title');
      expect(template.Description).toBe('Updated description');
    });
    
    it('should update DefaultAssignedUserID', async () => {
      const token = jwt.sign({ UserID: 1 }, JWT_SECRET);
      
      await db.collection('RecurringChores').insertOne(createRecurringChore({
        RecurringTemplateID: 1,
        DefaultAssignedUserID: null
      }));
      
      await request(app)
        .put('/api/recurring-chores/1')
        .set('Authorization', `Bearer ${token}`)
        .send({
          DefaultAssignedUserID: 1
        })
        .expect(200);
      
      const template = await db.collection('RecurringChores').findOne({ RecurringTemplateID: 1 });
      expect(template.DefaultAssignedUserID).toBe(1);
    });
    
    it('should update RepeatFrequency and RepeatInterval', async () => {
      const token = jwt.sign({ UserID: 1 }, JWT_SECRET);
      
      await db.collection('RecurringChores').insertOne(createRecurringChore({
        RecurringTemplateID: 1,
        RepeatFrequency: 'daily',
        RepeatInterval: 1
      }));
      
      await request(app)
        .put('/api/recurring-chores/1')
        .set('Authorization', `Bearer ${token}`)
        .send({
          RepeatFrequency: 'monthly',
          RepeatInterval: 2
        })
        .expect(200);
      
      const template = await db.collection('RecurringChores').findOne({ RecurringTemplateID: 1 });
      expect(template.RepeatFrequency).toBe('monthly');
      expect(template.RepeatInterval).toBe(2);
    });
    
    it('should deactivate recurring chore', async () => {
      const token = jwt.sign({ UserID: 1 }, JWT_SECRET);
      
      await db.collection('RecurringChores').insertOne(createRecurringChore({
        RecurringTemplateID: 1,
        IsActive: true
      }));
      
      await request(app)
        .put('/api/recurring-chores/1')
        .set('Authorization', `Bearer ${token}`)
        .send({
          IsActive: false
        })
        .expect(200);
      
      const template = await db.collection('RecurringChores').findOne({ RecurringTemplateID: 1 });
      expect(template.IsActive).toBe(false);
    });
    
    it('should return 404 for non-existent template', async () => {
      const token = jwt.sign({ UserID: 1 }, JWT_SECRET);
      
      const response = await request(app)
        .put('/api/recurring-chores/999')
        .set('Authorization', `Bearer ${token}`)
        .send({
          Title: 'Test'
        })
        .expect(404);
      
      expect(response.body.error).toContain('Recurring chore not found');
    });
  });
  
  describe('DELETE /api/recurring-chores/:id', () => {
    
    it('should delete recurring chore template', async () => {
      const token = jwt.sign({ UserID: 1 }, JWT_SECRET);
      
      await db.collection('RecurringChores').insertOne(createRecurringChore({
        RecurringTemplateID: 1
      }));
      
      const response = await request(app)
        .delete('/api/recurring-chores/1')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      
      expect(response.body.error).toBe('');
      
      const template = await db.collection('RecurringChores').findOne({ RecurringTemplateID: 1 });
      expect(template).toBeNull();
    });
    
    it('should return 404 for non-existent template', async () => {
      const token = jwt.sign({ UserID: 1 }, JWT_SECRET);
      
      const response = await request(app)
        .delete('/api/recurring-chores/999')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
      
      expect(response.body.error).toContain('Recurring chore not found');
    });
  });
});