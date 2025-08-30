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

// BULLETPROOF WEBSOCKET INTEGRATION
class BulletproofWebSocketIntegration {
  constructor() {
    this.syncSystem = window.BulletproofSyncSystem;
    this.isInitialized = false;
    this.stateSubscription = null;
    
    if (!this.syncSystem) {
      console.error('BulletproofSyncSystem not found! Make sure bulletproof-sync.js is loaded first.');
      return;
    }
    
    this.setupIntegration();
  }
  
  setupIntegration() {
    console.log(' Setting up Bulletproof WebSocket integration');
    this.isInitialized = true;
    
    // Subscribe to state changes from the bulletproof system
    this.stateSubscription = this.syncSystem.subscribe((newState, oldState, source) => {
      console.log(` State update from ${source}:`, newState);
      
      // Notify UI callback if registered
      if (window.bulletproofStateCallback) {
        window.bulletproofStateCallback(newState, oldState, source);
      }
    });
  }
  
  // Compatibility methods for existing code
  async connect(token) {
    if (!this.isInitialized) {
      console.error('BulletproofWebSocketIntegration not initialized');
      return;
    }
    
    try {
      await this.syncSystem.connect(token);
      console.log(' Bulletproof connection established');
      return { socket: { on: () => {} } }; // Mock for compatibility
    } catch (error) {
      console.error(' Bulletproof connection failed:', error);
      throw error;
    }
  }
  
  emit(event, data) {
    if (!this.isInitialized) {
      console.error('BulletproofWebSocketIntegration not initialized');
      return false;
    }
    
    return this.syncSystem.emit(event, data);
  }
  
  requestStateRefresh() {
    if (this.isInitialized) {
      this.syncSystem.requestRefresh();
    }
  }
  
  disconnect() {
    if (this.isInitialized) {
      this.syncSystem.disconnect();
    }
    
    if (this.stateSubscription) {
      this.stateSubscription();
    }
  }
  
  // Compatibility getters
  get ultraIsConnected() {
    return this.syncSystem?.wsManager?.isConnected || false;
  }
  
  get isConnected() {
    return this.ultraIsConnected;
  }
}

// Initialize the bulletproof WebSocket manager
const bulletproofWSManager = new BulletproofWebSocketIntegration();

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
          initializeBulletproofConnection(token);
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

  const initializeBulletproofConnection = async (token) => {
    try {
      console.log(' Setting up bulletproof connection...');
      
      // Setup state callback for UI updates BEFORE connecting
      window.bulletproofStateCallback = (newState, oldState, source) => {
        console.log(` UI Update from ${source}:`, { newState, oldState });
        
        if (newState.budgetState) {
          console.log(' Updating budget state:', newState.budgetState);
          setBudgetState(newState.budgetState);
        }
        
        if (newState.currentUser) {
          console.log(' Updating current user:', newState.currentUser);
          setCurrentUser(newState.currentUser);
        }
        
        setIsAuthenticated(true);
        setLoading(false);
      };
      
      // Make bulletproof system available globally for admin panel
      window.wsManager = bulletproofWSManager;
      window.ultraWSManager = bulletproofWSManager;
      window.bulletproofWSManager = bulletproofWSManager;
      
      // Connect the bulletproof system
      await bulletproofWSManager.connect(token);
      
      console.log(' Bulletproof connection established successfully');
      
    } catch (error) {
      console.error(' Bulletproof connection failed:', error);
      setLoading(false);
      handleLogout();
    }
  };


  const handleAuth = async (userData) => {
    const { token, user } = userData;
    localStorage.setItem('authToken', token);
    localStorage.setItem('currentUser', JSON.stringify(user));
    
    setCurrentUser(user);
    setLoading(true);
    await initializeBulletproofConnection(token);
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    bulletproofWSManager.disconnect();
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

    console.log(' Adding funds locally and sending to server:', { amount: parseFloat(amount) });
    
    // Optimistic UI update - add funds immediately
    setBudgetState(prev => ({
      ...prev,
      totalFundsAdded: prev.totalFundsAdded + parseFloat(amount),
      availableBudget: prev.availableBudget + parseFloat(amount)
    }));
    
    return new Promise((resolve, reject) => {
      try {
        bulletproofWSManager.emit('add_funds', {
          amount: parseFloat(amount)
        });
        resolve();
      } catch (error) {
        // Rollback optimistic update on error
        setBudgetState(prev => ({
          ...prev,
          totalFundsAdded: prev.totalFundsAdded - parseFloat(amount),
          availableBudget: prev.availableBudget - parseFloat(amount)
        }));
        reject(error);
      }
    });
  };

  const handleAddTransaction = (transactionData) => {
    console.log(' Adding transaction locally and sending to server:', transactionData);
    
    // Create optimistic transaction
    const optimisticTransaction = {
      id: 'temp_' + Date.now(),
      ...transactionData,
      dateOfReimbursement: transactionData.dateOfReimbursement || new Date().toISOString(),
      dateOfPurchase: transactionData.dateOfPurchase || new Date().toISOString(),
      amount: parseFloat(transactionData.amount)
    };
    
    // Optimistic UI update - add transaction immediately
    setBudgetState(prev => ({
      ...prev,
      transactions: [optimisticTransaction, ...prev.transactions],
      totalExpenses: prev.totalExpenses + parseFloat(transactionData.amount),
      availableBudget: prev.availableBudget - parseFloat(transactionData.amount)
    }));
    
    return new Promise((resolve, reject) => {
      try {
        if (!bulletproofWSManager.isConnected) {
          throw new Error('Connection not available. Please refresh the page.');
        }
        bulletproofWSManager.emit('add_transaction', transactionData);
        resolve();
      } catch (error) {
        // Rollback optimistic update on error
        setBudgetState(prev => ({
          ...prev,
          transactions: prev.transactions.filter(t => t.id !== optimisticTransaction.id),
          totalExpenses: prev.totalExpenses - parseFloat(transactionData.amount),
          availableBudget: prev.availableBudget + parseFloat(transactionData.amount)
        }));
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
        if (!bulletproofWSManager.isConnected) {
          throw new Error('Connection not available. Please refresh the page.');
        }
        bulletproofWSManager.emit('edit_transaction', {
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
      if (!bulletproofWSManager.isConnected) {
        alert('Connection not available. Please refresh the page.');
        return;
      }
      // Optimistically update UI
      setBudgetState(prev => ({
        ...prev,
        transactions: prev.transactions.filter(t => t.id !== transactionId)
      }));
      
      bulletproofWSManager.emit('delete_transaction', { transactionId });
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

    bulletproofWSManager.emit('assign_bd_number', {
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