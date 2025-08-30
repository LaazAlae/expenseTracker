// CLEAN APP WITH NEW WEBSOCKET SYSTEM
// Replaces the complex app.js with simple, reliable websocket integration

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

// Make notification available globally
window.showNotification = showNotification;

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // WebSocket hook for clean integration
  const {
    connectionStatus,
    isConnected,
    connectWebSocket,
    disconnectWebSocket,
    budgetState,
    currentUser,
    addFunds,
    addTransaction,
    editTransaction,
    deleteTransaction,
    assignBdNumber
  } = window.useWebSocket();

  // UI state
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showAddFunds, setShowAddFunds] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [showBDCreation, setShowBDCreation] = useState(false);
  const [selectedForBD, setSelectedForBD] = useState(new Set());
  const [bdNumber, setBdNumber] = useState('');
  const [showBDNumberPrompt, setShowBDNumberPrompt] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // ENSURE SCROLL RESTORATION WHEN MODALS CLOSE
  useEffect(() => {
    if (!showTransactionForm && !selectedTransaction && !showAddFunds && !editingTransaction && !showBDNumberPrompt && !showSettings) {
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
    }
  }, [showTransactionForm, selectedTransaction, showAddFunds, editingTransaction, showBDNumberPrompt, showSettings]);

  // Check authentication on load
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    
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
          localStorage.setItem('currentUser', JSON.stringify(data.user));
          initializeConnection(token);
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

  const initializeConnection = async (token) => {
    try {
      setLoading(true);
      await connectWebSocket(token);
      setIsAuthenticated(true);
      setLoading(false);
    } catch (error) {
      console.error('Connection failed:', error);
      setLoading(false);
      handleLogout();
    }
  };

  const handleAuth = async (userData) => {
    const { token, user } = userData;
    localStorage.setItem('authToken', token);
    localStorage.setItem('currentUser', JSON.stringify(user));
    
    await initializeConnection(token);
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    disconnectWebSocket();
    setIsAuthenticated(false);
    setLoading(false);
  };

  // Make logout available globally
  window.handleLogout = handleLogout;

  // Transaction handlers
  const handleAddFunds = (amount) => {
    if (!amount || parseFloat(amount) <= 0) {
      showNotification('Please enter a valid amount', 'error');
      throw new Error('Invalid amount');
    }

    return addFunds(amount)
      .then(() => {
        console.log('Funds added successfully');
      })
      .catch(error => {
        console.error('Add funds failed:', error);
        showNotification('Failed to add funds', 'error');
        throw error;
      });
  };

  const handleAddTransaction = (transactionData) => {
    return addTransaction(transactionData)
      .then(() => {
        console.log('Transaction added successfully');
      })
      .catch(error => {
        console.error('Add transaction failed:', error);
        showNotification('Failed to add transaction', 'error');
        throw error;
      });
  };

  const handleEditTransaction = (transaction) => {
    if (!transaction) {
      console.error('No transaction provided to edit');
      return;
    }
    setEditingTransaction({...transaction});
  };

  const handleSaveEditTransaction = (updates) => {
    return editTransaction(editingTransaction.id, updates)
      .then(() => {
        setEditingTransaction(null);
      })
      .catch(error => {
        console.error('Edit transaction failed:', error);
        showNotification('Failed to edit transaction', 'error');
        throw error;
      });
  };

  const handleDeleteTransaction = (transactionId) => {
    if (confirm('Are you sure you want to delete this transaction?')) {
      deleteTransaction(transactionId)
        .catch(error => {
          console.error('Delete transaction failed:', error);
          showNotification('Failed to delete transaction', 'error');
        });
    }
  };

  // BD number handlers
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

    assignBdNumber(Array.from(selectedForBD), bdNumber.trim())
      .then(() => {
        setShowBDCreation(false);
        setShowBDNumberPrompt(false);
        setSelectedForBD(new Set());
        setBdNumber('');
      })
      .catch(error => {
        console.error('BD assignment failed:', error);
        showNotification('Failed to assign BD number', 'error');
      });
  };

  // Excel export
  const exportToExcel = async () => {
    try {
      const workbook = XLSX.utils.book_new();

      const worksheetData = [
        ['Date of Reimbursement', 'Beneficiary', 'Item Description', 'Invoice Number', 'Date of Purchase', 'Amount', 'Amount Left', 'Flight Number', 'Number of Luggage', 'Observations', 'Username']
      ];

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

  // Connection status display
  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return '🟢 Connected';
      case 'connecting': return '🟡 Connecting...';
      case 'disconnected': return '🔴 Disconnected';
      case 'failed': return '🔴 Connection Failed';
      default: return '🟡 Unknown';
    }
  };

  if (!isAuthenticated) {
    return React.createElement(AuthForm, { onAuth: handleAuth });
  }

  if (loading) {
    return React.createElement('div', { className: 'app' },
      React.createElement('div', { style: { padding: '50px', textAlign: 'center' } },
        'Loading...',
        React.createElement('br'),
        React.createElement('small', null, getConnectionStatusText())
      )
    );
  }

  // Budget values from centralized state
  const availableBudget = budgetState.availableBudget;
  const totalFundsAdded = budgetState.totalFundsAdded;
  const totalExpenses = budgetState.totalExpenses;

  return React.createElement('div', { className: 'app' },
    React.createElement('div', { className: 'header' },
      React.createElement('h1', null, `Welcome ${currentUser?.username || 'User'}`),
      
      // Connection status indicator
      React.createElement('div', { className: 'connection-status', style: { fontSize: '12px', opacity: 0.8 } }, 
        getConnectionStatusText()
      ),
      
      React.createElement('div', { className: 'header-actions' },
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

      showMobileMenu && React.createElement('div', { className: 'professional-menu' },
        React.createElement('div', { className: 'menu-header' },
          React.createElement('div', { className: 'menu-user-info' },
            React.createElement('div', { className: 'menu-user-name' }, currentUser?.username || 'User'),
            React.createElement('div', { className: 'menu-user-role' }, 
              currentUser?.isAdmin ? 'Administrator' : 'User'
            )
          ),
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
          disabled: !isConnected
        }, 'Add Funds')
      ),

      React.createElement('div', { className: 'action-bar' },
        React.createElement('button', {
          onClick: () => setShowTransactionForm(true),
          className: 'btn btn-primary btn-action',
          disabled: !isConnected
        }, 'New Transaction'),
        React.createElement('button', {
          onClick: handleBDCreation,
          className: `btn btn-action ${showBDCreation ? 'btn-warning' : 'btn-secondary'}`,
          disabled: !isConnected,
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
                          className: 'fund-addition-label'
                        }, 'Fund Addition') :
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

    // MODALS
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

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(App));