const jwt = require('jsonwebtoken');
const { getData, saveData } = require('./database');
const { sanitize } = require('../utils/sanitizer');
const enhancedSecurity = require('../security/enhanced-security');
const budgetManager = require('./budget-manager');

const JWT_SECRET = process.env.JWT_SECRET || 'expense-tracker-secret-2024';

class WebSocketManager {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // userId -> socketId
    this.socketUsers = new Map(); // socketId -> userId
    this.adminUsers = new Set(); // Track admin users
  }

  initialize(server) {
    const { Server } = require('socket.io');
    this.io = new Server(server, {
      cors: {
        origin: process.env.NODE_ENV === 'production' ? false : "*",
        methods: ["GET", "POST"]
      },
      transports: ['websocket', 'polling']
    });

    this.setupEventHandlers();
    return this.io;
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`Socket ${socket.id} connected`);

      // Authenticate socket connection with enhanced security
      socket.on('authenticate', async (data) => {
        try {
          const { token } = data;
          const clientIP = socket.handshake.address;
          const userAgent = socket.handshake.headers['user-agent'];

          // Enhanced security checks
          if (!token) {
            enhancedSecurity.logSecurityEvent('INVALID_TOKEN', {
              reason: 'No token provided',
              ip: clientIP,
              userAgent
            });
            socket.emit('auth_error', { message: 'No token provided' });
            return;
          }

          if (!enhancedSecurity.validateTokenFormat(token)) {
            enhancedSecurity.logSecurityEvent('INVALID_TOKEN', {
              reason: 'Invalid token format',
              ip: clientIP,
              userAgent
            });
            socket.emit('auth_error', { message: 'Invalid token format' });
            return;
          }

          // Rate limiting for authentication attempts
          const rateCheck = enhancedSecurity.checkRateLimit(clientIP, 'WEBSOCKET_AUTH', 10, 60000);
          if (!rateCheck.allowed) {
            enhancedSecurity.logSecurityEvent('RATE_LIMIT_EXCEEDED', {
              action: 'WEBSOCKET_AUTH',
              ip: clientIP,
              retryAfter: rateCheck.retryAfter
            });
            socket.emit('auth_error', { message: 'Too many authentication attempts' });
            return;
          }

          const decoded = jwt.verify(token, JWT_SECRET);
          const userData = getData();
          const user = Object.values(userData.users).find(u => u.id === decoded.userId);

          if (!user) {
            enhancedSecurity.detectSuspiciousActivity(clientIP, 'INVALID_USER');
            enhancedSecurity.logSecurityEvent('UNAUTHORIZED_ACCESS', {
              reason: 'User not found',
              userId: decoded.userId,
              ip: clientIP,
              userAgent
            });
            socket.emit('auth_error', { message: 'User not found' });
            return;
          }

          // Check account status
          if (user.lockUntil && user.lockUntil > Date.now()) {
            enhancedSecurity.logSecurityEvent('ACCOUNT_LOCKED', {
              userId: user.id,
              username: user.username,
              ip: clientIP
            });
            socket.emit('auth_error', { message: 'Account temporarily locked' });
            return;
          }

          // Store user-socket mapping with security context
          this.connectedUsers.set(decoded.userId, socket.id);
          this.socketUsers.set(socket.id, decoded.userId);
          
          // Check if user is admin (first user is admin by default)
          const isAdmin = user.id === Object.values(userData.users)[0]?.id;
          if (isAdmin) {
            this.adminUsers.add(decoded.userId);
          }

          socket.userId = decoded.userId;
          socket.username = user.username;
          socket.isAdmin = isAdmin;
          socket.clientIP = clientIP;
          socket.userAgent = userAgent;
          socket.authTime = Date.now();

          // Log successful authentication
          enhancedSecurity.logSecurityEvent('WEBSOCKET_AUTHENTICATED', {
            userId: user.id,
            username: user.username,
            isAdmin,
            ip: clientIP,
            userAgent
          });

          // Get user's budget state using centralized manager
          const budgetState = await budgetManager.initializeUserData(decoded.userId);

          socket.emit('authenticated', { 
            user: { id: user.id, username: user.username, isAdmin },
            budgetState
          });

          console.log(` User ${user.username} authenticated on socket ${socket.id} from ${clientIP}`);
        } catch (error) {
          console.error('Authentication error:', error);
          enhancedSecurity.logSecurityEvent('INVALID_TOKEN', {
            reason: error.message,
            ip: socket.handshake.address,
            userAgent: socket.handshake.headers['user-agent']
          });
          socket.emit('auth_error', { message: 'Invalid token' });
        }
      });

      // Handle adding funds - CENTRALIZED BUDGET MANAGEMENT
      socket.on('add_funds', async (data) => {
        if (!socket.userId) {
          socket.emit('error', { message: 'Not authenticated' });
          return;
        }

        try {
          const { amount } = data;
          if (!amount || amount <= 0) {
            socket.emit('error', { message: 'Invalid amount' });
            return;
          }

          // Use centralized budget manager for atomic operation
          const result = await budgetManager.addFunds(socket.userId, amount, socket.username);

          if (result.success) {
            // CRITICAL FIX: Broadcast to ALL connected users with the same budget state
            // Since this is a shared expense tracker, everyone should see the same budget
            this.emitToAll('funds_added', {
              transaction: result.transaction,
              budgetState: result.budgetState, // Same budget state for all users
              userId: socket.userId, // Who made the change
              timestamp: Date.now()
            });

            // Log the operation
            enhancedSecurity.logSecurityEvent('FUNDS_ADDED', {
              userId: socket.userId,
              username: socket.username,
              amount: amount,
              newAvailableBudget: result.budgetState.availableBudget
            });
          } else {
            socket.emit('error', { message: result.error || 'Failed to add funds' });
          }

        } catch (error) {
          console.error('Add funds error:', error);
          socket.emit('error', { message: 'Failed to add funds' });
        }
      });

      // Handle adding transaction - CENTRALIZED BUDGET MANAGEMENT
      socket.on('add_transaction', async (data) => {
        if (!socket.userId) {
          socket.emit('error', { message: 'Not authenticated' });
          return;
        }

        try {
          // Sanitize input data
          const sanitizedData = {
            dateOfReimbursement: data.dateOfReimbursement,
            beneficiary: data.beneficiary ? sanitize(data.beneficiary) : '',
            itemDescription: data.itemDescription ? sanitize(data.itemDescription) : '',
            invoiceNumber: data.invoiceNumber ? sanitize(data.invoiceNumber) : '',
            dateOfPurchase: data.dateOfPurchase,
            amount: data.amount,
            observations: data.observations ? sanitize(data.observations) : '',
            flightNumber: data.flightNumber ? sanitize(data.flightNumber) : '',
            numberOfLuggage: data.numberOfLuggage
          };

          // Use centralized budget manager for atomic operation
          const result = await budgetManager.addTransaction(socket.userId, sanitizedData, socket.username);

          if (result.success) {
            // CRITICAL FIX: Broadcast to ALL connected users for real-time sync
            this.emitToAll('transaction_added', {
              transaction: result.transaction,
              budgetState: result.budgetState,
              userId: socket.userId, // Who made the change
              timestamp: Date.now()
            });

            // Log the operation
            enhancedSecurity.logSecurityEvent('TRANSACTION_ADDED', {
              userId: socket.userId,
              username: socket.username,
              amount: result.transaction.amount,
              newAvailableBudget: result.budgetState.availableBudget
            });
          } else {
            socket.emit('error', { message: result.error || 'Failed to add transaction' });
          }

        } catch (error) {
          console.error('Add transaction error:', error);
          socket.emit('error', { message: 'Failed to add transaction' });
        }
      });

      // Handle editing transaction - CENTRALIZED BUDGET MANAGEMENT
      socket.on('edit_transaction', async (data) => {
        if (!socket.userId) {
          socket.emit('error', { message: 'Not authenticated' });
          return;
        }

        try {
          const { transactionId, updates } = data;

          // Sanitize updates
          const sanitizedUpdates = {};
          Object.keys(updates).forEach(key => {
            if (updates[key] !== undefined && updates[key] !== null) {
              if (typeof updates[key] === 'string') {
                sanitizedUpdates[key] = sanitize(updates[key]);
              } else {
                sanitizedUpdates[key] = updates[key];
              }
            }
          });

          // Use centralized budget manager for atomic operation
          const result = await budgetManager.editTransaction(socket.userId, transactionId, sanitizedUpdates, socket.username);

          if (result.success) {
            // CRITICAL FIX: Broadcast to ALL connected users for real-time sync
            this.emitToAll('transaction_updated', {
              transaction: result.transaction,
              budgetState: result.budgetState,
              userId: socket.userId, // Who made the change
              timestamp: Date.now()
            });

            // Log the operation
            enhancedSecurity.logSecurityEvent('TRANSACTION_EDITED', {
              userId: socket.userId,
              username: socket.username,
              transactionId: transactionId,
              newAvailableBudget: result.budgetState.availableBudget
            });
          } else {
            socket.emit('error', { message: result.error || 'Failed to edit transaction' });
          }

        } catch (error) {
          console.error('Edit transaction error:', error);
          socket.emit('error', { message: 'Failed to edit transaction' });
        }
      });

      // Handle deleting transaction - CENTRALIZED BUDGET MANAGEMENT
      socket.on('delete_transaction', async (data) => {
        if (!socket.userId) {
          socket.emit('error', { message: 'Not authenticated' });
          return;
        }

        try {
          const { transactionId } = data;

          // Use centralized budget manager for atomic operation
          const result = await budgetManager.deleteTransaction(socket.userId, transactionId, socket.username);

          if (result.success) {
            // CRITICAL FIX: Broadcast to ALL connected users for real-time sync
            this.emitToAll('transaction_deleted', {
              transactionId,
              budgetState: result.budgetState,
              userId: socket.userId, // Who made the change
              timestamp: Date.now()
            });

            // Log the operation
            enhancedSecurity.logSecurityEvent('TRANSACTION_DELETED', {
              userId: socket.userId,
              username: socket.username,
              transactionId: transactionId,
              deletedAmount: result.deletedTransaction.amount,
              newAvailableBudget: result.budgetState.availableBudget
            });
          } else {
            socket.emit('error', { message: result.error || 'Failed to delete transaction' });
          }

        } catch (error) {
          console.error('Delete transaction error:', error);
          socket.emit('error', { message: 'Failed to delete transaction' });
        }
      });

      // Handle BD number assignment - CENTRALIZED BUDGET MANAGEMENT
      socket.on('assign_bd_number', async (data) => {
        if (!socket.userId) {
          socket.emit('error', { message: 'Not authenticated' });
          return;
        }

        try {
          const { transactionIds, bdNumber } = data;

          // Use centralized budget manager for atomic operation
          const result = await budgetManager.assignBdNumbers(socket.userId, transactionIds, bdNumber, socket.username);

          if (result.success) {
            // CRITICAL FIX: Broadcast to ALL connected users for real-time sync
            this.emitToAll('bd_assigned', {
              bdNumber: result.bdNumber,
              transactionIds: result.transactionIds,
              count: result.updatedCount,
              budgetState: result.budgetState,
              userId: socket.userId, // Who made the change
              timestamp: Date.now()
            });

            // Log the operation
            enhancedSecurity.logSecurityEvent('BD_ASSIGNED', {
              userId: socket.userId,
              username: socket.username,
              bdNumber: result.bdNumber,
              transactionCount: result.updatedCount
            });
          } else {
            socket.emit('error', { message: result.error || 'Failed to assign BD number' });
          }

        } catch (error) {
          console.error('BD assignment error:', error);
          socket.emit('error', { message: 'Failed to assign BD number' });
        }
      });

      // Admin functions
      socket.on('admin_create_user', async (data) => {
        if (!socket.userId || !socket.isAdmin) {
          socket.emit('error', { message: 'Access denied' });
          return;
        }

        try {
          const { username, password } = data;
          const userData = getData();

          if (userData.users[username]) {
            socket.emit('error', { message: 'Username already exists' });
            return;
          }

          const bcrypt = require('bcrypt');
          const hashedPassword = await bcrypt.hash(password, 12);
          const userId = Date.now().toString();

          userData.users[username] = {
            id: userId,
            username,
            password: hashedPassword,
            createdAt: new Date().toISOString(),
            createdBy: socket.username,
            loginAttempts: 0,
            lockUntil: null
          };

          userData.userData[userId] = {
            budget: 0,
            transactions: [],
            beneficiaries: [],
            itemDescriptions: ['Sky Cap'],
            flightNumbers: ['AT200', 'AT201']
          };

          await saveData();

          socket.emit('user_created', {
            user: { id: userId, username },
            credentials: { username, password }
          });

        } catch (error) {
          console.error('Create user error:', error);
          socket.emit('error', { message: 'Failed to create user' });
        }
      });

      socket.on('admin_get_users', async () => {
        if (!socket.userId || !socket.isAdmin) {
          socket.emit('error', { message: 'Access denied' });
          return;
        }

        try {
          const userData = getData();
          const users = Object.values(userData.users).map(user => ({
            id: user.id,
            username: user.username,
            createdAt: user.createdAt,
            createdBy: user.createdBy,
            lastLogin: user.lastLogin,
            isLocked: user.lockUntil && user.lockUntil > Date.now()
          }));

          socket.emit('users_list', { users });
        } catch (error) {
          console.error('Get users error:', error);
          socket.emit('error', { message: 'Failed to get users' });
        }
      });

      socket.on('admin_delete_user', async (data) => {
        if (!socket.userId || !socket.isAdmin) {
          socket.emit('error', { message: 'Access denied' });
          return;
        }

        try {
          const { userId } = data;
          const userData = getData();
          
          // Find and delete user
          const userToDelete = Object.entries(userData.users).find(([_, user]) => user.id === userId);
          if (!userToDelete) {
            socket.emit('error', { message: 'User not found' });
            return;
          }

          const [username] = userToDelete;
          delete userData.users[username];
          delete userData.userData[userId];

          // Disconnect user if online
          if (this.connectedUsers.has(userId)) {
            const socketId = this.connectedUsers.get(userId);
            this.io.to(socketId).emit('account_deleted');
            this.io.sockets.sockets.get(socketId)?.disconnect();
          }

          await saveData();
          socket.emit('user_deleted', { userId });

        } catch (error) {
          console.error('Delete user error:', error);
          socket.emit('error', { message: 'Failed to delete user' });
        }
      });

      socket.on('admin_reset_password', async (data) => {
        if (!socket.userId || !socket.isAdmin) {
          socket.emit('error', { message: 'Access denied' });
          return;
        }

        try {
          const { userId, newPassword } = data;
          const userData = getData();
          
          const userToUpdate = Object.values(userData.users).find(u => u.id === userId);
          if (!userToUpdate) {
            socket.emit('error', { message: 'User not found' });
            return;
          }

          const bcrypt = require('bcrypt');
          userToUpdate.password = await bcrypt.hash(newPassword, 12);
          userToUpdate.passwordResetBy = socket.username;
          userToUpdate.passwordResetAt = new Date().toISOString();

          await saveData();
          socket.emit('password_reset', { userId, newPassword });

        } catch (error) {
          console.error('Reset password error:', error);
          socket.emit('error', { message: 'Failed to reset password' });
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`Socket ${socket.id} disconnected`);
        if (socket.userId) {
          this.connectedUsers.delete(socket.userId);
          this.adminUsers.delete(socket.userId);
        }
        this.socketUsers.delete(socket.id);
      });
    });
  }

  emitToUser(userId, event, data) {
    const socketId = this.connectedUsers.get(userId);
    if (socketId) {
      this.io.to(socketId).emit(event, data);
    }
  }

  emitToAll(event, data) {
    this.io.emit(event, data);
  }

  emitToAdmins(event, data) {
    this.adminUsers.forEach(userId => {
      this.emitToUser(userId, event, data);
    });
  }
}

module.exports = new WebSocketManager();