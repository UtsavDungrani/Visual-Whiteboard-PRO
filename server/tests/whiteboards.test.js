const request = require('supertest');
const { app } = require('../index');
const mongoose = require('mongoose');
const User = require('../models/User');
const Whiteboard = require('../models/Whiteboard');
const jwt = require('jsonwebtoken');

describe('Whiteboards API', () => {
  let ownerUser;
  let ownerToken;
  let collaboratorUser;
  let collaboratorToken;
  let otherUser;
  let otherToken;
  let testBoard;

  beforeAll(async () => {
    const mongo = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/visual-whiteboard-test-whiteboards";
    await mongoose.connect(mongo, { useNewUrlParser: true, useUnifiedTopology: true });

    // Clean databases
    await User.deleteMany({});
    await Whiteboard.deleteMany({});

    // Create users
    ownerUser = new User({ name: 'Owner', email: 'owner@example.com', password: 'password123' });
    await ownerUser.save();
    ownerToken = jwt.sign({ id: ownerUser._id, email: ownerUser.email }, process.env.JWT_SECRET || 'visual_whiteboard_secret_key_123');

    collaboratorUser = new User({ name: 'Collab', email: 'collab@example.com', password: 'password123' });
    await collaboratorUser.save();
    collaboratorToken = jwt.sign({ id: collaboratorUser._id, email: collaboratorUser.email }, process.env.JWT_SECRET || 'visual_whiteboard_secret_key_123');

    otherUser = new User({ name: 'Other', email: 'other@example.com', password: 'password123' });
    await otherUser.save();
    otherToken = jwt.sign({ id: otherUser._id, email: otherUser.email }, process.env.JWT_SECRET || 'visual_whiteboard_secret_key_123');
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Whiteboard.deleteMany({});
    await mongoose.connection.close();
  });

  it('should create a new whiteboard', async () => {
    const res = await request(app)
      .post('/api/whiteboards')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Strategy Plan',
        content: { version: '5.3.0', objects: [] }
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('id');
    
    // Fetch it directly from database to assert correctness and save in testBoard
    const boardDoc = await Whiteboard.findById(res.body.id);
    expect(boardDoc).toBeDefined();
    expect(boardDoc.title).toEqual('Strategy Plan');
    expect(boardDoc.owner.toString()).toEqual(ownerUser._id.toString());
    testBoard = boardDoc;
  });

  it('should list whiteboards owned by the user', async () => {
    const res = await request(app)
      .get('/api/whiteboards')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0]).toHaveProperty('title', 'Strategy Plan');
  });

  it('should not allow unauthenticated users to create whiteboards', async () => {
    const res = await request(app)
      .post('/api/whiteboards')
      .send({
        title: 'Unauthorized Board',
        content: { objects: [] }
      });

    expect(res.statusCode).toEqual(401);
  });

  it('should retrieve a whiteboard by ID', async () => {
    const res = await request(app)
      .get(`/api/whiteboards/${testBoard._id}`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('title', 'Strategy Plan');
  });

  it('should not allow random users to retrieve private boards', async () => {
    const res = await request(app)
      .get(`/api/whiteboards/${testBoard._id}`)
      .set('Authorization', `Bearer ${otherToken}`);

    expect(res.statusCode).toEqual(403);
  });

  it('should allow sharing a whiteboard with a collaborator', async () => {
    const res = await request(app)
      .post(`/api/whiteboards/${testBoard._id}/share`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        email: collaboratorUser.email
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('collaboratorsCount', 1);
  });

  it('should allow the collaborator to view the board', async () => {
    const res = await request(app)
      .get(`/api/whiteboards/${testBoard._id}`)
      .set('Authorization', `Bearer ${collaboratorToken}`);

    expect(res.statusCode).toEqual(200);
  });

  it('should allow updating the whiteboard contents', async () => {
    const res = await request(app)
      .put(`/api/whiteboards/${testBoard._id}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        title: 'Updated Strategy Plan',
        content: { version: '5.3.0', objects: [{ type: 'rect' }] }
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('id', testBoard._id.toString());
  });

  it('should allow toggling public visibility permissions', async () => {
    const res = await request(app)
      .post(`/api/whiteboards/${testBoard._id}/share`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({}); // Empty body to toggle visibility

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('isPublic', true);
  });

  it('should allow other users to view the board once it is public', async () => {
    const res = await request(app)
      .get(`/api/whiteboards/${testBoard._id}`)
      .set('Authorization', `Bearer ${otherToken}`);

    expect(res.statusCode).toEqual(200);
  });

  it('should allow modifying collaborator access settings', async () => {
    const res = await request(app)
      .post(`/api/whiteboards/${testBoard._id}/permissions`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        userId: collaboratorUser._id.toString(),
        access: 'view'
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body.collaborators).not.toContain(collaboratorUser._id.toString());
  });

  it('should prevent non-owners from deleting the board', async () => {
    const res = await request(app)
      .delete(`/api/whiteboards/${testBoard._id}`)
      .set('Authorization', `Bearer ${collaboratorToken}`);

    expect(res.statusCode).toEqual(403);
  });

  it('should delete the whiteboard', async () => {
    const res = await request(app)
      .delete(`/api/whiteboards/${testBoard._id}`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.statusCode).toEqual(200);
  });
});
