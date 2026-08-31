const request = require("supertest");
const { app } = require("../index");
const mongoose = require("mongoose");
const User = require("../models/User");
const Whiteboard = require("../models/Whiteboard");
const ElementContext = require("../models/ElementContext");
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config");
const fs = require("fs");
const path = require("path");

describe("Element Context API", () => {
  let user;
  let token;
  let whiteboard;
  let outsiderToken;
  let elementId = "rect-12345";

  beforeAll(async () => {
    const mongo =
      process.env.MONGO_URI ||
      "mongodb://127.0.0.1:27017/visual-whiteboard-test";
    await mongoose.connect(mongo, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    await User.deleteMany({});
    await Whiteboard.deleteMany({});
    await ElementContext.deleteMany({});

    user = new User({
      name: "Context Tester",
      email: "context@example.com",
      password: "password123",
    });
    await user.save();
    token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET);

    const outsider = await new User({
      name: "Unrelated User",
      email: "outsider@example.com",
      password: "password123",
    }).save();
    outsiderToken = jwt.sign(
      { id: outsider._id, email: outsider.email },
      JWT_SECRET,
    );

    whiteboard = new Whiteboard({
      title: "Context Board",
      owner: user._id,
      collaborators: [],
      isPublic: false,
      content: { version: "5.3.0", objects: [] },
    });
    await whiteboard.save();
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Whiteboard.deleteMany({});
    await ElementContext.deleteMany({});
    await mongoose.connection.close();
  });

  it("should return empty context structure when context does not exist", async () => {
    const res = await request(app)
      .get(`/api/context/${whiteboard._id}/${elementId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("notes", "");
    expect(res.body).toHaveProperty("links");
    expect(res.body.links).toEqual([]);
    expect(res.body).toHaveProperty("code_snippet", "");
  });

  it("should update and retrieve text/code context", async () => {
    const contextData = {
      notes: "# My Markdown Notes\nThis is a test element context.",
      links: [{ label: "Google", url: "https://google.com" }],
      code_snippet: "const a = 1;",
      code_language: "javascript",
    };

    const updateRes = await request(app)
      .post(`/api/context/${whiteboard._id}/${elementId}`)
      .set("Authorization", `Bearer ${token}`)
      .send(contextData);

    expect(updateRes.statusCode).toEqual(200);
    expect(updateRes.body).toHaveProperty("notes", contextData.notes);
    expect(updateRes.body.links[0]).toHaveProperty("label", "Google");
    expect(updateRes.body.links[0]).toHaveProperty("url", "https://google.com");
    expect(updateRes.body).toHaveProperty(
      "code_snippet",
      contextData.code_snippet,
    );

    const getRes = await request(app)
      .get(`/api/context/${whiteboard._id}/${elementId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(getRes.statusCode).toEqual(200);
    expect(getRes.body).toHaveProperty("notes", contextData.notes);
  });

  it("should upload a file attachment to the context", async () => {
    const res = await request(app)
      .post(`/api/context/${whiteboard._id}/${elementId}/upload`)
      .set("Authorization", `Bearer ${token}`)
      .attach("file", Buffer.from("mock file contents 12345"), "testdoc.txt");

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("files");
    expect(res.body.files.length).toBe(1);
    expect(res.body.files[0]).toHaveProperty("name", "testdoc.txt");
    expect(res.body.files[0]).toHaveProperty("path");
    expect(res.body.files[0].path).toContain("/uploads/");
    expect(res.body.files[0]).toHaveProperty("size");
    expect(res.body.files[0].size).toBeGreaterThan(0);
  });

  it("should preserve uploaded file attachments when saving text/code context", async () => {
    const updateRes = await request(app)
      .post(`/api/context/${whiteboard._id}/${elementId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        notes: "Updated notes after file upload",
        links: [{ label: "Docs", url: "https://docs.example.com" }],
        code_snippet: 'console.log("persisted");',
        code_language: "javascript",
      });

    expect(updateRes.statusCode).toEqual(200);
    expect(updateRes.body.notes).toEqual("Updated notes after file upload");
    // Ensure files array is not overwritten/wiped!
    expect(updateRes.body.files).toBeDefined();
    expect(updateRes.body.files.length).toBe(1);
    expect(updateRes.body.files[0].name).toBe("testdoc.txt");

    // Also verify via GET endpoint
    const getRes = await request(app)
      .get(`/api/context/${whiteboard._id}/${elementId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(getRes.statusCode).toEqual(200);
    expect(getRes.body.files.length).toBe(1);
    expect(getRes.body.files[0].name).toBe("testdoc.txt");
  });

  it("should retrieve a map of active contexts for a whiteboard", async () => {
    const res = await request(app)
      .get(`/api/context/${whiteboard._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty(elementId, true);
  });

  it("should return 400 for invalid whiteboard ID in context endpoints", async () => {
    const res = await request(app)
      .get("/api/context/invalid_id/rect-12345")
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toEqual(400);
    expect(res.body).toHaveProperty("error", "invalid_whiteboard_id");
  });

  it("should delete a file attachment from the context and remove physical file", async () => {
    // First, let's get the context to know the file ID and path
    const context = await ElementContext.findOne({
      whiteboard_id: whiteboard._id,
      element_id: elementId,
    });
    expect(context.files.length).toBe(1);
    const fileId = context.files[0]._id;
    const filePath = path.join(
      __dirname,
      "../uploads",
      path.basename(context.files[0].path),
    );

    const res = await request(app)
      .delete(`/api/context/${whiteboard._id}/${elementId}/files/${fileId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.files.length).toBe(0);

    // Verify physical file was removed
    expect(fs.existsSync(filePath)).toBe(false);
  });

  // These routes only validated that the id was a well-formed ObjectId, so any
  // account could read, overwrite or wipe the notes and code of any board.
  describe("board authorisation", () => {
    it("denies an unrelated user the context map of a private board", async () => {
      const res = await request(app)
        .get(`/api/context/${whiteboard._id}`)
        .set("Authorization", `Bearer ${outsiderToken}`);

      expect(res.statusCode).toEqual(403);
    });

    it("denies an unrelated user a single element context", async () => {
      const res = await request(app)
        .get(`/api/context/${whiteboard._id}/${elementId}`)
        .set("Authorization", `Bearer ${outsiderToken}`);

      expect(res.statusCode).toEqual(403);
    });

    it("denies an anonymous caller a private board context", async () => {
      const res = await request(app).get(`/api/context/${whiteboard._id}`);

      expect(res.statusCode).toEqual(401);
    });

    it("stops an unrelated user overwriting context, leaving it intact", async () => {
      await request(app)
        .post(`/api/context/${whiteboard._id}/${elementId}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ notes: "owner notes" });

      const res = await request(app)
        .post(`/api/context/${whiteboard._id}/${elementId}`)
        .set("Authorization", `Bearer ${outsiderToken}`)
        .send({ notes: "" });

      expect(res.statusCode).toEqual(403);

      const stored = await ElementContext.findOne({
        whiteboard_id: whiteboard._id,
        element_id: elementId,
      });
      expect(stored.notes).toBe("owner notes");
    });

    it("denies an unrelated user deleting a file attachment", async () => {
      const res = await request(app)
        .delete(
          `/api/context/${whiteboard._id}/${elementId}/files/${new mongoose.Types.ObjectId()}`,
        )
        .set("Authorization", `Bearer ${outsiderToken}`);

      expect(res.statusCode).toEqual(403);
    });
  });
});
