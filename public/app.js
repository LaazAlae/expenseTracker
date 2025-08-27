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

// WebSocket Manager
class WebSocketManager {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.messageQueue = [];
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  connect(token) {
    if (this.socket) {
      this.socket.disconnect();
    }

    this.socket = io({
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      
      // Authenticate immediately
      this.socket.emit('authenticate', { token });
      
      // Send any queued messages
      this.messageQueue.forEach(msg => {
        this.socket.emit(msg.event, msg.data);
      });
      this.messageQueue = [];
    });

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      this.isConnected = false;
      
      // Attempt to reconnect
      this.attemptReconnect(token);
    });

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      this.isConnected = false;
    });

    return this.socket;
  }

  attemptReconnect(token) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      showNotification('Connection lost. Please refresh the page.', 'error');
      return;
    }

    this.reconnectAttempts++;
    setTimeout(() => {
      console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      this.connect(token);
    }, 2000 * this.reconnectAttempts);
  }

  emit(event, data) {
    if (this.isConnected && this.socket) {
      this.socket.emit(event, data);
    } else {
      // Queue the message for when connection is restored
      this.messageQueue.push({ event, data });
    }
  }

  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }
}

const wsManager = new WebSocketManager();

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

  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

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
    const socket = wsManager.connect(token);

    socket.on('authenticated', (data) => {
      console.log('WebSocket authenticated:', data);
      setCurrentUser(data.user);
      setBudgetState(data.budgetState);
      setIsAuthenticated(true);
      setLoading(false);
      
      // Make wsManager available globally for admin panel
      window.wsManager = wsManager;
    });

    socket.on('auth_error', (data) => {
      console.error('WebSocket auth error:', data);
      showNotification(data.message, 'error');
      handleLogout();
    });

    socket.on('funds_added', (data) => {
      setBudgetState(data.budgetState);
      showNotification('Funds added successfully', 'success');
      setFundsAmount('');
      setShowAddFunds(false);
    });

    socket.on('transaction_added', (data) => {
      setBudgetState(data.budgetState);
      showNotification('Transaction added successfully', 'success');
      setShowTransactionForm(false);
    });

    socket.on('transaction_updated', (data) => {
      setBudgetState(data.budgetState);
      showNotification('Transaction updated successfully', 'success');
      setEditingTransaction(null);
    });

    socket.on('transaction_deleted', (data) => {
      setBudgetState(data.budgetState);
      showNotification('Transaction deleted successfully', 'success');
    });

    socket.on('bd_assigned', (data) => {
      setBudgetState(data.budgetState);
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
    wsManager.disconnect();
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

  const handleAddFunds = () => {
    if (!fundsAmount || parseFloat(fundsAmount) <= 0) {
      showNotification('Please enter a valid amount', 'error');
      return;
    }

    wsManager.emit('add_funds', {
      amount: parseFloat(fundsAmount)
    });
  };

  const handleAddTransaction = (transactionData) => {
    wsManager.emit('add_transaction', transactionData);
  };

  const handleEditTransaction = (transaction) => {
    setEditingTransaction({...transaction});
  };

  const handleSaveEditTransaction = (updates) => {
    wsManager.emit('edit_transaction', {
      transactionId: editingTransaction.id,
      updates
    });
  };

  const handleDeleteTransaction = (transactionId) => {
    if (confirm('Are you sure you want to delete this transaction?')) {
      wsManager.emit('delete_transaction', { transactionId });
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

    wsManager.emit('assign_bd_number', {
      transactionIds: Array.from(selectedForBD),
      bdNumber: bdNumber.trim()
    });
  };

  const exportToExcel = async () => {
    try {
      const workbook = XLSX.utils.book_new();
      
      // Summary sheet with budget information
      const summaryData = [
        ['EXPENSE TRACKER SUMMARY', '', '', ''],
        ['Report Date:', new Date().toLocaleDateString(), '', ''],
        ['User:', currentUser?.username || 'Unknown', '', ''],
        ['', '', '', ''],
        ['BUDGET OVERVIEW', '', '', ''],
        ['Total Funds Added:', `$${budgetState.totalFundsAdded.toFixed(2)}`, '', ''],
        ['Total Expenses:', `$${budgetState.totalExpenses.toFixed(2)}`, '', ''],
        ['Available Budget:', `$${budgetState.availableBudget.toFixed(2)}`, '', ''],
        ['Transaction Count:', budgetState.transactions.length.toString(), '', ''],
        ['', '', '', '']
      ];
      
      const summaryWorksheet = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Summary');

      // Detailed transactions sheet
      const worksheetData = [
        ['Date de Remboursement', 'Bénéficiaire', 'Description Article', 'Numéro Facture', 'Date d\'Achat', 'Montant', 'Observations', 'Numéro de Vol', 'Nombre de Bagages', 'BD#']
      ];

      budgetState.transactions
        .filter(t => t.type !== 'fund_addition')
        .forEach(transaction => {
          worksheetData.push([
            transaction.dateOfReimbursement || '-',
            transaction.beneficiary || '-',
            transaction.itemDescription || '-',
            transaction.invoiceNumber || '-',
            transaction.dateOfPurchase || '-',
            transaction.amount || 0,
            transaction.observations || '-',
            transaction.flightNumber || '-',
            transaction.numberOfLuggage || '-',
            transaction.bdNumber || '-'
          ]);
        });

      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
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
      React.createElement('div', { className: 'header-actions' },
        currentUser ? React.createElement('span', { className: 'header-user' }, 
          `${currentUser.username}${currentUser.isAdmin ? ' (Admin)' : ''}`
        ) : '',
        React.createElement('button', { 
          onClick: () => setEditMode(!editMode),
          className: `btn ${editMode ? 'btn-warning' : 'btn-secondary'} btn-header`
        }, 
          React.createElement('span', { className: 'icon icon-edit' }),
          editMode ? 'Exit Edit' : 'Edit Mode'
        ),
        currentUser?.isAdmin && React.createElement('button', { 
          onClick: () => setShowSettings(!showSettings),
          className: 'btn btn-info btn-header'
        }, 
          React.createElement('span', { className: 'icon icon-settings' }),
          'Settings'
        ),
        React.createElement('button', { onClick: exportToExcel, className: 'btn btn-success btn-header' }, 
          React.createElement('span', { className: 'icon icon-export' }),
          'Export'
        ),
        React.createElement('button', { onClick: handleLogout, className: 'btn btn-header' }, 
          React.createElement('span', { className: 'icon icon-logout' }),
          'Logout'
        )
      )
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
          className: 'btn-link'
        }, 'Add Funds')
      ),

      React.createElement('div', { className: 'transaction-section' },
        React.createElement('div', { className: 'transaction-header' },
          React.createElement('h2', null, 'Transactions'),
          React.createElement('div', { style: { display: 'flex', gap: '8px' } },
            React.createElement('button', {
              onClick: () => setShowTransactionForm(true),
              className: 'btn btn-primary'
            }, 
              React.createElement('span', { className: 'icon icon-add' }),
              'New Transaction'
            ),
            React.createElement('button', {
              onClick: handleBDCreation,
              className: 'btn'
            }, 
              React.createElement('span', { className: 'icon icon-bd' }),
              'Create BD'
            )
          )
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
                    onClick: showBDCreation || isPositiveTransaction || editMode ? undefined : () => setSelectedTransaction(transaction),
                    className: isPositiveTransaction ? 'fund-addition-row' : ''
                  },
                    React.createElement('td', { className: 'col-date' },
                      new Date(transaction.dateOfReimbursement).toLocaleDateString()
                    ),
                    React.createElement('td', { className: 'col-beneficiary' }, 
                      isPositiveTransaction ? '-' : transaction.beneficiary
                    ),
                    React.createElement('td', { 
                      className: 'col-article',
                      onClick: isPositiveTransaction && !editMode ? (e) => {
                        e.stopPropagation();
                        setSelectedTransaction(transaction);
                      } : undefined,
                      style: isPositiveTransaction && !editMode ? { 
                        cursor: 'pointer', 
                        color: '#2563eb', 
                        textDecoration: 'underline' 
                      } : {}
                    }, isPositiveTransaction ? 'Fund Addition' : transaction.itemDescription),
                    React.createElement('td', { 
                      className: 'col-amount',
                      style: isPositiveTransaction ? { color: 'green', fontWeight: 'bold' } : { color: 'red', fontWeight: 'bold' }
                    }, `${isPositiveTransaction ? '+' : '-'}$${transaction.amount.toFixed(2)}`),
                    React.createElement('td', { className: 'col-bd' }, transaction.bdNumber || '-'),
                    
                    editMode && React.createElement('td', null,
                      React.createElement('div', { style: { display: 'flex', gap: '4px' } },
                        React.createElement('button', {
                          onClick: (e) => {
                            e.stopPropagation();
                            handleEditTransaction(transaction);
                          },
                          className: 'btn btn-sm btn-secondary',
                          title: 'Edit'
                        }, '✏️'),
                        React.createElement('button', {
                          onClick: (e) => {
                            e.stopPropagation();
                            handleDeleteTransaction(transaction.id);
                          },
                          className: 'btn btn-sm btn-danger',
                          title: 'Delete'
                        }, '🗑️')
                      )
                    ),
                    
                    showBDCreation && React.createElement('td', {
                      onClick: (e) => {
                        e.stopPropagation();
                        if (!hasBD && !isPositiveTransaction) toggleTransactionForBD(transaction.id);
                      }
                    },
                      React.createElement('div', {
                        className: `bd-select-button ${isSelected ? 'selected' : ''} ${hasBD || isPositiveTransaction ? 'disabled' : ''}`
                      },
                        isPositiveTransaction ? '−' : (hasBD ? '✓' : (isSelected ? '−' : '+'))
                      )
                    )
                  );
                })
              )
            )
          )
      )
    ),

    // Modals
    showAddFunds && React.createElement(AddFundsModal, {
      fundsAmount,
      setFundsAmount,
      onAdd: handleAddFunds,
      onCancel: () => setShowAddFunds(false)
    }),

    showTransactionForm && React.createElement(TransactionForm, {
      onSubmit: handleAddTransaction,
      onCancel: () => setShowTransactionForm(false),
      beneficiaries: budgetState.beneficiaries,
      itemDescriptions: budgetState.itemDescriptions,
      flightNumbers: budgetState.flightNumbers
    }),

    selectedTransaction && !editingTransaction && React.createElement(TransactionDetails, {
      transaction: selectedTransaction,
      onClose: () => setSelectedTransaction(null),
      editMode: editMode,
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

    showBDCreation && React.createElement('div', { className: 'bd-controls' },
      React.createElement('span', null, `${selectedForBD.size} transactions selected`),
      React.createElement('button', {
        onClick: submitBDSelection,
        className: 'btn btn-primary'
      }, 'Submit BD'),
      React.createElement('button', {
        onClick: () => setShowBDCreation(false),
        className: 'btn'
      }, 'Cancel')
    ),

    showBDNumberPrompt && React.createElement(BDNumberModal, {
      bdNumber,
      setBdNumber,
      onConfirm: confirmBDCreation,
      onCancel: () => setShowBDNumberPrompt(false)
    }),

    showSettings && currentUser?.isAdmin && React.createElement(AdminPanel, {
      onClose: () => setShowSettings(false)
    })
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(App));