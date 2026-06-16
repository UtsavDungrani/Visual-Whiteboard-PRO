const request = require('supertest');
const { app } = require('../index');
const mongoose = require('mongoose');
const User = require('../models/User');

describe('Authentication API', () => {
  let testUser = {
    name: 'Test User',
    email: 'test@example.com',
    password: 'password123'
  };

  beforeAll(async () => {
    const mongo = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/visual-whiteboard-test";
    await mongoose.connect(mongo, { useNewUrlParser: true, useUnifiedTopology: true });
    await User.deleteMany({ email: testUser.email });
  });

  afterAll(async () => {
    await User.deleteMany({ email: testUser.email });
    await mongoose.connection.close();
  });

  it('should register a new user', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);
    
    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toHaveProperty('email', testUser.email);
  });

  it('should not register a user with existing email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);
    
    expect(res.statusCode).toEqual(400);
    expect(res.body).toHaveProperty('error', 'email_already_registered');
  });

  it('should login an existing user', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      });
    
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('token');
  });

  it('should return 401 for /api/auth/me without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.statusCode).toEqual(401);
  });
});
