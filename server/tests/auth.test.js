const request = require("supertest");
const { app } = require("../index");
const mongoose = require("mongoose");
const User = require("../models/User");

describe("Authentication API", () => {
  let testUser = {
    name: "Test User",
    email: "test@example.com",
    password: "password123",
  };

  beforeAll(async () => {
    const mongo =
      process.env.MONGO_URI ||
      "mongodb://127.0.0.1:27017/visual-whiteboard-test-auth";
    await mongoose.connect(mongo, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    await User.deleteMany({ email: testUser.email });
  });

  afterAll(async () => {
    await User.deleteMany({ email: testUser.email });
    await mongoose.connection.close();
  });

  it("should register a new user", async () => {
    const res = await request(app).post("/api/auth/register").send(testUser);

    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty("token");
    expect(res.body.user).toHaveProperty("email", testUser.email);
  });

  it("should not register a user with existing email", async () => {
    const res = await request(app).post("/api/auth/register").send(testUser);

    expect(res.statusCode).toEqual(400);
    expect(res.body).toHaveProperty("error", "email_already_registered");
  });

  it("should login an existing user", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: testUser.email,
      password: testUser.password,
    });

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("token");
  });

  it("should return 401 for /api/auth/me without token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.statusCode).toEqual(401);
  });

  // Registration previously accepted any name, email and password.
  describe("registration validation", () => {
    const base = {
      name: "Valid Name",
      email: "fresh@example.com",
      password: "password123",
    };

    afterEach(async () => {
      await User.deleteMany({ email: base.email });
    });

    it.each([
      ["not-an-email", "invalid_email"],
      ["missing@domain", "invalid_email"],
      ["spaces in@email.com", "invalid_email"],
    ])("rejects the email %s", async (email, error) => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({ ...base, email });

      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty("error", error);
    });

    it("rejects a short password", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({ ...base, password: "short" });

      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty("error", "password_too_short");
    });

    it("rejects a password bcrypt would silently truncate", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({ ...base, password: "a".repeat(73) });

      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty("error", "password_too_long");
    });

    it("rejects an unbounded name", async () => {
      const res = await request(app)
        .post("/api/auth/register")
        .send({ ...base, name: "a".repeat(81) });

      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty("error", "name_too_long");
    });

    it("still accepts a valid registration", async () => {
      const res = await request(app).post("/api/auth/register").send(base);
      expect(res.statusCode).toEqual(201);
    });
  });

  describe("security headers", () => {
    it("sets baseline headers on api responses", async () => {
      const res = await request(app).get("/health");

      expect(res.headers["x-content-type-options"]).toBe("nosniff");
      expect(res.headers["x-frame-options"]).toBe("DENY");
      expect(res.headers["referrer-policy"]).toBe("no-referrer");
    });

    it("sends a script-src policy with the admin panel", async () => {
      const res = await request(app).get("/admin/login.html");

      expect(res.statusCode).toEqual(200);
      // Blocks the inline event handlers an injected payload relies on.
      expect(res.headers["content-security-policy"]).toContain(
        "script-src 'self'",
      );
      expect(res.headers["content-security-policy"]).not.toContain(
        "script-src 'self' 'unsafe-inline'",
      );
    });

    it("serves no inline script in the admin login page", async () => {
      const res = await request(app).get("/admin/login.html");
      // An inline block would be dead on arrival under the policy above.
      expect(res.text).not.toMatch(/<script(?![^>]*\ssrc=)/i);
    });
  });
});
