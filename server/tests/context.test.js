const request = require('supertest');
const { app } = require('../index');
const mongoose = require('mongoose');
const User = require('../models/User');
const Whiteboard = require('../models/Whiteboard');
const ElementContext = require('../models/ElementContext');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

describe('Element Context API', () => {
  let user;
  let token;
  let whiteboard;
  let elementId = 'rect-12345';

  beforeAll(async () => {
    const mongo = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/visual-whiteboard-test";
    await mongoose.connect(mongo, { useNewUrlParser: true, useUnifiedTopology: true });

    await User.deleteMany({});
    await Whiteboard.deleteMany({});
    await ElementContext.deleteMany({});

    user = new User({ name: 'Context Tester', email: 'context@example.com', password: 'password123' });
    await user.save();
    token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET || 'visual_whiteboard_secret_key_123');

    whiteboard = new Whiteboard({
      title: 'Context Board',
      owner: user._id,
      collaborators: [],
      isPublic: false,
      content: { version: '5.3.0', objects: [] }
    });
    await whiteboard.save();
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Whiteboard.deleteMany({});
    await ElementContext.deleteMany({});
    await mongoose.connection.close();
  });

  it('should return empty context structure when context does not exist', async () => {
    const res = await request(app)
      .get(`/api/context/${whiteboard._id}/${elementId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('notes', '');
    expect(res.body).toHaveProperty('links');
    expect(res.body.links).toEqual([]);
    expect(res.body).toHaveProperty('code_snippet', '');
  });

  it('should update and retrieve text/code context', async () => {
    const contextData = {
      notes: '# My Markdown Notes\nThis is a test element context.',
      links: [
        { label: 'Google', url: 'https://google.com' }
      ],
      code_snippet: 'const a = 1;',
      code_language: 'javascript'
    };

    const updateRes = await request(app)
      .post(`/api/context/${whiteboard._id}/${elementId}`)
      .set('Authorization', `Bearer ${token}`)
      .send(contextData);

    expect(updateRes.statusCode).toEqual(200);
    expect(updateRes.body).toHaveProperty('notes', contextData.notes);
    expect(updateRes.body.links[0]).toHaveProperty('label', 'Google');
    expect(updateRes.body.links[0]).toHaveProperty('url', 'https://google.com');
    expect(updateRes.body).toHaveProperty('code_snippet', contextData.code_snippet);

    const getRes = await request(app)
      .get(`/api/context/${whiteboard._id}/${elementId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(getRes.statusCode).toEqual(200);
    expect(getRes.body).toHaveProperty('notes', contextData.notes);
  });

  it('should upload a file attachment to the context', async () => {
    const res = await request(app)
      .post(`/api/context/${whiteboard._id}/${elementId}/upload`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('mock file contents'), 'testdoc.txt');

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('files');
    expect(res.body.files.length).toBe(1);
    expect(res.body.files[0]).toHaveProperty('name', 'testdoc.txt');
    expect(res.body.files[0]).toHaveProperty('path');
    expect(res.body.files[0].path).toContain('/uploads/');

    // Clean up uploaded physical file
    const filename = path.basename(res.body.files[0].path);
    const filePath = path.join(__dirname, '../uploads', filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  });

  it('should retrieve a map of active contexts for a whiteboard', async () => {
    const res = await request(app)
      .get(`/api/context/${whiteboard._id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty(elementId, true);
  });

  it('should delete a file attachment from the context', async () => {
    // First, let's get the context to know the file ID
    const context = await ElementContext.findOne({
      whiteboard_id: whiteboard._id,
      element_id: elementId
    });
    expect(context.files.length).toBe(1);
    const fileId = context.files[0]._id;

    const res = await request(app)
      .delete(`/api/context/${whiteboard._id}/${elementId}/files/${fileId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.files.length).toBe(0);
  });
});
