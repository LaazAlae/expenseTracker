const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'expense-tracker-secret-2024';

let io = null;

const initSocket = (server) => {
  io = new Server(server, {
    cors: { origin: "*" },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Socket authentication middleware
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication token required'));
      }
      
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.userId = decoded.userId;
      socket.username = decoded.username;
      next();
    } catch (err) {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.username} (${socket.userId})`);
    
    // Join user-specific room for targeted updates
    socket.join(`user_${socket.userId}`);
    
    socket.on('disconnect', (reason) => {
      console.log(`User disconnected: ${socket.username} (${reason})`);
    });
    
    socket.on('error', (error) => {
      console.error(`Socket error for ${socket.username}:`, error);
    });
  });

  return io;
};

const broadcastUpdate = (userData, userId = null) => {
  if (!io) return;
  
  if (userId) {
    // Send to specific user
    io.to(`user_${userId}`).emit('data-sync', userData);
  } else {
    // Broadcast to all connected clients
    io.emit('data-sync', userData);
  }
};

const getConnectedUsers = () => {
  if (!io) return 0;
  return io.sockets.sockets.size;
};

module.exports = { initSocket, broadcastUpdate, getConnectedUsers };