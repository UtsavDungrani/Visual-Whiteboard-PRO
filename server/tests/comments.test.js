const request = require("supertest");
const { app } = require("../index");
const mongoose = require("mongoose");
const User = require("../models/User");
const Whiteboard = require("../models/Whiteboard");
const Comment = require("../models/Comment");
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config");

describe("Comments API", () => {
  let owner, ownerToken;
  let collab, collabToken;
  let outsider, outsiderToken;
  let board;

  beforeAll(async () => {
    const mongo =
      process.env.MONGO_URI ||
      "mongodb://127.0.0.1:27017/visual-whiteboard-test-comments";
    await mongoose.connect(mongo, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    await User.deleteMany({});
    await Whiteboard.deleteMany({});
    await Comment.deleteMany({});

    owner = await new User({
      name: "Owner",
      email: "owner-c@example.com",
      password: "x",
    }).save();
    ownerToken = jwt.sign(
      { id: owner._id, name: "Owner", color: "#111" },
      JWT_SECRET,
    );

    collab = await new User({
      name: "Collab",
      email: "collab-c@example.com",
      password: "x",
    }).save();
    collabToken = jwt.sign(
      { id: collab._id, name: "Collab", color: "#222" },
      JWT_SECRET,
    );

    outsider = await new User({
      name: "Outsider",
      email: "outsider-c@example.com",
      password: "x",
    }).save();
    outsiderToken = jwt.sign(
      { id: outsider._id, name: "Outsider", color: "#333" },
      JWT_SECRET,
    );

    board = await new Whiteboard({
      title: "Comment Board",
      owner: owner._id,
      collaborators: [collab._id],
      isPublic: false,
      content: {},
    }).save();
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Whiteboard.deleteMany({});
    await Comment.deleteMany({});
    await mongoose.connection.close();
  });

  let commentId;

  it("lets a collaborator create a comment", async () => {
    const res = await request(app)
      .post(`/api/comments/${board._id}`)
      .set("Authorization", `Bearer ${collabToken}`)
      .send({ pageId: "page-1", text: "Looks good", anchor: { x: 10, y: 20 } });
    expect(res.status).toBe(200);
    expect(res.body.comment).toBeTruthy();
    expect(res.body.comment.text).toBe("Looks good");
    expect(res.body.comment.author.id).toBe(String(collab._id));
    commentId = res.body.comment._id;
  });

  it("rejects an empty comment", async () => {
    const res = await request(app)
      .post(`/api/comments/${board._id}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ text: "   " });
    expect(res.status).toBe(400);
  });

  it("denies a comment from a user without board access", async () => {
    const res = await request(app)
      .post(`/api/comments/${board._id}`)
      .set("Authorization", `Bearer ${outsiderToken}`)
      .send({ text: "sneaky" });
    expect(res.status).toBe(403);
  });

  it("lists comments for a viewer with access", async () => {
    const res = await request(app)
      .get(`/api/comments/${board._id}`)
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.comments)).toBe(true);
    expect(res.body.comments.length).toBe(1);
  });

  it("adds a reply", async () => {
    const res = await request(app)
      .post(`/api/comments/${board._id}/${commentId}/reply`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ text: "Agreed" });
    expect(res.status).toBe(200);
    expect(res.body.comment.replies.length).toBe(1);
    expect(res.body.comment.replies[0].author.id).toBe(String(owner._id));
  });

  it("resolves a comment", async () => {
    const res = await request(app)
      .patch(`/api/comments/${board._id}/${commentId}`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ resolved: true });
    expect(res.status).toBe(200);
    expect(res.body.comment.resolved).toBe(true);
  });

  it("forbids a non-author, non-owner from deleting", async () => {
    // collab authored it, owner owns the board; make a second collaborator who
    // authored nothing try to delete.
    const other = await new User({
      name: "Other",
      email: "other-c@example.com",
      password: "x",
    }).save();
    await Whiteboard.updateOne(
      { _id: board._id },
      { $push: { collaborators: other._id } },
    );
    const otherToken = jwt.sign({ id: other._id, name: "Other" }, JWT_SECRET);
    const res = await request(app)
      .delete(`/api/comments/${board._id}/${commentId}`)
      .set("Authorization", `Bearer ${otherToken}`);
    expect(res.status).toBe(403);
  });

  it("lets the board owner delete any comment", async () => {
    const res = await request(app)
      .delete(`/api/comments/${board._id}/${commentId}`)
      .set("Authorization", `Bearer ${ownerToken}`);
    expect(res.status).toBe(200);
    const remaining = await Comment.countDocuments({
      whiteboard_id: board._id,
    });
    expect(remaining).toBe(0);
  });

  it("returns 404 for a comment id that is not an ObjectId", async () => {
    const res = await request(app)
      .patch(`/api/comments/${board._id}/not-an-id`)
      .set("Authorization", `Bearer ${ownerToken}`)
      .send({ resolved: true });
    expect(res.status).toBe(404);
  });
});
