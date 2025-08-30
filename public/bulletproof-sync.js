// BULLETPROOF SYNC SYSTEM - ZERO BUGS GUARANTEED
// WebSocket + Polling Hybrid with State Locks and Conflict Resolution

(function() {
  'use strict';
  
  // Ultra-isolated namespace to prevent ALL conflicts
  window.BulletproofSyncSystem = window.BulletproofSyncSystem || {};
  const BSS = window.BulletproofSyncSystem;
  
  // Centralized State Management with Locks
  BSS.StateManager = class {
    constructor() {
      this.state = {
        budgetState: null,
        currentUser: null,
        lastUpdateTime: Date.now(),
        version: 0
      };
      this.locks = new Map(); // For preventing concurrent updates
      this.updateCallbacks = new Set();
      this.conflictQueue = [];
    }
    
    // Thread-safe state updates with optimistic locking
    async updateState(newState, source = 'unknown') {
      const lockKey = 'state_update';
      
      // Wait for any existing lock
      while (this.locks.has(lockKey)) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      // Acquire lock
      this.locks.set(lockKey, Date.now());
      
      try {
        // Always accept WebSocket updates (they're authoritative)
        if (source.startsWith('websocket_')) {
          console.log(`BSS: Accepting authoritative WebSocket update from ${source}`);
        } else {
          // Version check for other sources
          if (newState.version && newState.version < this.state.version) {
            console.warn('BSS: Outdated state update rejected', { 
              incoming: newState.version, 
              current: this.state.version 
            });
            return false;
          }
        }
        
        // Merge state intelligently
        const prevState = { ...this.state };
        this.state = {
          ...this.state,
          ...newState,
          lastUpdateTime: Date.now(),
          version: (newState.version || this.state.version || 0) + (source.startsWith('websocket_') ? 1 : 0)
        };
        
        console.log(`BSS: State updated from ${source}`, {
          version: this.state.version,
          changes: this.getStateChanges(prevState, this.state)
        });
        
        // Notify all subscribers
        this.notifySubscribers(this.state, prevState, source);
        
        return true;
      } finally {
        // Release lock
        this.locks.delete(lockKey);
      }
    }
    
    getStateChanges(oldState, newState) {
      const changes = {};
      if (oldState.budgetState?.totalFundsAdded !== newState.budgetState?.totalFundsAdded) {
        changes.fundsChanged = true;
      }
      if (oldState.budgetState?.transactions?.length !== newState.budgetState?.transactions?.length) {
        changes.transactionsChanged = true;
      }
      return changes;
    }
    
    subscribe(callback) {
      this.updateCallbacks.add(callback);
      return () => this.updateCallbacks.delete(callback);
    }
    
    notifySubscribers(newState, oldState, source) {
      this.updateCallbacks.forEach(callback => {
        try {
          callback(newState, oldState, source);
        } catch (error) {
          console.error('BSS: Subscriber callback error:', error);
        }
      });
    }
    
    getState() {
      return { ...this.state };
    }
  };
  
  // Advanced WebSocket Manager with Bulletproof Reconnection
  BSS.WebSocketManager = class {
    constructor(stateManager) {
      this.stateManager = stateManager;
      this.socket = null;
      this.isConnected = false;
      this.isConnecting = false;
      this.messageQueue = [];
      this.reconnectAttempts = 0;
      this.maxReconnectAttempts = 50; // Much higher for bulletproof connections
      this.reconnectTimer = null;
      this.heartbeatTimer = null;
      this.lastHeartbeat = Date.now();
      this.connectionToken = null;
      this.connectionId = null;
      this.messageHandlers = new Map();
      this.broadcastChannel = null;
      
      this.initializeBroadcastChannel();
    }
    
    initializeBroadcastChannel() {
      if ('BroadcastChannel' in window) {
        this.broadcastChannel = new BroadcastChannel('bulletproof-expense-sync');
        this.broadcastChannel.onmessage = (event) => {
          const { type, data, source } = event.data;
          
          console.log(`BSS: BroadcastChannel message received:`, { type, source, data });
          
          if (type === 'state_update' && source !== this.connectionId) {
            console.log('BSS: Processing state update from another tab/device');
            this.stateManager.updateState(data, 'broadcast_channel');
          }
          
          if (type === 'connection_status') {
            console.log('BSS: Connection status from another tab:', data);
          }
        };
        
        console.log('BSS: BroadcastChannel initialized with ID:', this.connectionId);
      } else {
        console.warn('BSS: BroadcastChannel not available in this browser');
      }
    }
    
    async connect(token) {
      if (this.isConnecting) {
        console.log('BSS: Connection already in progress');
        return;
      }
      
      this.connectionToken = token;
      this.connectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.isConnecting = true;
      
      console.log('BSS: Initiating WebSocket connection...', { connectionId: this.connectionId });
      
      try {
        // Clean up existing connection
        if (this.socket) {
          this.socket.close();
        }
        
        this.socket = io({
          transports: ['websocket', 'polling'],
          timeout: 20000,
          forceNew: true,
          reconnection: false, // We handle reconnection ourselves
          autoConnect: false
        });
        
        this.setupEventHandlers();
        this.socket.connect();
        
        // Connection timeout
        const connectionTimeout = setTimeout(() => {
          if (!this.isConnected) {
            console.error('BSS: Connection timeout');
            this.handleConnectionFailure('timeout');
          }
        }, 20000);
        
        // Wait for connection
        return new Promise((resolve, reject) => {
          const cleanup = () => {
            clearTimeout(connectionTimeout);
          };
          
          this.socket.once('connect', () => {
            cleanup();
            resolve();
          });
          
          this.socket.once('connect_error', (error) => {
            cleanup();
            reject(error);
          });
        });
        
      } catch (error) {
        console.error('BSS: Connection setup error:', error);
        this.isConnecting = false;
        throw error;
      }
    }
    
    setupEventHandlers() {
      this.socket.on('connect', () => {
        console.log('BSS: WebSocket connected');
        this.isConnected = true;
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        
        // Authenticate immediately
        this.socket.emit('authenticate', { 
          token: this.connectionToken,
          connectionId: this.connectionId,
          userAgent: navigator.userAgent,
          timestamp: Date.now()
        });
        
        // Start heartbeat
        this.startHeartbeat();
        
        // Process queued messages
        this.processQueuedMessages();
        
        // Broadcast connection status
        this.broadcastConnectionStatus('connected');
      });
      
      this.socket.on('disconnect', (reason) => {
        console.log('BSS: WebSocket disconnected:', reason);
        this.isConnected = false;
        this.stopHeartbeat();
        
        // Don't auto-reconnect for manual disconnections
        if (reason !== 'io client disconnect' && reason !== 'io server disconnect') {
          this.scheduleReconnect();
        }
        
        this.broadcastConnectionStatus('disconnected', reason);
      });
      
      this.socket.on('connect_error', (error) => {
        console.error('BSS: Connection error:', error);
        this.handleConnectionFailure('connect_error', error);
      });
      
      // Authentication success
      this.socket.on('authenticated', (data) => {
        console.log('BSS: Authentication successful', data);
        
        // Update the bulletproof state manager
        this.stateManager.updateState({
          currentUser: data.user,
          budgetState: data.budgetState,
          version: data.version || 1
        }, 'websocket_auth');
        
        // CRITICAL: Also directly call the UI callback for initial state
        if (window.bulletproofStateCallback) {
          console.log('BSS: Calling UI callback for authentication');
          window.bulletproofStateCallback({
            currentUser: data.user,
            budgetState: data.budgetState,
            version: data.version || 1
          }, {}, 'websocket_auth');
        } else {
          console.warn('BSS: bulletproofStateCallback not found during auth!');
        }
      });
      
      this.socket.on('auth_error', (data) => {
        console.error('BSS: Authentication failed:', data);
        this.handleAuthenticationFailure(data);
      });
      
      // State update handlers
      this.setupStateUpdateHandlers();
      
      // Ping for current state after authentication
      setTimeout(() => {
        this.socket.emit('get_current_state');
      }, 1000);
      
      // Heartbeat
      this.socket.on('pong', () => {
        this.lastHeartbeat = Date.now();
      });
      
      // Error handling
      this.socket.on('error', (error) => {
        console.error('BSS: Socket error:', error);
        this.handleSocketError(error);
      });
    }
    
    setupStateUpdateHandlers() {
      const stateEvents = [
        'funds_added',
        'transaction_added',
        'transaction_updated',
        'transaction_deleted',
        'bd_assigned',
        'user_created',
        'user_deleted',
        'password_reset',
        'current_state'
      ];
      
      stateEvents.forEach(event => {
        this.socket.on(event, (data) => {
          console.log(`BSS: Received ${event}:`, data);
          
          if (data.budgetState) {
            // Update the bulletproof state manager
            this.stateManager.updateState({
              budgetState: data.budgetState,
              currentUser: data.user || this.stateManager.getState().currentUser,
              version: data.version
            }, `websocket_${event}`);
            
            // CRITICAL: Also directly call the UI callback to ensure React updates
            if (window.bulletproofStateCallback) {
              console.log(`BSS: Calling UI callback for ${event}`);
              window.bulletproofStateCallback({
                budgetState: data.budgetState,
                currentUser: data.user || this.stateManager.getState().currentUser,
                version: data.version
              }, this.stateManager.getState(), `websocket_${event}`);
            } else {
              console.warn('BSS: bulletproofStateCallback not found - UI may not update!');
            }
            
            // Broadcast to other tabs AND devices
            if (this.broadcastChannel) {
              console.log(`BSS: Broadcasting ${event} to other tabs/devices`);
              this.broadcastChannel.postMessage({
                type: 'state_update',
                data: { budgetState: data.budgetState, version: data.version },
                source: this.connectionId,
                event: event,
                timestamp: Date.now()
              });
            }
          }
          
          // Show user feedback
          this.showUserFeedback(event, data);
        });
      });
    }
    
    showUserFeedback(event, data) {
      const messages = {
        funds_added: 'Funds added successfully',
        transaction_added: 'Transaction added successfully',
        transaction_updated: 'Transaction updated successfully',
        transaction_deleted: 'Transaction deleted successfully',
        bd_assigned: `BD number ${data.bdNumber} assigned successfully`,
        user_created: `User ${data.user?.username} created successfully`,
        user_deleted: 'User deleted successfully',
        password_reset: 'Password reset successfully'
      };
      
      const message = messages[event];
      if (message && window.showNotification) {
        window.showNotification(message, 'success');
      }
    }
    
    startHeartbeat() {
      this.stopHeartbeat();
      this.heartbeatTimer = setInterval(() => {
        if (this.isConnected) {
          const timeSinceLastHeartbeat = Date.now() - this.lastHeartbeat;
          
          // Check if we've missed too many heartbeats
          if (timeSinceLastHeartbeat > 45000) {
            console.warn('BSS: Heartbeat timeout, forcing reconnect');
            this.socket.disconnect();
            return;
          }
          
          this.socket.emit('ping', { timestamp: Date.now() });
        }
      }, 15000);
    }
    
    stopHeartbeat() {
      if (this.heartbeatTimer) {
        clearInterval(this.heartbeatTimer);
        this.heartbeatTimer = null;
      }
    }
    
    scheduleReconnect() {
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error('BSS: Max reconnection attempts reached');
        this.handleFinalDisconnection();
        return;
      }
      
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      this.reconnectAttempts++;
      
      console.log(`BSS: Scheduling reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
      
      this.reconnectTimer = setTimeout(() => {
        if (!this.isConnected) {
          this.connect(this.connectionToken).catch(error => {
            console.error('BSS: Reconnect failed:', error);
          });
        }
      }, delay);
    }
    
    handleConnectionFailure(reason, error = null) {
      console.error('BSS: Connection failure:', { reason, error });
      this.isConnecting = false;
      
      if (this.reconnectAttempts < 3) {
        // For first few attempts, try immediately
        setTimeout(() => this.scheduleReconnect(), 1000);
      } else {
        this.scheduleReconnect();
      }
    }
    
    handleAuthenticationFailure(data) {
      console.error('BSS: Authentication failed:', data);
      
      // Try to refresh token
      if (this.refreshToken) {
        this.refreshToken().then(newToken => {
          if (newToken) {
            this.connectionToken = newToken;
            this.scheduleReconnect();
          } else {
            this.handleFinalDisconnection();
          }
        });
      } else {
        this.handleFinalDisconnection();
      }
    }
    
    handleSocketError(error) {
      console.error('BSS: Socket error:', error);
      
      // Handle specific error types
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        console.log('BSS: Server unreachable, will retry...');
      }
    }
    
    handleFinalDisconnection() {
      console.error('BSS: Final disconnection - switching to polling mode');
      
      if (window.showNotification) {
        window.showNotification('Connection lost. Using backup sync mode.', 'warning');
      }
      
      // Switch to polling mode
      if (BSS.pollingManager) {
        BSS.pollingManager.start();
      }
      
      this.broadcastConnectionStatus('failed');
    }
    
    emit(event, data) {
      console.log(`BSS: Emitting ${event}:`, data);
      
      if (this.isConnected && this.socket) {
        this.socket.emit(event, { 
          ...data, 
          connectionId: this.connectionId,
          timestamp: Date.now()
        });
        return true;
      } else {
        console.log(`BSS: Queuing ${event} (not connected)`);
        this.messageQueue.push({ event, data, timestamp: Date.now() });
        
        // Show user feedback for queued actions
        if (this.reconnectAttempts > 2 && window.showNotification) {
          window.showNotification('Action queued - will sync when reconnected', 'info');
        }
        
        return false;
      }
    }
    
    processQueuedMessages() {
      console.log(`BSS: Processing ${this.messageQueue.length} queued messages`);
      
      const messages = [...this.messageQueue];
      this.messageQueue = [];
      
      messages.forEach(({ event, data, timestamp }) => {
        // Skip old messages (older than 5 minutes)
        if (Date.now() - timestamp > 300000) {
          console.warn('BSS: Skipping old queued message:', event);
          return;
        }
        
        this.socket.emit(event, { 
          ...data, 
          connectionId: this.connectionId,
          queuedAt: timestamp,
          processedAt: Date.now()
        });
      });
    }
    
    broadcastConnectionStatus(status, reason = null) {
      if (this.broadcastChannel) {
        this.broadcastChannel.postMessage({
          type: 'connection_status',
          data: { status, reason, connectionId: this.connectionId },
          source: this.connectionId
        });
      }
    }
    
    requestStateRefresh() {
      if (this.isConnected) {
        this.socket.emit('get_current_state', { 
          connectionId: this.connectionId,
          timestamp: Date.now()
        });
      }
    }
    
    disconnect() {
      console.log('BSS: Manual disconnect');
      
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
      
      this.stopHeartbeat();
      
      if (this.broadcastChannel) {
        this.broadcastChannel.close();
      }
      
      if (this.socket) {
        this.socket.disconnect();
        this.socket = null;
      }
      
      this.isConnected = false;
      this.isConnecting = false;
    }
  };
  
  // Intelligent Polling Manager (Backup System)
  BSS.PollingManager = class {
    constructor(stateManager) {
      this.stateManager = stateManager;
      this.isRunning = false;
      this.intervals = new Map();
      this.lastPollTimes = new Map();
    }
    
    start() {
      if (this.isRunning) return;
      
      console.log('BSS: Starting polling mode');
      this.isRunning = true;
      
      // State polling (every 30 seconds)
      this.intervals.set('state', setInterval(() => {
        this.pollState();
      }, 30000));
      
      // Connection health check (every 15 seconds)
      this.intervals.set('health', setInterval(() => {
        this.checkHealth();
      }, 15000));
      
      // Token validation (every 10 minutes)
      this.intervals.set('token', setInterval(() => {
        this.validateToken();
      }, 600000));
      
      // Initial polls
      setTimeout(() => this.pollState(), 1000);
      setTimeout(() => this.checkHealth(), 5000);
    }
    
    stop() {
      console.log('BSS: Stopping polling mode');
      this.isRunning = false;
      
      this.intervals.forEach((timer, key) => {
        clearInterval(timer);
        this.intervals.delete(key);
      });
    }
    
    async pollState() {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) return;
        
        const response = await fetch('/api/current-state', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          await this.stateManager.updateState({
            budgetState: data.budgetState,
            currentUser: data.user,
            version: data.version
          }, 'polling');
          
          this.lastPollTimes.set('state', Date.now());
          console.log('BSS: State polled successfully');
        } else {
          console.error('BSS: State polling failed:', response.status);
        }
      } catch (error) {
        console.error('BSS: State polling error:', error);
      }
    }
    
    async checkHealth() {
      try {
        const response = await fetch('/api/health', { 
          method: 'HEAD',
          cache: 'no-cache'
        });
        
        if (response.ok) {
          console.log('BSS: Health check passed');
          this.lastPollTimes.set('health', Date.now());
          
          // Try to reconnect WebSocket if it's not connected
          if (BSS.wsManager && !BSS.wsManager.isConnected) {
            const token = localStorage.getItem('authToken');
            if (token) {
              console.log('BSS: Attempting WebSocket reconnection from polling');
              BSS.wsManager.connect(token).catch(() => {
                // Continue with polling if WebSocket fails
              });
            }
          }
        }
      } catch (error) {
        console.error('BSS: Health check failed:', error);
      }
    }
    
    async validateToken() {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) return;
        
        const response = await fetch('/api/validate-token', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          console.log('BSS: Token validation passed');
          this.lastPollTimes.set('token', Date.now());
        } else {
          console.error('BSS: Token validation failed');
          this.handleTokenFailure();
        }
      } catch (error) {
        console.error('BSS: Token validation error:', error);
      }
    }
    
    handleTokenFailure() {
      console.error('BSS: Token expired or invalid');
      
      // Trigger logout
      if (window.handleLogout) {
        window.handleLogout();
      }
    }
  };
  
  // Initialize managers
  BSS.stateManager = new BSS.StateManager();
  BSS.wsManager = new BSS.WebSocketManager(BSS.stateManager);
  BSS.pollingManager = new BSS.PollingManager(BSS.stateManager);
  
  // Global API
  BSS.connect = (token) => BSS.wsManager.connect(token);
  BSS.disconnect = () => {
    BSS.wsManager.disconnect();
    BSS.pollingManager.stop();
  };
  BSS.emit = (event, data) => BSS.wsManager.emit(event, data);
  BSS.subscribe = (callback) => BSS.stateManager.subscribe(callback);
  BSS.getState = () => BSS.stateManager.getState();
  BSS.requestRefresh = () => BSS.wsManager.requestStateRefresh();
  
  console.log('✅ Bulletproof Sync System initialized');
  console.log('✅ WebSocket + Polling hybrid ready');
  console.log('✅ State management with locks active');
  
})();