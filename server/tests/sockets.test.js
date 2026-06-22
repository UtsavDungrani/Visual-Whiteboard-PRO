const ioClient = require('socket.io-client');
const http = require('http');
const { app, httpServer, io } = require('../index');

describe('Socket.io Real-Time Synchronization', () => {
  let server;
  let clientSocket1;
  let clientSocket2;
  let port;

  beforeAll((done) => {
    // Start httpServer on a random free port
    server = httpServer.listen(0, () => {
      port = server.address().port;
      done();
    });
  });

  afterAll((done) => {
    if (clientSocket1 && clientSocket1.connected) clientSocket1.disconnect();
    if (clientSocket2 && clientSocket2.connected) clientSocket2.disconnect();
    
    // Close the server and the socket.io manager
    io.close();
    server.close(() => {
      done();
    });
  });

  beforeEach((done) => {
    // Setup clients
    clientSocket1 = ioClient(`http://localhost:${port}`, {
      transports: ['websocket'],
      forceNew: true
    });
    clientSocket2 = ioClient(`http://localhost:${port}`, {
      transports: ['websocket'],
      forceNew: true
    });

    let connectedCount = 0;
    const checkConnected = () => {
      connectedCount++;
      if (connectedCount === 2) {
        done();
      }
    };

    clientSocket1.on('connect', checkConnected);
    clientSocket2.on('connect', checkConnected);
  });

  afterEach(() => {
    if (clientSocket1.connected) clientSocket1.disconnect();
    if (clientSocket2.connected) clientSocket2.disconnect();
  });

  it('should join a room and broadcast user presence list', (done) => {
    clientSocket1.emit('join', {
      roomId: 'room-abc',
      user: { name: 'User 1', color: '#112233' },
      pageId: 'page-1'
    });

    clientSocket1.on('room:users', (users) => {
      expect(users.length).toBeGreaterThanOrEqual(1);
      const userNames = users.map(u => u.name);
      expect(userNames).toContain('User 1');
      done();
    });
  });

  it('should broadcast canvas:update to other users in the room', (done) => {
    clientSocket1.emit('join', {
      roomId: 'room-canvas',
      user: { name: 'User 1' },
      pageId: 'page-1'
    });

    clientSocket2.emit('join', {
      roomId: 'room-canvas',
      user: { name: 'User 2' },
      pageId: 'page-1'
    });

    const updatePayload = {
      id: 'room-canvas',
      pageId: 'page-1',
      json: { objects: [{ type: 'rect', left: 10, top: 20 }] }
    };

    // Client 2 should receive the update sent by Client 1
    clientSocket2.on('canvas:update', (data) => {
      expect(data).toHaveProperty('pageId', 'page-1');
      expect(data.json.objects[0]).toHaveProperty('type', 'rect');
      done();
    });

    // Wait slightly to ensure both clients joined the room before emitting
    setTimeout(() => {
      clientSocket1.emit('canvas:update', updatePayload);
    }, 100);
  });

  it('should broadcast cursor:move to other users in the room', (done) => {
    clientSocket1.emit('join', {
      roomId: 'room-cursor',
      user: { name: 'User 1' },
      pageId: 'page-1'
    });

    clientSocket2.emit('join', {
      roomId: 'room-cursor',
      user: { name: 'User 2' },
      pageId: 'page-1'
    });

    // cursor:move handler emits cursor:update to other sockets
    clientSocket2.on('cursor:update', (data) => {
      expect(data).toHaveProperty('x', 150);
      expect(data).toHaveProperty('y', 250);
      expect(data).toHaveProperty('userId');
      done();
    });

    setTimeout(() => {
      clientSocket1.emit('cursor:move', {
        roomId: 'room-cursor',
        pageId: 'page-1',
        x: 150,
        y: 250
      });
    }, 100);
  });
});
