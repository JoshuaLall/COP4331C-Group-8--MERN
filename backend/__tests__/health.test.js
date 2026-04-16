import request from 'supertest';

let app;

beforeAll(async () => {
  const appModule = await import('../server.js');
  app = appModule.default;
});

afterAll(async () => {
  // Cleanup handled by setup.js
});

describe('Health Check', () => {
  it('should respond to ping', async () => {
    const response = await request(app)
      .get('/api/ping')
      .expect(200);

    expect(response.body.message).toBe('Hello World');
  });

  it('should respond to health check', async () => {
    const response = await request(app)
      .get('/api/health')
      .expect(200);

    expect(response.body.status).toBe('ok');
  });
});