// REACT WEBSOCKET HOOK - CLEAN INTEGRATION
// Provides clean React integration with the WebSocket manager

(function() {
  'use strict';

  // React WebSocket Hook
  function useWebSocket() {
    const [connectionStatus, setConnectionStatus] = React.useState('disconnected');
    const [budgetState, setBudgetState] = React.useState({
      totalFundsAdded: 0,
      totalExpenses: 0,
      availableBudget: 0,
      transactions: [],
      beneficiaries: [],
      itemDescriptions: ['Sky Cap'],
      flightNumbers: ['AT200', 'AT201']
    });
    const [currentUser, setCurrentUser] = React.useState(null);
    const [users, setUsers] = React.useState([]); // For admin panel

    // Initialize WebSocket connection
    const connectWebSocket = React.useCallback(async (token) => {
      try {
        setConnectionStatus('connecting');
        
        // Setup state update handler
        window.wsManager.onStateUpdate((event, data) => {
          console.log(`[useWebSocket] State update: ${event}`, data);
          
          // Handle authentication
          if (event === 'authenticated') {
            if (data.user) setCurrentUser(data.user);
            if (data.budgetState) setBudgetState(data.budgetState);
            return;
          }

          // Handle budget state updates
          if (data.budgetState) {
            setBudgetState(data.budgetState);
          }

          // Handle user management updates
          if (event === 'users_list' && data.users) {
            setUsers(data.users);
          } else if (event === 'user_created' && data.user) {
            setUsers(prev => [...prev, data.user]);
          } else if (event === 'user_deleted' && data.userId) {
            setUsers(prev => prev.filter(u => u.id !== data.userId));
          }
        });

        // Setup connection status handler
        window.wsManager.onConnectionStatus((status, message) => {
          setConnectionStatus(status);
          
          // Show user feedback for connection issues
          if (status === 'auth_failed') {
            window.showNotification?.('Authentication failed - please login again', 'error');
          } else if (status === 'failed') {
            window.showNotification?.('Connection failed - using offline mode', 'warning');
          }
        });

        // Connect
        await window.wsManager.connect(token);
        setConnectionStatus('connected');
        
      } catch (error) {
        console.error('[useWebSocket] Connection failed:', error);
        setConnectionStatus('failed');
        throw error;
      }
    }, []);

    // Disconnect WebSocket
    const disconnectWebSocket = React.useCallback(() => {
      window.wsManager.disconnect();
      setConnectionStatus('disconnected');
      setCurrentUser(null);
      setBudgetState({
        totalFundsAdded: 0,
        totalExpenses: 0,
        availableBudget: 0,
        transactions: [],
        beneficiaries: [],
        itemDescriptions: ['Sky Cap'],
        flightNumbers: ['AT200', 'AT201']
      });
      setUsers([]);
    }, []);

    // Emit event with optimistic updates
    const emit = React.useCallback((event, data, optimisticUpdate = null) => {
      // Apply optimistic update immediately
      if (optimisticUpdate) {
        optimisticUpdate();
      }

      // Emit to server
      const sent = window.wsManager.emit(event, data);
      
      if (!sent) {
        // If not sent (offline), we keep the optimistic update
        // It will be corrected when the server response comes back
        console.log(`[useWebSocket] Queued ${event} with optimistic update`);
      }

      return sent;
    }, []);

    // Expense-specific actions with optimistic updates
    const addFunds = React.useCallback((amount) => {
      const numAmount = parseFloat(amount);
      if (!numAmount || numAmount <= 0) {
        throw new Error('Invalid amount');
      }

      return emit('add_funds', { amount: numAmount }, () => {
        setBudgetState(prev => ({
          ...prev,
          totalFundsAdded: prev.totalFundsAdded + numAmount,
          availableBudget: prev.availableBudget + numAmount
        }));
      });
    }, [emit]);

    const addTransaction = React.useCallback((transactionData) => {
      const amount = parseFloat(transactionData.amount);
      const optimisticTransaction = {
        id: 'temp_' + Date.now(),
        ...transactionData,
        amount,
        dateOfReimbursement: transactionData.dateOfReimbursement || new Date().toISOString(),
        dateOfPurchase: transactionData.dateOfPurchase || new Date().toISOString()
      };

      return emit('add_transaction', transactionData, () => {
        setBudgetState(prev => ({
          ...prev,
          transactions: [optimisticTransaction, ...prev.transactions],
          totalExpenses: prev.totalExpenses + amount,
          availableBudget: prev.availableBudget - amount
        }));
      });
    }, [emit]);

    const editTransaction = React.useCallback((transactionId, updates) => {
      return emit('edit_transaction', { transactionId, updates });
    }, [emit]);

    const deleteTransaction = React.useCallback((transactionId) => {
      return emit('delete_transaction', { transactionId }, () => {
        // Optimistic update - find and remove transaction
        setBudgetState(prev => {
          const transaction = prev.transactions.find(t => t.id === transactionId);
          if (!transaction) return prev;
          
          return {
            ...prev,
            transactions: prev.transactions.filter(t => t.id !== transactionId),
            totalExpenses: prev.totalExpenses - transaction.amount,
            availableBudget: prev.availableBudget + transaction.amount
          };
        });
      });
    }, [emit]);

    const assignBdNumber = React.useCallback((transactionIds, bdNumber) => {
      return emit('assign_bd_number', { transactionIds, bdNumber });
    }, [emit]);

    // Admin-specific actions
    const loadUsers = React.useCallback(() => {
      return emit('admin_get_users');
    }, [emit]);

    const createUser = React.useCallback((userData) => {
      return emit('admin_create_user', userData);
    }, [emit]);

    const deleteUser = React.useCallback((userId) => {
      return emit('admin_delete_user', { userId });
    }, [emit]);

    const resetPassword = React.useCallback((userId, newPassword) => {
      return emit('admin_reset_password', { userId, newPassword });
    }, [emit]);

    // Return hook interface
    return {
      // Connection
      connectionStatus,
      isConnected: connectionStatus === 'connected',
      isConnecting: connectionStatus === 'connecting',
      connectWebSocket,
      disconnectWebSocket,

      // State
      budgetState,
      currentUser,
      users,

      // Expense actions
      addFunds,
      addTransaction,
      editTransaction,
      deleteTransaction,
      assignBdNumber,

      // Admin actions  
      loadUsers,
      createUser,
      deleteUser,
      resetPassword,

      // Raw emit for custom events
      emit
    };
  }

  // Make hook globally available
  window.useWebSocket = useWebSocket;

  console.log('✅ React WebSocket hook initialized');

})();