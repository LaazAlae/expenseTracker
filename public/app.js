// Notification system
let notificationTimeout = null;

function showNotification(message, type = 'info') {
  const existing = document.querySelector('.notification');
  if (existing) existing.remove();
  if (notificationTimeout) clearTimeout(notificationTimeout);

  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.innerHTML = `
    <span class="icon icon-${type}"></span>
    ${message}
  `;
  
  document.body.appendChild(notification);
  
  notificationTimeout = setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 4000);
}

// ULTRA ISOLATED WEBSOCKET MANAGER - NO CONFLICTS
class UltraIsolatedWebSocketManager {
  constructor() {
    this.ultraSocket = null;
    this.ultraIsConnected = false;
    this.ultraMessageQueue = [];
    this.ultraReconnectAttempts = 0;
    this.ultraMaxReconnectAttempts = 10;
    this.ultraHeartbeatInterval = null;
    this.ultraLastPong = Date.now();
    this.ultraReconnectTimer = null;
    this.ultraConnectionToken = null;
    this.ultraPWABroadcastChannel = null;
    this.setupPWASync();
  }

  setupPWASync() {
    // Setup broadcast channel for PWA cross-tab communication
    if ('BroadcastChannel' in window) {
      this.ultraPWABroadcastChannel = new BroadcastChannel('expense-tracker-sync');
      this.ultraPWABroadcastChannel.onmessage = (event) => {
        if (event.data.type === 'state-update') {
          console.log('PWA sync: Received state update from another tab');
          // Trigger UI update with new state
          if (window.ultraPWAStateCallback) {
            window.ultraPWAStateCallback(event.data.budgetState);
          }
        }
      };
    }

    // Setup Service Worker communication for PWA updates
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'BACKGROUND_SYNC_SUCCESS') {
          console.log('PWA sync: Background sync completed');
          this.requestStateRefresh();
        }
      });
    }
  }

  connect(token) {
    this.ultraConnectionToken = token;
    
    if (this.ultraSocket) {
      this.ultraSocket.disconnect();
    }

    console.log('Ultra WebSocket: Attempting connection...');
    this.ultraSocket = io({
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true
    });

    this.ultraSocket.on('connect', () => {
      console.log('Ultra WebSocket: Connected successfully');
      this.ultraIsConnected = true;
      this.ultraReconnectAttempts = 0;
      this.ultraLastPong = Date.now();
      
      // Clear any existing reconnect timer
      if (this.ultraReconnectTimer) {
        clearTimeout(this.ultraReconnectTimer);
        this.ultraReconnectTimer = null;
      }
      
      // Authenticate immediately
      this.ultraSocket.emit('authenticate', { token });
      
      // Setup heartbeat
      this.setupHeartbeat();
      
      // Send any queued messages
      this.ultraMessageQueue.forEach(msg => {
        this.ultraSocket.emit(msg.event, msg.data);
      });
      this.ultraMessageQueue = [];
    });

    this.ultraSocket.on('disconnect', (reason) => {
      console.log('Ultra WebSocket: Disconnected -', reason);
      this.ultraIsConnected = false;
      this.clearHeartbeat();
      
      // Don't auto-reconnect for manual disconnections
      if (reason !== 'io client disconnect') {
        this.attemptReconnect(token);
      }
    });

    this.ultraSocket.on('connect_error', (error) => {
      console.error('Ultra WebSocket: Connection error -', error);
      this.ultraIsConnected = false;
      this.clearHeartbeat();
    });

    // Setup heartbeat response
    this.ultraSocket.on('pong', () => {
      this.ultraLastPong = Date.now();
    });

    return this.ultraSocket;
  }

  setupHeartbeat() {
    this.clearHeartbeat();
    this.ultraHeartbeatInterval = setInterval(() => {
      if (this.ultraIsConnected && this.ultraSocket) {
        const now = Date.now();
        // Check if we haven't received a pong in too long
        if (now - this.ultraLastPong > 30000) {
          console.warn('Ultra WebSocket: Heartbeat timeout, forcing reconnect');
          this.ultraSocket.disconnect();
          return;
        }
        this.ultraSocket.emit('ping');
      }
    }, 10000);
  }

  clearHeartbeat() {
    if (this.ultraHeartbeatInterval) {
      clearInterval(this.ultraHeartbeatInterval);
      this.ultraHeartbeatInterval = null;
    }
  }

  attemptReconnect(token) {
    if (this.ultraReconnectAttempts >= this.ultraMaxReconnectAttempts) {
      showNotification('Connection lost. Please refresh the page.', 'error');
      return;
    }

    this.ultraReconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.ultraReconnectAttempts), 30000);
    
    console.log(`Ultra WebSocket: Attempting to reconnect... (${this.ultraReconnectAttempts}/${this.ultraMaxReconnectAttempts}) in ${delay}ms`);
    
    this.ultraReconnectTimer = setTimeout(() => {
      if (!this.ultraIsConnected) {
        this.connect(token);
      }
    }, delay);
  }

  emit(event, data) {
    if (this.ultraIsConnected && this.ultraSocket) {
      this.ultraSocket.emit(event, data);
      
      // Broadcast to other PWA tabs for immediate UI updates
      if (this.ultraPWABroadcastChannel && ['add_funds', 'add_transaction', 'edit_transaction', 'delete_transaction'].includes(event)) {
        this.ultraPWABroadcastChannel.postMessage({
          type: 'action-performed',
          action: event,
          data: data
        });
      }
    } else {
      // Queue the message for when connection is restored
      this.ultraMessageQueue.push({ event, data });
      console.log('Ultra WebSocket: Queued message -', event);
      
      // Only show queue message if actually offline/disconnected for more than 5 seconds
      if (this.ultraReconnectAttempts > 1) {
        showNotification('Action queued - will sync when connection restored', 'info');
      }
      
      // Try to trigger background sync for PWAs
      if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
        navigator.serviceWorker.ready.then(registration => {
          return registration.sync.register('background-sync');
        }).catch(() => {
          console.log('Background sync not available');
        });
      }
    }
  }

  on(event, callback) {
    if (this.ultraSocket) {
      this.ultraSocket.on(event, callback);
    }
  }

  requestStateRefresh() {
    if (this.ultraIsConnected && this.ultraSocket) {
      this.ultraSocket.emit('get_current_state');
    }
  }

  broadcastStateUpdate(budgetState) {
    if (this.ultraPWABroadcastChannel) {
      this.ultraPWABroadcastChannel.postMessage({
        type: 'state-update',
        budgetState: budgetState
      });
    }
  }

  disconnect() {
    this.clearHeartbeat();
    if (this.ultraReconnectTimer) {
      clearTimeout(this.ultraReconnectTimer);
      this.ultraReconnectTimer = null;
    }
    if (this.ultraPWABroadcastChannel) {
      this.ultraPWABroadcastChannel.close();
    }
    if (this.ultraSocket) {
      this.ultraSocket.disconnect();
      this.ultraSocket = null;
      this.ultraIsConnected = false;
    }
  }
}

const ultraWSManager = new UltraIsolatedWebSocketManager();

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [budgetState, setBudgetState] = useState({
    totalFundsAdded: 0,
    totalExpenses: 0,
    availableBudget: 0,
    transactions: [],
    beneficiaries: [],
    itemDescriptions: ['Sky Cap'],
    flightNumbers: ['AT200', 'AT201']
  });
  
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showAddFunds, setShowAddFunds] = useState(false);
  const [fundsAmount, setFundsAmount] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  
  const [showBDCreation, setShowBDCreation] = useState(false);
  const [selectedForBD, setSelectedForBD] = useState(new Set());
  const [bdNumber, setBdNumber] = useState('');
  const [showBDNumberPrompt, setShowBDNumberPrompt] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // ENSURE SCROLL RESTORATION WHEN MODALS CLOSE
  useEffect(() => {
    if (!showTransactionForm && !selectedTransaction && !showAddFunds && !editingTransaction && !showBDNumberPrompt && !showSettings) {
      // Force restore body scroll when all modals are closed
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
      document.body.style.top = '';
      document.body.style.left = '';
      
      // Close mobile modal manager if active
      if (window.responsiveManager?.modalManager?.isModalOpen) {
        window.responsiveManager.modalManager.closeModal();
      }
    }
  }, [showTransactionForm, selectedTransaction, showAddFunds, editingTransaction, showBDNumberPrompt, showSettings]);

  // Check authentication on load
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('currentUser');
    
    if (token) {
      // Validate token with server
      fetch('/api/validate-token', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      .then(response => response.json())
      .then(data => {
        if (data.valid) {
          setCurrentUser(data.user);
          localStorage.setItem('currentUser', JSON.stringify(data.user));
          initializeWebSocket(token);
        } else {
          handleLogout();
        }
      })
      .catch(err => {
        console.error('Token validation failed:', err);
        handleLogout();
      });
    } else {
      setLoading(false);
    }
  }, []);

  const initializeWebSocket = (token) => {
    const socket = ultraWSManager.connect(token);
    
    // Setup PWA state callback for cross-tab sync
    window.ultraPWAStateCallback = (newBudgetState) => {
      setBudgetState(newBudgetState);
      console.log('PWA sync: Updated state from another tab');
      
      // Force re-render and state update
      setTimeout(() => {
        setBudgetState(prevState => ({ ...prevState, ...newBudgetState }));
      }, 100);
    };
    
    // Enhanced PWA visibility handling for instant refresh
    const handlePWAVisibilityChange = () => {
      if (!document.hidden && ultraWSManager.ultraIsConnected) {
        console.log('PWA became visible - requesting fresh state');
        ultraWSManager.requestStateRefresh();
        // Also force a small delay update
        setTimeout(() => {
          if (ultraWSManager.ultraIsConnected) {
            ultraWSManager.requestStateRefresh();
          }
        }, 500);
      }
    };
    
    document.addEventListener('visibilitychange', handlePWAVisibilityChange);
    window.addEventListener('focus', handlePWAVisibilityChange);
    
    // PWA app state change handling
    if ('serviceWorker' in navigator) {
      window.addEventListener('beforeunload', () => {
        if (ultraWSManager.ultraPWABroadcastChannel) {
          ultraWSManager.ultraPWABroadcastChannel.postMessage({
            type: 'app-closing'
          });
        }
      });
    }

    socket.on('authenticated', (data) => {
      console.log('WebSocket authenticated:', data);
      setCurrentUser(data.user);
      setBudgetState(data.budgetState);
      setIsAuthenticated(true);
      setLoading(false);
      
      // Make ultraWSManager available globally for admin panel
      window.wsManager = ultraWSManager;
      window.ultraWSManager = ultraWSManager;
      
      // Broadcast initial state to other tabs
      ultraWSManager.broadcastStateUpdate(data.budgetState);
    });

    socket.on('auth_error', (data) => {
      console.error('WebSocket auth error:', data);
      showNotification(data.message, 'error');
      handleLogout();
    });

    socket.on('funds_added', (data) => {
      console.log('Ultra WebSocket: Funds added', data);
      setBudgetState(data.budgetState);
      ultraWSManager.broadcastStateUpdate(data.budgetState);
      showNotification('Funds added successfully', 'success');
      setFundsAmount('');
      setShowAddFunds(false);
    });

    socket.on('transaction_added', (data) => {
      console.log('Ultra WebSocket: Transaction added', data);
      setBudgetState(data.budgetState);
      ultraWSManager.broadcastStateUpdate(data.budgetState);
      showNotification('Transaction added successfully', 'success');
      setShowTransactionForm(false);
    });

    socket.on('transaction_updated', (data) => {
      console.log('Ultra WebSocket: Transaction updated', data);
      setBudgetState(data.budgetState);
      ultraWSManager.broadcastStateUpdate(data.budgetState);
      showNotification('Transaction updated successfully', 'success');
      setEditingTransaction(null);
    });

    socket.on('transaction_deleted', (data) => {
      console.log('Ultra WebSocket: Transaction deleted', data);
      setBudgetState(data.budgetState);
      ultraWSManager.broadcastStateUpdate(data.budgetState);
      showNotification('Transaction deleted successfully', 'success');
    });

    socket.on('bd_assigned', (data) => {
      console.log('Ultra WebSocket: BD assigned', data);
      setBudgetState(data.budgetState);
      ultraWSManager.broadcastStateUpdate(data.budgetState);
      showNotification(`BD number ${data.bdNumber} assigned to ${data.count} transactions`, 'success');
      setShowBDNumberPrompt(false);
      setShowBDCreation(false);
      setSelectedForBD(new Set());
      setBdNumber('');
    });

    socket.on('user_created', (data) => {
      showNotification(`User ${data.user.username} created successfully`, 'success');
      // Show credentials
      alert(`User created:\nUsername: ${data.credentials.username}\nPassword: ${data.credentials.password}\n\nPlease save these credentials securely.`);
    });

    socket.on('user_deleted', (data) => {
      showNotification('User deleted successfully', 'success');
    });

    socket.on('password_reset', (data) => {
      showNotification('Password reset successfully', 'success');
      alert(`New password for user: ${data.newPassword}\n\nPlease save this password securely.`);
    });

    socket.on('account_deleted', () => {
      showNotification('Your account has been deleted', 'error');
      handleLogout();
    });

    // Handle current state response for PWA sync
    socket.on('current_state', (data) => {
      console.log('Ultra WebSocket: Received current state', data);
      setBudgetState(data.budgetState);
      ultraWSManager.broadcastStateUpdate(data.budgetState);
    });

    socket.on('error', (data) => {
      console.error('WebSocket error:', data);
      showNotification(data.message, 'error');
    });
  };

  const handleAuth = async (userData) => {
    const { token, user } = userData;
    localStorage.setItem('authToken', token);
    localStorage.setItem('currentUser', JSON.stringify(user));
    
    setCurrentUser(user);
    setLoading(true);
    initializeWebSocket(token);
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    ultraWSManager.disconnect();
    setIsAuthenticated(false);
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
    setLoading(false);
  };

  const handleAddFunds = (amount) => {
    if (!amount || parseFloat(amount) <= 0) {
      showNotification('Please enter a valid amount', 'error');
      throw new Error('Invalid amount');
    }

    console.log('Sending add_funds event:', { amount: parseFloat(amount) });
    return new Promise((resolve, reject) => {
      try {
        ultraWSManager.emit('add_funds', {
          amount: parseFloat(amount)
        });
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  };

  const handleAddTransaction = (transactionData) => {
    return new Promise((resolve, reject) => {
      try {
        if (!ultraWSManager) {
          throw new Error('Connection not available. Please refresh the page.');
        }
        ultraWSManager.emit('add_transaction', transactionData);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  };

  const handleEditTransaction = (transaction) => {
    console.log('handleEditTransaction called with:', transaction);
    if (!transaction) {
      console.error('No transaction provided to edit');
      return;
    }
    try {
      setEditingTransaction({...transaction});
      console.log('EditingTransaction state set successfully');
    } catch (error) {
      console.error('Error setting editing transaction:', error);
      alert('Error opening edit modal. Please refresh the page.');
    }
  };

  const handleSaveEditTransaction = (updates) => {
    return new Promise((resolve, reject) => {
      try {
        if (!ultraWSManager) {
          throw new Error('Connection not available. Please refresh the page.');
        }
        ultraWSManager.emit('edit_transaction', {
          transactionId: editingTransaction.id,
          updates
        });
        setEditingTransaction(null);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  };

  const handleDeleteTransaction = (transactionId) => {
    if (confirm('Are you sure you want to delete this transaction?')) {
      if (!ultraWSManager) {
        alert('Connection not available. Please refresh the page.');
        return;
      }
      // Optimistically update UI
      setBudgetState(prev => ({
        ...prev,
        transactions: prev.transactions.filter(t => t.id !== transactionId)
      }));
      
      ultraWSManager.emit('delete_transaction', { transactionId });
    }
  };

  const handleBDCreation = () => {
    setShowBDCreation(!showBDCreation);
    setSelectedForBD(new Set());
  };

  const toggleTransactionForBD = (transactionId) => {
    const newSelected = new Set(selectedForBD);
    if (newSelected.has(transactionId)) {
      newSelected.delete(transactionId);
    } else {
      newSelected.add(transactionId);
    }
    setSelectedForBD(newSelected);
  };

  const submitBDSelection = () => {
    if (selectedForBD.size === 0) {
      showNotification('Please select at least one transaction', 'warning');
      return;
    }
    setShowBDNumberPrompt(true);
  };

  const confirmBDCreation = () => {
    if (!bdNumber.trim()) {
      showNotification('Please enter a BD number', 'error');
      return;
    }

    ultraWSManager.emit('assign_bd_number', {
      transactionIds: Array.from(selectedForBD),
      bdNumber: bdNumber.trim()
    });
  };

  const exportToExcel = async () => {
    try {
      const workbook = XLSX.utils.book_new();

      // Transactions sheet with all transactions including fund additions
      const worksheetData = [
        ['Date of Reimbursement', 'Beneficiary', 'Item Description', 'Invoice Number', 'Date of Purchase', 'Amount', 'Amount Left', 'Flight Number', 'Number of Luggage', 'Observations', 'Username']
      ];

      // Calculate amount left at time of each transaction
      let runningTotal = budgetState.totalFundsAdded;
      
      budgetState.transactions.forEach(transaction => {
        if (transaction.type === 'fund_addition') {
          worksheetData.push([
            new Date(transaction.dateOfReimbursement).toLocaleDateString('en-US', {timeZone: 'America/New_York'}) || '-',
            '-',
            'Fund Addition',
            '-',
            new Date(transaction.dateOfPurchase).toLocaleDateString('en-US', {timeZone: 'America/New_York'}) || '-',
            `$${transaction.amount.toFixed(2)}`,
            `$${runningTotal.toFixed(2)}`,
            '-',
            '-',
            '-',
            currentUser?.username || '-'
          ]);
        } else {
          runningTotal -= transaction.amount;
          worksheetData.push([
            new Date(transaction.dateOfReimbursement).toLocaleDateString('en-US', {timeZone: 'America/New_York'}) || '-',
            transaction.beneficiary || '-',
            transaction.itemDescription || '-',
            transaction.invoiceNumber || '-',
            new Date(transaction.dateOfPurchase).toLocaleDateString('en-US', {timeZone: 'America/New_York'}) || '-',
            `$${transaction.amount.toFixed(2)}`,
            `$${runningTotal.toFixed(2)}`,
            transaction.flightNumber || '-',
            transaction.numberOfLuggage || '-',
            transaction.observations || '-',
            currentUser?.username || '-'
          ]);
        }
      });

      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      
      // Auto-size columns
      const colWidths = worksheetData[0].map((_, colIndex) => {
        const maxLength = Math.max(
          ...worksheetData.map(row => (row[colIndex] || '').toString().length)
        );
        return { wch: Math.min(Math.max(maxLength + 2, 10), 50) };
      });
      worksheet['!cols'] = colWidths;
      
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions');
      
      XLSX.writeFile(workbook, `expense_report_${new Date().toISOString().split('T')[0]}.xlsx`);
      showNotification('Excel file exported successfully', 'success');
    } catch (err) {
      showNotification('Error exporting Excel file', 'error');
    }
  };

  if (!isAuthenticated) {
    return React.createElement(AuthForm, { onAuth: handleAuth });
  }

  if (loading) {
    return React.createElement('div', { className: 'app' },
      React.createElement('div', { style: { padding: '50px', textAlign: 'center' } },
        'Loading...'
      )
    );
  }

  // Budget values come directly from centralized budget state - NO CALCULATIONS HERE!
  const availableBudget = budgetState.availableBudget;
  const totalFundsAdded = budgetState.totalFundsAdded;
  const totalExpenses = budgetState.totalExpenses;

  return React.createElement('div', { className: 'app' },
    React.createElement('div', { className: 'header' },
      React.createElement('h1', null, `Welcome ${currentUser?.username || 'User'}`),
      
      // Professional Hamburger Menu for ALL screen sizes
      React.createElement('div', { className: 'header-actions' },
        // Professional Hamburger Menu Button
        React.createElement('button', { 
          onClick: () => setShowMobileMenu(!showMobileMenu),
          className: 'hamburger-menu-btn',
          'aria-label': 'Open Menu',
          'aria-expanded': showMobileMenu
        },
          React.createElement('span', { className: `hamburger ${showMobileMenu ? 'hamburger-active' : ''}` },
            React.createElement('span', { className: 'hamburger-line' }),
            React.createElement('span', { className: 'hamburger-line' }),
            React.createElement('span', { className: 'hamburger-line' })
          )
        )
      ),

      // Professional Dropdown Menu
      showMobileMenu && React.createElement('div', { className: 'professional-menu' },
        React.createElement('div', { className: 'menu-header' },
          React.createElement('div', { className: 'menu-user-info' },
            React.createElement('div', { className: 'menu-user-name' }, currentUser?.username || 'User'),
            React.createElement('div', { className: 'menu-user-role' }, 
              currentUser?.isAdmin ? 'Administrator' : 'User'
            )
          ),
          // Edit Mode Toggle inside menu
          React.createElement('div', { className: 'menu-edit-toggle' },
            React.createElement('span', { className: 'menu-toggle-label' }, 'Edit Mode'),
            React.createElement('button', { 
              onClick: () => {
                setEditMode(!editMode);
                setShowMobileMenu(false);
              },
              className: `menu-toggle ${editMode ? 'menu-toggle-active' : ''}`,
              'aria-label': editMode ? 'Exit Edit Mode' : 'Enter Edit Mode'
            },
              React.createElement('div', { className: 'menu-toggle-slider' })
            )
          )
        ),
        React.createElement('div', { className: 'menu-items' },
          currentUser?.isAdmin && React.createElement('button', { 
            onClick: () => {
              setShowSettings(!showSettings);
              setShowMobileMenu(false);
            },
            className: 'menu-item',
            dangerouslySetInnerHTML: { __html: `${icon('settings', 20)} <span>Admin Settings</span>` }
          }),
          React.createElement('button', { 
            onClick: () => {
              exportToExcel();
              setShowMobileMenu(false);
            },
            className: 'menu-item',
            dangerouslySetInnerHTML: { __html: `${icon('export', 20)} <span>Export to Excel</span>` }
          }),
          React.createElement('button', { 
            onClick: () => {
              handleLogout();
              setShowMobileMenu(false);
            },
            className: 'menu-item menu-item-danger',
            dangerouslySetInnerHTML: { __html: `${icon('logout', 20)} <span>Sign Out</span>` }
          })
        )
      ),

      // Menu Overlay
      showMobileMenu && React.createElement('div', { 
        className: 'menu-overlay',
        onClick: () => setShowMobileMenu(false)
      })
    ),

    error && React.createElement('div', { className: 'error-message' }, error),

    React.createElement('div', { className: 'main' },
      React.createElement('div', { className: 'budget-card' },
        React.createElement('h2', null, 'Available Budget'),
        React.createElement('div', {
          className: `budget-amount${availableBudget <= 0 ? ' negative' : ''}`
        }, `$${availableBudget.toFixed(2)}`),
        React.createElement('button', {
          onClick: () => setShowAddFunds(true),
          className: 'btn btn-success btn-add-funds',
          dangerouslySetInnerHTML: { __html: `Add Funds` }
        })
      ),

      // Professional Action Bar
      React.createElement('div', { className: 'action-bar' },
        React.createElement('button', {
          onClick: () => setShowTransactionForm(true),
          className: 'btn btn-primary btn-action',
          dangerouslySetInnerHTML: { __html: `New Transaction` }
        }),
        React.createElement('button', {
          onClick: handleBDCreation,
          className: `btn btn-action ${showBDCreation ? 'btn-warning' : 'btn-secondary'}`,
          dangerouslySetInnerHTML: { __html: `${icon('bd', 18)} ${showBDCreation ? 'Cancel BD' : 'Assign BD#'}` }
        })
      ),

      React.createElement('div', { className: 'transaction-section' },
        React.createElement('div', { className: 'transaction-header' },
          React.createElement('h2', null, 'Transaction History')
        ),
        
        budgetState.transactions.length === 0 ?
          React.createElement('div', { className: 'empty-state' }, 'No transactions yet') :
          React.createElement('div', { className: 'transaction-table-container' },
            React.createElement('table', { className: 'transaction-table' },
              React.createElement('thead', null,
                React.createElement('tr', null,
                  React.createElement('th', { className: 'col-date' }, 'Date'),
                  React.createElement('th', { className: 'col-beneficiary' }, 'Beneficiary'),
                  React.createElement('th', { className: 'col-article' }, 'Article'),
                  React.createElement('th', { className: 'col-amount' }, 'Amount'),
                  React.createElement('th', { className: 'col-bd' }, 'BD#'),
                  editMode && React.createElement('th', null, 'Actions'),
                  showBDCreation && React.createElement('th', null, 'Select')
                )
              ),
              React.createElement('tbody', null,
                budgetState.transactions.map(transaction => {
                  const hasBD = transaction.bdNumber;
                  const isSelected = selectedForBD.has(transaction.id);
                  const isPositiveTransaction = transaction.type === 'fund_addition';
                  
                  return React.createElement('tr', {
                    key: transaction.id,
                    onClick: showBDCreation || editMode ? undefined : () => setSelectedTransaction(transaction),
                    className: isPositiveTransaction ? 'fund-addition-row' : ''
                  },
                    React.createElement('td', { className: 'col-date' },
                      new Date(transaction.dateOfReimbursement).toLocaleDateString('en-US', {timeZone: 'America/New_York'})
                    ),
                    React.createElement('td', { className: 'col-beneficiary' }, 
                      isPositiveTransaction ? '-' : transaction.beneficiary
                    ),
                    React.createElement('td', { 
                      className: `col-article ${isPositiveTransaction ? 'fund-addition-cell' : ''}`
                    }, 
                      isPositiveTransaction ? 
                        React.createElement('span', { 
                          className: 'fund-addition-label',
                          dangerouslySetInnerHTML: { __html: `Fund Addition` }
                        }) :
                        transaction.itemDescription
                    ),
                    React.createElement('td', { 
                      className: 'col-amount',
                      style: isPositiveTransaction ? { color: 'green', fontWeight: 'bold' } : { color: 'red', fontWeight: 'bold' }
                    }, `${isPositiveTransaction ? '+' : '-'}$${transaction.amount.toFixed(2)}`),
                    React.createElement('td', { className: 'col-bd' }, transaction.bdNumber || '-'),
                    
                    editMode && React.createElement('td', null,
                      React.createElement('div', { className: 'transaction-actions-cell' },
                        React.createElement('button', {
                          onClick: (e) => {
                            e.stopPropagation();
                            handleEditTransaction(transaction);
                          },
                          className: 'btn btn-sm btn-secondary',
                          title: 'Edit Transaction',
                          dangerouslySetInnerHTML: { __html: icon('edit', 14) }
                        }),
                        React.createElement('button', {
                          onClick: (e) => {
                            e.stopPropagation();
                            handleDeleteTransaction(transaction.id);
                          },
                          className: 'btn btn-sm btn-danger',
                          title: 'Delete Transaction',
                          dangerouslySetInnerHTML: { __html: icon('delete', 14) }
                        })
                      )
                    ),
                    
                    showBDCreation && React.createElement('td', {
                      onClick: (e) => {
                        e.stopPropagation();
                        if (!isPositiveTransaction) toggleTransactionForBD(transaction.id);
                      }
                    },
                      React.createElement('div', {
                        className: `bd-select-button ${isSelected ? 'selected' : ''} ${isPositiveTransaction ? 'disabled' : ''}`
                      },
                        isPositiveTransaction ? 
                          React.createElement('span', { dangerouslySetInnerHTML: { __html: icon('cancel', 16) } }) :
                          (isSelected ? 
                            React.createElement('span', { dangerouslySetInnerHTML: { __html: icon('check', 16) } }) :
                            React.createElement('span', { dangerouslySetInnerHTML: { __html: icon('add', 16) } })
                          )
                      )
                    )
                  );
                })
              )
            )
          )
      )
    ),

    // COMPLETELY ISOLATED MODAL SYSTEM - NO CONFLICTS
    showAddFunds && React.createElement(window.IsolatedModals.AddFundsModal, {
      isOpen: true,
      onClose: () => setShowAddFunds(false),
      onAdd: handleAddFunds
    }),

    showTransactionForm && React.createElement(window.IsolatedModals.TransactionFormModal, {
      isOpen: true,
      onClose: () => setShowTransactionForm(false),
      onSubmit: handleAddTransaction
    }),

    selectedTransaction && !editingTransaction && React.createElement(window.IsolatedModals.TransactionDetailsModal, {
      isOpen: true,
      onClose: () => setSelectedTransaction(null),
      transaction: selectedTransaction,
      onEdit: () => {
        handleEditTransaction(selectedTransaction);
        setSelectedTransaction(null);
      }
    }),

    editingTransaction && React.createElement(TransactionEditModal, {
      transaction: editingTransaction,
      onSave: handleSaveEditTransaction,
      onCancel: () => setEditingTransaction(null)
    }),

    showBDCreation && React.createElement('div', { className: 'bd-confirm-panel' },
      React.createElement('button', {
        onClick: submitBDSelection,
        disabled: selectedForBD.size === 0,
        className: 'btn btn-primary btn-confirm-bd',
        dangerouslySetInnerHTML: { __html: `${icon('check', 16)} Confirm Selection (${selectedForBD.size})` }
      })
    ),

    showBDNumberPrompt && React.createElement(window.IsolatedModals.BDNumberModal, {
      isOpen: true,
      onClose: () => setShowBDNumberPrompt(false),
      onConfirm: confirmBDCreation,
      count: selectedForBD.size
    }),

    showSettings && currentUser?.isAdmin && React.createElement(window.IsolatedModals.AdminPanelModal, {
      isOpen: true,
      onClose: () => setShowSettings(false)
    })
  );
}

// Real-time Responsive System & Edge Detection
class ResponsiveManager {
  constructor() {
    this.isMobile = false;
    this.isTablet = false;
    this.isDesktop = false;
    this.orientation = 'portrait';
    this.screenSize = 'desktop';
    this.callbacks = new Set();
    
    this.init();
  }

  init() {
    this.updateViewportInfo();
    this.addEventListeners();
    this.detectEdges();
    this.setupViewportHeightFix();
  }

  addEventListeners() {
    // Listen for resize events with debouncing
    let resizeTimeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        this.updateViewportInfo();
        this.detectEdges();
        this.notifyCallbacks();
      }, 100);
    };

    // Listen for orientation changes
    const handleOrientationChange = () => {
      // Small delay to allow for orientation change to complete
      setTimeout(() => {
        this.updateViewportInfo();
        this.detectEdges();
        this.notifyCallbacks();
      }, 150);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);
    
    // Also listen for visual viewport changes (mobile keyboard, etc.)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
    }
  }

  updateViewportInfo() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    // Update device type flags
    this.isMobile = width <= 768;
    this.isTablet = width > 768 && width <= 1024;
    this.isDesktop = width > 1024;
    
    // Update screen size categories
    if (width <= 360) {
      this.screenSize = 'mobile-xs';
    } else if (width <= 480) {
      this.screenSize = 'mobile-sm';
    } else if (width <= 768) {
      this.screenSize = 'mobile';
    } else if (width <= 1024) {
      this.screenSize = 'tablet';
    } else if (width <= 1440) {
      this.screenSize = 'desktop';
    } else {
      this.screenSize = 'desktop-xl';
    }
    
    // Update orientation
    this.orientation = width > height ? 'landscape' : 'portrait';
    
    // Apply CSS classes to body
    this.applyCSSClasses();
    
    console.log(`Viewport: ${width}x${height}, Type: ${this.screenSize}, Orientation: ${this.orientation}`);
  }

  applyCSSClasses() {
    const body = document.body;
    
    // Remove existing responsive classes
    const existingClasses = [
      'mobile', 'tablet', 'desktop', 'mobile-xs', 'mobile-sm', 'desktop-xl',
      'portrait', 'landscape'
    ];
    body.classList.remove(...existingClasses);
    
    // Add current classes
    body.classList.add(this.screenSize);
    body.classList.add(this.orientation);
    
    if (this.isMobile) {
      body.classList.add('mobile-device');
    } else {
      body.classList.remove('mobile-device');
    }
  }

  detectEdges() {
    const app = document.querySelector('.app');
    if (!app) return;

    // Check if device has notch/safe area
    const hasNotch = window.CSS && CSS.supports('padding-top', 'env(safe-area-inset-top)');
    
    if (hasNotch) {
      app.classList.add('has-safe-area');
      
      // Add edge detection classes
      app.classList.add('edge-top', 'edge-bottom', 'edge-left', 'edge-right');
    } else {
      app.classList.remove('has-safe-area', 'edge-top', 'edge-bottom', 'edge-left', 'edge-right');
    }

    // Detect if keyboard is open on mobile (viewport height change)
    if (this.isMobile && window.visualViewport) {
      const keyboardHeight = window.innerHeight - window.visualViewport.height;
      if (keyboardHeight > 150) { // Keyboard is likely open
        app.classList.add('keyboard-open');
        app.style.setProperty('--keyboard-height', `${keyboardHeight}px`);
      } else {
        app.classList.remove('keyboard-open');
        app.style.removeProperty('--keyboard-height');
      }
    }
  }

  setupViewportHeightFix() {
    // Fix for mobile browsers where 100vh includes address bar
    const setVH = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    setVH();
    window.addEventListener('resize', setVH);
    
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', setVH);
    }
  }

  // API for components to listen to viewport changes
  subscribe(callback) {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  notifyCallbacks() {
    this.callbacks.forEach(callback => {
      try {
        callback({
          isMobile: this.isMobile,
          isTablet: this.isTablet,
          isDesktop: this.isDesktop,
          orientation: this.orientation,
          screenSize: this.screenSize,
          width: window.innerWidth,
          height: window.innerHeight
        });
      } catch (error) {
        console.error('Error in viewport callback:', error);
      }
    });
  }

  // Utility methods
  getViewportInfo() {
    return {
      isMobile: this.isMobile,
      isTablet: this.isTablet,
      isDesktop: this.isDesktop,
      orientation: this.orientation,
      screenSize: this.screenSize,
      width: window.innerWidth,
      height: window.innerHeight
    };
  }
}

// Initialize responsive manager
const responsiveManager = new ResponsiveManager();

// Make it globally available for other components
window.responsiveManager = responsiveManager;

// Add CSS custom properties for real-time use
const updateCSSVariables = () => {
  const root = document.documentElement;
  root.style.setProperty('--viewport-width', `${window.innerWidth}px`);
  root.style.setProperty('--viewport-height', `${window.innerHeight}px`);
  root.style.setProperty('--is-mobile', responsiveManager.isMobile ? '1' : '0');
  root.style.setProperty('--is-tablet', responsiveManager.isTablet ? '1' : '0');
  root.style.setProperty('--is-desktop', responsiveManager.isDesktop ? '1' : '0');
};

// Update CSS variables on viewport changes
responsiveManager.subscribe(updateCSSVariables);
updateCSSVariables(); // Initial call

// Mobile-specific optimizations
if (responsiveManager.isMobile) {
  // Prevent zoom on input focus (iOS)
  const metaViewport = document.querySelector('meta[name=viewport]');
  if (metaViewport) {
    metaViewport.setAttribute('content', 
      'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover'
    );
  }
  
  // Disable pull-to-refresh on mobile
  document.addEventListener('touchstart', (e) => {
    if (e.touches.length > 1) {
      e.preventDefault();
    }
  }, { passive: false });
  
  let lastTouchEnd = 0;
  document.addEventListener('touchend', (e) => {
    const now = (new Date()).getTime();
    if (now - lastTouchEnd <= 300) {
      e.preventDefault();
    }
    lastTouchEnd = now;
  }, false);
}

// Add performance monitoring for responsiveness
if (window.PerformanceObserver) {
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.name === 'layout-shift' && entry.value > 0.1) {
        console.warn('Layout shift detected:', entry.value);
      }
    }
  });
  
  try {
    observer.observe({ entryTypes: ['layout-shift'] });
  } catch (e) {
    // Layout shift API not supported
  }
}

// PROFESSIONAL MOBILE MODAL MANAGEMENT SYSTEM
class MobileModalManager {
  constructor() {
    this.isModalOpen = false;
    this.currentModal = null;
    this.originalBodyStyle = {};
    this.keyboardHeight = 0;
    this.lastFocusedElement = null;
    
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    // Keyboard detection for mobile
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', () => {
        const keyboardHeight = window.innerHeight - window.visualViewport.height;
        this.keyboardHeight = Math.max(0, keyboardHeight);
        document.documentElement.style.setProperty('--keyboard-height', `${this.keyboardHeight}px`);
        
        if (this.keyboardHeight > 0) {
          document.body.classList.add('keyboard-visible');
        } else {
          document.body.classList.remove('keyboard-visible');
        }
      });
    }
    
    // Handle orientation changes
    window.addEventListener('orientationchange', () => {
      setTimeout(() => {
        this.updateViewportDimensions();
        if (this.isModalOpen) {
          this.repositionModal();
        }
      }, 100);
    });
    
    // Handle resize events
    window.addEventListener('resize', () => {
      this.updateViewportDimensions();
    });
    
    // Prevent background scroll when modal is open
    document.addEventListener('touchmove', (e) => {
      if (this.isModalOpen && !this.isScrollableElement(e.target)) {
        e.preventDefault();
      }
    }, { passive: false });
  }
  
  openModal(modalElement) {
    this.isModalOpen = true;
    this.currentModal = modalElement;
    this.lastFocusedElement = document.activeElement;
    
    // Store original body styles
    this.originalBodyStyle = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      width: document.body.style.width,
      height: document.body.style.height
    };
    
    // Lock scroll and position
    document.body.classList.add('modal-open');
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.height = '100%';
    
    // Add mobile-specific classes (but don't interfere with positioning)
    if (responsiveManager.isMobile) {
      modalElement.classList.add('mobile-active');
      modalElement.querySelector('.modal-overlay')?.classList.add('mobile-active');
    }
    
    // Update viewport dimensions but let CSS handle positioning
    this.updateViewportDimensions();
    
    // Focus management
    setTimeout(() => {
      const firstFocusable = modalElement.querySelector('input, button, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (firstFocusable) {
        firstFocusable.focus();
      }
    }, 100);
  }
  
  closeModal() {
    if (!this.isModalOpen) return;
    
    this.isModalOpen = false;
    
    // FORCE RESTORE SCROLL
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.width = '';
    document.body.style.height = '';
    document.body.style.top = '';
    document.body.style.left = '';
    
    // Restore original body styles
    Object.keys(this.originalBodyStyle).forEach(key => {
      document.body.style[key] = this.originalBodyStyle[key] || '';
    });
    
    // Remove mobile classes
    if (this.currentModal) {
      this.currentModal.classList.remove('mobile-active');
      this.currentModal.querySelector('.modal-overlay')?.classList.remove('mobile-active');
    }
    
    // Restore focus
    if (this.lastFocusedElement) {
      this.lastFocusedElement.focus();
    }
    
    this.currentModal = null;
    this.lastFocusedElement = null;
  }
  
  updateViewportDimensions() {
    // REAL MOBILE BROWSER VIEWPORT DETECTION
    const actualWidth = window.innerWidth;
    let actualHeight = window.innerHeight;
    
    // Handle different mobile browser viewport behaviors
    if (window.visualViewport) {
      actualHeight = window.visualViewport.height;
    }
    
    // iOS Safari dynamic viewport handling
    if (window.navigator.userAgent.includes('Safari') && window.navigator.userAgent.includes('Mobile')) {
      // Use the smaller of innerHeight or visualViewport for iOS
      actualHeight = Math.min(window.innerHeight, window.visualViewport?.height || window.innerHeight);
    }
    
    // Set CSS custom properties for real device dimensions
    document.documentElement.style.setProperty('--actual-width', `${actualWidth}px`);
    document.documentElement.style.setProperty('--actual-height', `${actualHeight}px`);
    document.documentElement.style.setProperty('--vh', `${actualHeight * 0.01}px`);
    document.documentElement.style.setProperty('--vw', `${actualWidth * 0.01}px`);
    
    // Real viewport units for modern browsers
    if (CSS.supports('height', '100dvh')) {
      document.documentElement.style.setProperty('--dvh', '100dvh');
      document.documentElement.style.setProperty('--svh', '100svh');
    } else {
      document.documentElement.style.setProperty('--dvh', `${actualHeight}px`);
      document.documentElement.style.setProperty('--svh', `${actualHeight}px`);
    }
  }
  
  repositionModal() {
    if (!this.currentModal) return;
    
    const modal = this.currentModal.querySelector('.modal');
    if (!modal) return;
    
    // DON'T MANUALLY POSITION - Let CSS flexbox handle centering
    // Just update viewport dimensions for CSS calculations
    this.updateViewportDimensions();
    
    // Only adjust for keyboard if present
    if (this.keyboardHeight > 0) {
      const overlay = this.currentModal;
      if (overlay) {
        overlay.style.paddingBottom = `${this.keyboardHeight}px`;
      }
    }
  }
  
  isScrollableElement(element) {
    const scrollableSelectors = [
      '.modal-body',
      '.autocomplete-dropdown',
      '[data-scrollable]'
    ];
    
    let current = element;
    while (current && current !== document.body) {
      if (scrollableSelectors.some(selector => current.matches && current.matches(selector))) {
        return true;
      }
      current = current.parentElement;
    }
    return false;
  }
}

// Add mobile modal manager to the existing responsive manager
if (responsiveManager) {
  responsiveManager.modalManager = new MobileModalManager();
  
  // Add modal management methods
  responsiveManager.openModal = function(modalElement) {
    this.modalManager.openModal(modalElement);
  };
  
  responsiveManager.closeModal = function() {
    this.modalManager.closeModal();
  };
}

// REAL MOBILE DEVICE MODAL ENHANCEMENT
function enhanceModalForMobile(modalElement) {
  if (!responsiveManager.isMobile) return;
  
  const modal = modalElement.querySelector('.modal');
  const modalBody = modalElement.querySelector('.modal-body');
  const inputs = modalElement.querySelectorAll('input, select, textarea');
  
  // Add mobile classes
  modalElement.classList.add('mobile-enhanced');
  modal?.classList.add('mobile-optimized');
  
  // DYNAMIC CONTENT SIZING FOR REAL DEVICES
  function adjustModalSizing() {
    if (!modal) return;
    
    // Get real viewport dimensions
    const viewportHeight = window.visualViewport?.height || window.innerHeight;
    const viewportWidth = window.visualViewport?.width || window.innerWidth;
    
    // Calculate available space for modal content
    const headerHeight = modalElement.querySelector('.modal-header')?.offsetHeight || 60;
    const footerHeight = modalElement.querySelector('.modal-footer')?.offsetHeight || 60;
    const padding = 40; // Total padding around modal
    
    const availableHeight = viewportHeight - headerHeight - footerHeight - padding;
    const availableWidth = viewportWidth - 20; // Side padding
    
    // Ensure modal body can fit content
    if (modalBody) {
      modalBody.style.maxHeight = `${Math.max(200, availableHeight)}px`;
      modalBody.style.minHeight = 'fit-content';
    }
    
    // Adjust modal size to fit content properly
    modal.style.maxWidth = `${Math.min(availableWidth, 600)}px`;
    modal.style.width = `${Math.min(availableWidth, 600)}px`;
    
    // Force reflow to ensure proper sizing
    modal.offsetHeight;
  }
  
  // Apply initial sizing
  requestAnimationFrame(adjustModalSizing);
  
  // Re-adjust on viewport changes (keyboard, rotation)
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', adjustModalSizing);
  }
  
  // Enhance form inputs for mobile
  inputs.forEach(input => {
    // Ensure proper input type for mobile keyboards
    if (input.type === 'text' && input.name && input.name.includes('email')) {
      input.type = 'email';
    }
    if (input.type === 'text' && input.name && input.name.includes('phone')) {
      input.type = 'tel';
    }
    
    // Add mobile-friendly attributes
    input.setAttribute('autocomplete', input.getAttribute('autocomplete') || 'off');
    input.setAttribute('autocorrect', 'off');
    input.setAttribute('autocapitalize', 'off');
    input.setAttribute('spellcheck', 'false');
    
    // Ensure minimum touch target size
    if (getComputedStyle(input).minHeight < '44px') {
      input.style.minHeight = '44px';
    }
    
    // Prevent viewport zoom on focus (iOS)
    input.style.fontSize = 'max(16px, 1em)';
  });
  
  // Enhance buttons for mobile
  const buttons = modalElement.querySelectorAll('button, .btn');
  buttons.forEach(button => {
    if (getComputedStyle(button).minHeight < '44px') {
      button.style.minHeight = '44px';
    }
    if (getComputedStyle(button).minWidth < '44px') {
      button.style.minWidth = '44px';
    }
    
    // Better touch handling
    button.style.touchAction = 'manipulation';
  });
  
  // CONTENT OVERFLOW DETECTION
  const observer = new ResizeObserver(() => {
    adjustModalSizing();
    
    // Check if content is overflowing
    if (modalBody) {
      const isOverflowing = modalBody.scrollHeight > modalBody.clientHeight;
      modal.classList.toggle('content-overflowing', isOverflowing);
    }
  });
  
  if (modal) observer.observe(modal);
  if (modalBody) observer.observe(modalBody);
}

// AUTO-ENHANCE ALL EXISTING MODALS ON PAGE LOAD
document.addEventListener('DOMContentLoaded', () => {
  const existingModals = document.querySelectorAll('.modal-overlay');
  existingModals.forEach(enhanceModalForMobile);
});

// OBSERVE FOR NEW MODALS BEING ADDED TO DOM
if (window.MutationObserver) {
  const modalObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) { // Element node
          if (node.classList?.contains('modal-overlay')) {
            enhanceModalForMobile(node);
            if (responsiveManager.isMobile) {
              responsiveManager.openModal(node);
            }
          } else {
            // Check for modal-overlay descendants
            const modals = node.querySelectorAll?.('.modal-overlay');
            modals?.forEach(enhanceModalForMobile);
          }
        }
      });
    });
  });
  
  modalObserver.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// ENHANCED MOBILE-SPECIFIC OPTIMIZATIONS
if (responsiveManager.isMobile) {
  // Enhanced keyboard handling for modals
  document.addEventListener('focusin', (e) => {
    if (responsiveManager.modalManager?.isModalOpen && e.target.matches('input, textarea, select')) {
      setTimeout(() => {
        if (e.target.scrollIntoView) {
          e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  });
  
  // Handle modal close on overlay click
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay') && responsiveManager.modalManager?.isModalOpen) {
      responsiveManager.closeModal();
    }
  });
  
  // Handle escape key for modal close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && responsiveManager.modalManager?.isModalOpen) {
      responsiveManager.closeModal();
    }
  });
}

console.log(' Professional mobile modal system initialized');
console.log(' Real-time responsive system initialized');

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(App));