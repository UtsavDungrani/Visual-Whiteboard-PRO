const request = require('supertest');
const { app } = require('../index');
const mongoose = require('mongoose');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

describe('AI Service API', () => {
  let user;
  let token;

  beforeAll(async () => {
    const mongo = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/visual-whiteboard-test-ai";
    await mongoose.connect(mongo, { useNewUrlParser: true, useUnifiedTopology: true });

    await User.deleteMany({});
    user = new User({ name: 'AI Tester', email: 'ai@example.com', password: 'password123' });
    await user.save();
    token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET || 'visual_whiteboard_secret_key_123');
  });

  afterAll(async () => {
    await User.deleteMany({});
    await mongoose.connection.close();
  });

  describe('POST /api/ai/cleanup', () => {
    it('should align and distribute canvas elements in row format', async () => {
      const payload = {
        elements: [
          { id: 'el-1', type: 'rect', left: 50, top: 100, width: 100, height: 100, scaleX: 1, scaleY: 1 },
          { id: 'el-2', type: 'rect', left: 300, top: 120, width: 100, height: 100, scaleX: 1, scaleY: 1 }
        ]
      };

      const res = await request(app)
        .post('/api/ai/cleanup')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('elements');
      expect(Array.isArray(res.body.elements)).toBe(true);
      expect(res.body.elements.length).toBe(2);
      
      // Checking alignment output has coordinates
      expect(res.body.elements[0]).toHaveProperty('left');
      expect(res.body.elements[0]).toHaveProperty('top');
    });

    it('should return 400 bad request if elements is missing', async () => {
      const res = await request(app)
        .post('/api/ai/cleanup')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('error', 'missing_elements_array');
    });
  });

  describe('POST /api/ai/assist', () => {
    it('should analyze architecture topology and return suggestions', async () => {
      const payload = {
        elements: [
          { id: 'fe-1', type: 'rect', label: 'Frontend Client' },
          { id: 'db-1', type: 'rect', label: 'Database MongoDB' }
        ],
        edges: [
          { from: 'fe-1', to: 'db-1' }
        ]
      };

      const res = await request(app)
        .post('/api/ai/assist')
        .set('Authorization', `Bearer ${token}`)
        .send(payload);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('suggestions');
      expect(Array.isArray(res.body.suggestions)).toBe(true);
      // Direct front-to-db link should generate a security suggestion
      expect(res.body.suggestions.length).toBeGreaterThanOrEqual(1);
      expect(res.body.suggestions[0].type).toEqual('security_concern');
    });

    it('should return 400 bad request if elements is missing', async () => {
      const res = await request(app)
        .post('/api/ai/assist')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('error', 'missing_elements_array');
    });
  });
});
