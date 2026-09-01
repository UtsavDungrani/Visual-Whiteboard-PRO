const request = require("supertest");
const { app } = require("../index");
const mongoose = require("mongoose");
const User = require("../models/User");
const Whiteboard = require("../models/Whiteboard");
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config");

describe("Whiteboards API", () => {
  let ownerUser;
  let ownerToken;
  let collaboratorUser;
  let collaboratorToken;
  let otherUser;
  let otherToken;
  let testBoard;

  beforeAll(async () => {
    const mongo =
      process.env.MONGO_URI ||
      "mongodb://127.0.0.1:27017/visual-whiteboard-test-whiteboards";
    await mongoose.connect(mongo, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Clean databases
    await User.deleteMany({});
    await Whiteboard.deleteMany({});

    // Create users
    ownerUser = new User({
      name: "Owner",
      email: "owner@example.com",
      password: "password123",
    });
    await ownerUser.save();
    ownerToken = jwt.sign(
      { id: ownerUser._id, email: ownerUser.email },
      JWT_SECRET,
    );

    collaboratorUser = new User({
      name: "Collab",
      email: "collab@example.com",
      password: "password123",
    });
    await collaboratorUser.save();
    collaboratorToken = jwt.sign(
      { id: collaboratorUser._id, email: collaboratorUser.email },
      JWT_SECRET,
    );

    otherUser = new User({
      name: "Other",
      email: "other@example.com",
      password: "password123",
    });
    await otherUser.save();
    otherToken = jwt.sign(
      { id: otherUser._id, email: otherUser.email },
      JWT_SECRET,
    );
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Whiteboard.deleteMany({});
    await mongoose.connection.close();
  });

  it("should create a new whiteboard", async () => {
    const res = await request(app)
      .post("/api/whiteboards")
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        title: "Strategy Plan",
        content: { version: "5.3.0", objects: [] },
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("id");

    // Fetch it directly from database to assert correctness and save in testBoard
    const boardDoc = await Whiteboard.findById(res.body.id);
    expect(boardDoc).toBeDefined();
    expect(boardDoc.title).toEqual("Strategy Plan");
    expect(boardDoc.owner.toString()).toEqual(ownerUser._id.toString());
    testBoard = boardDoc;
  });

  it("should list whiteboards owned by the user", async () => {
    const res = await request(app)
      .get("/api/whiteboards")
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
    expect(res.body[0]).toHaveProperty("title", "Strategy Plan");
  });

  it("should not allow unauthenticated users to create whiteboards", async () => {
    const res = await request(app)
      .post("/api/whiteboards")
      .send({
        title: "Unauthorized Board",
        content: { objects: [] },
      });

    expect(res.statusCode).toEqual(401);
  });

  it("should retrieve a whiteboard by ID", async () => {
    const res = await request(app)
      .get(`/api/whiteboards/${testBoard._id}`)
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("title", "Strategy Plan");
  });

  it("should not allow random users to retrieve private boards", async () => {
    const res = await request(app)
      .get(`/api/whiteboards/${testBoard._id}`)
      .set("Authorization", `Bearer ${otherToken}`);

    expect(res.statusCode).toEqual(403);
  });

  it("should allow sharing a whiteboard with a collaborator", async () => {
    const res = await request(app)
      .post(`/api/whiteboards/${testBoard._id}/share`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        email: collaboratorUser.email,
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("success", true);
    expect(res.body).toHaveProperty("collaboratorsCount", 1);
  });

  it("should allow the collaborator to view the board", async () => {
    const res = await request(app)
      .get(`/api/whiteboards/${testBoard._id}`)
      .set("Authorization", `Bearer ${collaboratorToken}`);

    expect(res.statusCode).toEqual(200);
  });

  it("should allow updating the whiteboard contents", async () => {
    const res = await request(app)
      .put(`/api/whiteboards/${testBoard._id}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        title: "Updated Strategy Plan",
        content: { version: "5.3.0", objects: [{ type: "rect" }] },
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("id", testBoard._id.toString());
  });

  it("should allow toggling public visibility permissions", async () => {
    const res = await request(app)
      .post(`/api/whiteboards/${testBoard._id}/share`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({}); // Empty body to toggle visibility

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("isPublic", true);
  });

  it("should allow other users to view the board once it is public", async () => {
    const res = await request(app)
      .get(`/api/whiteboards/${testBoard._id}`)
      .set("Authorization", `Bearer ${otherToken}`);

    expect(res.statusCode).toEqual(200);
  });

  it("should allow modifying collaborator access settings", async () => {
    const res = await request(app)
      .post(`/api/whiteboards/${testBoard._id}/permissions`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({
        userId: collaboratorUser._id.toString(),
        access: "view",
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty("success", true);
    expect(res.body.collaborators).not.toContain(
      collaboratorUser._id.toString(),
    );
  });

  it("should prevent non-owners from deleting the board", async () => {
    const res = await request(app)
      .delete(`/api/whiteboards/${testBoard._id}`)
      .set("Authorization", `Bearer ${collaboratorToken}`);

    expect(res.statusCode).toEqual(403);
  });

  it("should delete the whiteboard", async () => {
    const res = await request(app)
      .delete(`/api/whiteboards/${testBoard._id}`)
      .set("Authorization", `Bearer ${ownerToken}`);

    expect(res.statusCode).toEqual(200);
  });

  // A board carries every page's canvas JSON plus a thumbnail each, so the
  // 100kb express.json default rejected ordinary saves with an HTML error the
  // client could not parse.
  // Every new board is titled "My Whiteboard", so slugs collide constantly.
  describe("slug lookup", () => {
    const sharedTitle = "Shared Title Board";
    let ownBoard;
    let strangersPublicBoard;

    beforeAll(async () => {
      ownBoard = await Whiteboard.create({
        title: sharedTitle,
        owner: ownerUser._id,
        collaborators: [],
        isPublic: false,
        content: { marker: "mine" },
      });

      // Created second, so it is the more recently updated of the two - the
      // old lookup sorted purely on that and handed over this one.
      strangersPublicBoard = await Whiteboard.create({
        title: sharedTitle,
        owner: otherUser._id,
        collaborators: [],
        isPublic: true,
        content: { marker: "theirs" },
      });
    });

    afterAll(async () => {
      await Whiteboard.deleteMany({ title: sharedTitle });
    });

    it("prefers your own board over a stranger's public one", async () => {
      const res = await request(app)
        .get("/api/whiteboards/shared-title-board")
        .set("Authorization", `Bearer ${ownerToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.id).toEqual(ownBoard._id.toString());
      expect(res.body.marker).toEqual("mine");
    });

    it("still finds the public board for someone with no match of their own", async () => {
      const res = await request(app)
        .get("/api/whiteboards/shared-title-board")
        .set("Authorization", `Bearer ${collaboratorToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.id).toEqual(strangersPublicBoard._id.toString());
    });

    it("returns 404 rather than confirming a private title exists", async () => {
      const privateOnly = await Whiteboard.create({
        title: "Strictly Private Board",
        owner: ownerUser._id,
        collaborators: [],
        isPublic: false,
        content: {},
      });

      const res = await request(app).get(
        "/api/whiteboards/strictly-private-board",
      );

      // The old all-boards fallback found it and answered 401, which told an
      // anonymous caller the title exists.
      expect(res.statusCode).toEqual(404);

      await Whiteboard.findByIdAndDelete(privateOnly._id);
    });
  });

  describe("request body size", () => {
    it("accepts a board larger than the old 100kb default", async () => {
      const res = await request(app)
        .post("/api/whiteboards")
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({
          title: "Large Board",
          pages: [
            {
              page_id: "page-1",
              canvas_state: { blob: "x".repeat(400 * 1024) },
            },
          ],
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty("id");
      await Whiteboard.findByIdAndDelete(res.body.id);
    });

    it("answers an oversized body with json, not an html error page", async () => {
      const res = await request(app)
        .post("/api/whiteboards")
        .set("Authorization", `Bearer ${ownerToken}`)
        .send({ title: "Too Big", blob: "x".repeat(16 * 1024 * 1024) });

      expect(res.statusCode).toEqual(413);
      expect(res.body.error).toBe("payload_too_large");
    });

    it("answers malformed json with json", async () => {
      const res = await request(app)
        .post("/api/whiteboards")
        .set("Authorization", `Bearer ${ownerToken}`)
        .set("Content-Type", "application/json")
        .send("{ not valid json");

      expect(res.statusCode).toEqual(400);
      expect(res.body.error).toBe("invalid_json");
    });
  });
});
