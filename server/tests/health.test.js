const request = require('supertest');
const { app } = require('../index');

describe('Health Check API', () => {
  it('should return 200 OK for /health', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('status', 'ok');
  });

  it('should return 200 for root route', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toEqual(200);
    expect(res.text).toContain('Visual Whiteboard Pro backend');
  });
});
