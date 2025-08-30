// CLEAN WEBSOCKET MANAGER - SIMPLE & RELIABLE
// Replaces the complex bulletproof-sync system with a simple, bug-free approach

(function() {
  'use strict';

  // Debug logger for easy troubleshooting
  const WS_DEBUG = true;
  function log(type, message, data = null) {
    if (!WS_DEBUG) return;
    const timestamp = new Date().toISOString().substr(11, 8);
    console.log(`[WS-${type}] ${timestamp} ${message}`, data || '');
  }

  function error(message, data = null) {
    console.error(`[WS-ERROR] ${message}`, data || '');
  }

  // Main WebSocket Manager Class
  class WebSocketManager {
    constructor() {
      this.socket = null;
      this.isConnected = false;
      this.isConnecting = false;
      this.token = null;
      this.reconnectAttempts = 0;
      this.maxReconnectAttempts = 10;
      this.reconnectTimer = null;
      this.messageQueue = [];
      this.eventHandlers = new Map();
      this.stateUpdateCallbacks = new Set(); // Multiple callbacks support
      this.connectionStatusCallbacks = new Set(); // Multiple callbacks support
      
      // Bind methods to preserve 'this'
      this.onConnect = this.onConnect.bind(this);
      this.onDisconnect = this.onDisconnect.bind(this);
      this.onConnectError = this.onConnectError.bind(this);
      this.onAuthenticated = this.onAuthenticated.bind(this);
      this.onAuthError = this.onAuthError.bind(this);
      this.onError = this.onError.bind(this);

      log('INIT', 'WebSocket Manager initialized');
    }

    // Connect to WebSocket server
    async connect(authToken) {
      if (this.isConnecting) {
        log('CONNECT', 'Already connecting, skipping...');
        return;
      }

      if (this.isConnected) {
        log('CONNECT', 'Already connected');
        return;
      }

      this.token = authToken;
      this.isConnecting = true;
      this.reconnectAttempts = 0;

      log('CONNECT', 'Connecting to WebSocket server...');

      try {
        // Clean up existing connection
        if (this.socket) {
          this.socket.disconnect();
        }

        // Create new Socket.io connection
        this.socket = io({
          transports: ['websocket', 'polling'],
          timeout: 10000,
          reconnection: false, // We handle reconnection manually
          autoConnect: false
        });

        this.setupEventHandlers();
        this.socket.connect();

        // Wait for connection with timeout
        await this.waitForConnection(10000);
        log('CONNECT', 'Connection established successfully');

      } catch (err) {
        error('Connection failed', err);
        this.isConnecting = false;
        throw err;
      }
    }

    // Wait for connection to be established
    waitForConnection(timeout = 10000) {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error('Connection timeout'));
        }, timeout);

        const cleanup = () => {
          clearTimeout(timer);
        };

        this.socket.once('connect', () => {
          cleanup();
          resolve();
        });

        this.socket.once('connect_error', (err) => {
          cleanup();
          reject(err);
        });
      });
    }

    // Setup all event handlers
    setupEventHandlers() {
      if (!this.socket) return;

      // Connection events
      this.socket.on('connect', this.onConnect);
      this.socket.on('disconnect', this.onDisconnect);
      this.socket.on('connect_error', this.onConnectError);

      // Authentication events
      this.socket.on('authenticated', this.onAuthenticated);
      this.socket.on('auth_error', this.onAuthError);

      // Error handling
      this.socket.on('error', this.onError);

      // Real-time data events
      this.setupDataEventHandlers();
    }

    // Setup handlers for real-time data updates
    setupDataEventHandlers() {
      const dataEvents = [
        'funds_added',
        'transaction_added', 
        'transaction_updated',
        'transaction_deleted',
        'bd_assigned',
        'user_created',
        'users_list',
        'user_deleted',
        'password_reset'
      ];

      dataEvents.forEach(event => {
        this.socket.on(event, (data) => {
          log('DATA', `Received ${event}`, data);
          
          // Trigger state update callbacks for all registered callbacks
          this.stateUpdateCallbacks.forEach(callback => {
            try {
              callback(event, data);
            } catch (err) {
              error(`Error in state update callback for ${event}`, err);
            }
          });

          // Show user notification
          this.showNotificationForEvent(event, data);
        });
      });
    }

    // Connection established
    onConnect() {
      log('CONNECT', 'Socket connected, authenticating...');
      this.isConnected = true;
      this.isConnecting = false;
      this.reconnectAttempts = 0;

      // Clear reconnect timer
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }

      // Authenticate
      this.socket.emit('authenticate', { 
        token: this.token,
        timestamp: Date.now()
      });

      // Update connection status
      this.updateConnectionStatus('connected');
    }

    // Socket disconnected
    onDisconnect(reason) {
      log('DISCONNECT', `Socket disconnected: ${reason}`);
      this.isConnected = false;
      this.updateConnectionStatus('disconnected', reason);

      // Auto-reconnect unless manually disconnected
      if (reason !== 'io client disconnect') {
        this.scheduleReconnect();
      }
    }

    // Connection error
    onConnectError(err) {
      error('Connection error', err);
      this.isConnecting = false;
      this.scheduleReconnect();
    }

    // Authentication successful
    onAuthenticated(data) {
      log('AUTH', 'Authentication successful', data);
      
      // Process queued messages
      this.processQueuedMessages();
      
      // Trigger initial state update for all callbacks
      if (data) {
        this.stateUpdateCallbacks.forEach(callback => {
          try {
            callback('authenticated', data);
          } catch (err) {
            error('Error in state update callback for authenticated', err);
          }
        });
      }
    }

    // Authentication failed
    onAuthError(data) {
      error('Authentication failed', data);
      this.updateConnectionStatus('auth_failed', data.message);
      
      // Don't reconnect on auth failure - user needs to re-login
      if (window.handleLogout) {
        window.handleLogout();
      }
    }

    // Socket error
    onError(err) {
      error('Socket error', err);
    }

    // Schedule reconnection with exponential backoff
    scheduleReconnect() {
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        error('Max reconnection attempts reached');
        this.updateConnectionStatus('failed');
        return;
      }

      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      this.reconnectAttempts++;

      log('RECONNECT', `Scheduling reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);

      this.reconnectTimer = setTimeout(() => {
        if (!this.isConnected && this.token) {
          log('RECONNECT', 'Attempting to reconnect...');
          this.connect(this.token).catch(err => {
            error('Reconnect failed', err);
          });
        }
      }, delay);
    }

    // Emit event to server
    emit(event, data = {}) {
      if (!this.isConnected || !this.socket) {
        log('QUEUE', `Queuing ${event} - not connected`, data);
        this.messageQueue.push({ event, data, timestamp: Date.now() });
        
        // Show user feedback for important actions
        if (['add_transaction', 'add_funds', 'edit_transaction', 'delete_transaction'].includes(event)) {
          this.showNotification('Action queued - will sync when reconnected', 'info');
        }
        
        return false;
      }

      log('EMIT', event, data);
      this.socket.emit(event, data);
      return true;
    }

    // Process queued messages
    processQueuedMessages() {
      if (this.messageQueue.length === 0) return;
      
      log('QUEUE', `Processing ${this.messageQueue.length} queued messages`);
      
      const messages = [...this.messageQueue];
      this.messageQueue = [];

      messages.forEach(({ event, data, timestamp }) => {
        // Skip old messages (older than 5 minutes)
        if (Date.now() - timestamp > 300000) {
          log('QUEUE', `Skipping old message: ${event}`);
          return;
        }
        
        this.socket.emit(event, data);
      });
    }

    // Add callback for state updates (supports multiple callbacks)
    onStateUpdate(callback) {
      this.stateUpdateCallbacks.add(callback);
      
      // Return cleanup function
      return () => {
        this.stateUpdateCallbacks.delete(callback);
      };
    }

    // Add callback for connection status changes (supports multiple callbacks)
    onConnectionStatus(callback) {
      this.connectionStatusCallbacks.add(callback);
      
      // Return cleanup function
      return () => {
        this.connectionStatusCallbacks.delete(callback);
      };
    }

    // Update connection status
    updateConnectionStatus(status, message = null) {
      log('STATUS', status, message);
      
      // Notify all connection status callbacks
      this.connectionStatusCallbacks.forEach(callback => {
        try {
          callback(status, message);
        } catch (err) {
          error('Error in connection status callback', err);
        }
      });
    }

    // Show notification for events
    showNotificationForEvent(event, data) {
      if (!window.showNotification) return;

      const messages = {
        funds_added: 'Funds added successfully',
        transaction_added: 'Transaction added successfully', 
        transaction_updated: 'Transaction updated successfully',
        transaction_deleted: 'Transaction deleted successfully',
        bd_assigned: `BD number assigned successfully`,
        user_created: 'User created successfully',
        user_deleted: 'User deleted successfully',
        password_reset: 'Password reset successfully'
      };

      const message = messages[event];
      if (message) {
        window.showNotification(message, 'success');
      }
    }

    // Show notification
    showNotification(message, type = 'info') {
      if (window.showNotification) {
        window.showNotification(message, type);
      }
    }

    // Disconnect
    disconnect() {
      log('DISCONNECT', 'Manual disconnect');
      
      // Clear reconnect timer
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }

      // Disconnect socket
      if (this.socket) {
        this.socket.disconnect();
        this.socket = null;
      }

      this.isConnected = false;
      this.isConnecting = false;
      this.token = null;
      this.messageQueue = [];
    }

    // Get connection status
    getStatus() {
      return {
        connected: this.isConnected,
        connecting: this.isConnecting,
        reconnectAttempts: this.reconnectAttempts,
        queuedMessages: this.messageQueue.length
      };
    }
  }

  // Offline/Online Handler
  class OfflineHandler {
    constructor(wsManager) {
      this.wsManager = wsManager;
      this.isOnline = navigator.onLine;
      this.setupEventListeners();
    }

    setupEventListeners() {
      window.addEventListener('online', () => {
        log('OFFLINE', 'Back online');
        this.isOnline = true;
        this.wsManager.showNotification('Connection restored', 'success');
        
        // Reconnect if needed
        if (!this.wsManager.isConnected && this.wsManager.token) {
          this.wsManager.connect(this.wsManager.token).catch(err => {
            error('Failed to reconnect after coming online', err);
          });
        }
      });

      window.addEventListener('offline', () => {
        log('OFFLINE', 'Gone offline');
        this.isOnline = false;
        this.wsManager.showNotification('You are offline - actions will be queued', 'warning');
      });
    }
  }

  // Create global instance
  window.WebSocketManager = WebSocketManager;
  window.wsManager = new WebSocketManager();
  window.offlineHandler = new OfflineHandler(window.wsManager);

  log('INIT', 'Clean WebSocket system initialized');
  
})();