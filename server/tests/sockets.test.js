const ioClient = require("socket.io-client");
const http = require("http");
const { app, httpServer, io } = require("../index");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config");
const User = require("../models/User");
const Whiteboard = require("../models/Whiteboard");

describe("Socket.io Real-Time Synchronization", () => {
  let server;
  let clientSocket1;
  let clientSocket2;
  let port;

  let ownerUser;
  let ownerToken;
  let privateBoardId;

  beforeAll(async () => {
    const mongo =
      process.env.MONGO_URI ||
      "mongodb://127.0.0.1:27017/visual-whiteboard-test-sockets";
    await mongoose.connect(mongo, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    ownerUser = await User.create({
      name: "Socket Owner",
      email: "socket-owner@example.com",
      password: "hashed",
    });
    ownerToken = jwt.sign(
      { id: ownerUser._id.toString(), name: "Socket Owner", color: "#112233" },
      JWT_SECRET,
    );

    const board = await Whiteboard.create({
      title: "Private Socket Board",
      owner: ownerUser._id,
      collaborators: [],
      isPublic: false,
      content: {},
    });
    privateBoardId = board._id.toString();

    await new Promise((resolve) => {
      server = httpServer.listen(0, () => {
        port = server.address().port;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (clientSocket1 && clientSocket1.connected) clientSocket1.disconnect();
    if (clientSocket2 && clientSocket2.connected) clientSocket2.disconnect();

    await Whiteboard.deleteMany({ owner: ownerUser._id });
    await User.deleteMany({ _id: ownerUser._id });
    await mongoose.connection.close();

    // Close the server and the socket.io manager
    io.close();
    await new Promise((resolve) => server.close(resolve));
  });

  beforeEach((done) => {
    // Setup clients
    clientSocket1 = ioClient(`http://localhost:${port}`, {
      transports: ["websocket"],
      forceNew: true,
    });
    clientSocket2 = ioClient(`http://localhost:${port}`, {
      transports: ["websocket"],
      forceNew: true,
    });

    let connectedCount = 0;
    const checkConnected = () => {
      connectedCount++;
      if (connectedCount === 2) {
        done();
      }
    };

    clientSocket1.on("connect", checkConnected);
    clientSocket2.on("connect", checkConnected);
  });

  afterEach(() => {
    if (clientSocket1.connected) clientSocket1.disconnect();
    if (clientSocket2.connected) clientSocket2.disconnect();
  });

  it("should join a room and broadcast user presence list", (done) => {
    clientSocket1.emit("join", {
      roomId: "room-abc",
      user: { name: "User 1", color: "#112233" },
      pageId: "page-1",
    });

    clientSocket1.on("room:users", (users) => {
      expect(users.length).toBeGreaterThanOrEqual(1);
      const userNames = users.map((u) => u.name);
      expect(userNames).toContain("User 1");
      done();
    });
  });

  it("should broadcast canvas:update to other users in the room", (done) => {
    clientSocket1.emit("join", {
      roomId: "room-canvas",
      user: { name: "User 1" },
      pageId: "page-1",
    });

    clientSocket2.emit("join", {
      roomId: "room-canvas",
      user: { name: "User 2" },
      pageId: "page-1",
    });

    const updatePayload = {
      id: "room-canvas",
      pageId: "page-1",
      json: { objects: [{ type: "rect", left: 10, top: 20 }] },
    };

    // Client 2 should receive the update sent by Client 1
    clientSocket2.on("canvas:update", (data) => {
      expect(data).toHaveProperty("pageId", "page-1");
      expect(data.json.objects[0]).toHaveProperty("type", "rect");
      done();
    });

    // Wait slightly to ensure both clients joined the room before emitting
    setTimeout(() => {
      clientSocket1.emit("canvas:update", updatePayload);
    }, 100);
  });

  it("should broadcast cursor:move to other users in the room", (done) => {
    clientSocket1.emit("join", {
      roomId: "room-cursor",
      user: { name: "User 1" },
      pageId: "page-1",
    });

    clientSocket2.emit("join", {
      roomId: "room-cursor",
      user: { name: "User 2" },
      pageId: "page-1",
    });

    // cursor:move handler emits cursor:update to other sockets
    clientSocket2.on("cursor:update", (data) => {
      expect(data).toHaveProperty("x", 150);
      expect(data).toHaveProperty("y", 250);
      expect(data).toHaveProperty("userId");
      done();
    });

    setTimeout(() => {
      clientSocket1.emit("cursor:move", {
        roomId: "room-cursor",
        pageId: "page-1",
        x: 150,
        y: 250,
      });
    }, 100);
  });

  // Unsaved boards all shared one "global" room, so two strangers each
  // starting a new board saw each other's canvas, cursors and page switches.
  it("should isolate unsaved boards from each other", (done) => {
    let leaked = false;
    clientSocket2.on("canvas:update", () => {
      leaked = true;
    });

    clientSocket1.emit("join", {
      roomId: "global",
      user: { name: "Drafter One" },
      pageId: "page-1",
    });
    clientSocket2.emit("join", {
      roomId: "global",
      user: { name: "Drafter Two" },
      pageId: "page-1",
    });

    setTimeout(() => {
      clientSocket1.emit("canvas:update", {
        id: "global",
        pageId: "page-1",
        json: { objects: [{ type: "rect" }] },
      });
    }, 120);

    setTimeout(() => {
      expect(leaked).toBe(false);
      done();
    }, 450);
  });

  it("should show only yourself in an unsaved board", (done) => {
    clientSocket2.emit("join", {
      roomId: "global",
      user: { name: "Drafter Two" },
      pageId: "page-1",
    });

    clientSocket1.on("room:users", (users) => {
      expect(users.map((u) => u.name)).toEqual(["Drafter One"]);
      done();
    });

    setTimeout(() => {
      clientSocket1.emit("join", {
        roomId: "global",
        user: { name: "Drafter One" },
        pageId: "page-1",
      });
    }, 120);
  });

  // Room membership is what exposes live board traffic, so an unauthorised
  // join must be refused outright - not merely hidden in the UI.
  it("should deny joining a private board room without access", (done) => {
    clientSocket1.on("board:access-denied", (data) => {
      expect(data).toHaveProperty("roomId", privateBoardId);
      done();
    });

    clientSocket1.emit("join", {
      roomId: privateBoardId,
      user: { name: "Intruder" },
      pageId: "page-1",
    });
  });

  it("should let the board owner join their own private board", (done) => {
    const ownerSocket = ioClient(`http://localhost:${port}`, {
      transports: ["websocket"],
      forceNew: true,
      auth: { token: ownerToken },
    });

    ownerSocket.on("connect", () => {
      ownerSocket.emit("join", {
        roomId: privateBoardId,
        user: { name: "Socket Owner" },
        pageId: "page-1",
      });
    });

    ownerSocket.on("board:access-denied", () => {
      ownerSocket.disconnect();
      done(new Error("owner was denied access to their own board"));
    });

    ownerSocket.on("room:users", (users) => {
      expect(users.map((u) => u.name)).toContain("Socket Owner");
      ownerSocket.disconnect();
      done();
    });
  });

  it("should not relay canvas:update from a socket that never joined", (done) => {
    const ownerSocket = ioClient(`http://localhost:${port}`, {
      transports: ["websocket"],
      forceNew: true,
      auth: { token: ownerToken },
    });

    ownerSocket.on("canvas:update", () => {
      ownerSocket.disconnect();
      done(new Error("unauthorised socket injected a canvas update"));
    });

    ownerSocket.on("connect", () => {
      ownerSocket.emit("join", {
        roomId: privateBoardId,
        user: { name: "Socket Owner" },
        pageId: "page-1",
      });

      setTimeout(() => {
        // Intruder was refused the room, so this must go nowhere.
        clientSocket2.emit("canvas:update", {
          id: privateBoardId,
          pageId: "page-1",
          json: { objects: [{ type: "rect" }] },
        });
      }, 150);

      setTimeout(() => {
        ownerSocket.disconnect();
        done();
      }, 500);
    });
  });
});
