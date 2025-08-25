// React hooks are already declared in index.html

// Main App Component
function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [data, setData] = useState({ 
    budget: 0, 
    transactions: [], 
    beneficiaries: [], 
    itemDescriptions: ['Sky Cap'], 
    flightNumbers: ['AT200', 'AT201'] 
  });
  const [loading, setLoading] = useState(true);
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showAddFunds, setShowAddFunds] = useState(false);
  const [fundsAmount, setFundsAmount] = useState('');
  const [error, setError] = useState('');
  const [screenSize, setScreenSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  // Initialize auth
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      // Validate token format
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp && payload.exp < Date.now() / 1000) {
          localStorage.removeItem('authToken');
          setLoading(false);
          return;
        }
        setIsAuthenticated(true);
        loadData();
      } catch (err) {
        localStorage.removeItem('authToken');
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  // Real-time screen size detection
  useEffect(() => {
    const handleResize = () => {
      setScreenSize({ width: window.innerWidth, height: window.innerHeight });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const loadData = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return;
      
      const response = await fetch(`${API_URL}/api/user-data`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });
      
      if (response.status === 401) {
        // Token expired
        localStorage.removeItem('authToken');
        setIsAuthenticated(false);
        return;
      }
      
      if (!response.ok) {
        throw new Error('Failed to load data');
      }
      
      const userData = await response.json();
      setData(userData);
      setLoading(false);
    } catch (err) {
      console.error('Load data error:', err);
      setError('Failed to load data. Please refresh the page.');
      setLoading(false);
    }
  };

  const handleAuth = (token, user) => {
    setIsAuthenticated(true);
    setCurrentUser(user);
    setError('');
    loadData();
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    setIsAuthenticated(false);
    setCurrentUser(null);
    setError('');
  };

  const handleAddFunds = async () => {
    const amount = parseFloat(fundsAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    
    if (amount > 999999) {
      alert('Amount cannot exceed $999,999');
      return;
    }
    
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/api/update-budget`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`, 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ budget: data.budget + amount }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add funds');
      }
      
      setFundsAmount('');
      setShowAddFunds(false);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAddTransaction = async (transaction) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/api/add-transaction`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`, 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify(transaction),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add transaction');
      }
      
      setShowTransactionForm(false);
      loadData();
    } catch (err) {
      alert(err.message);
    }
  };

  const exportToExcel = () => {
    try {
      const worksheetData = [
        ['Date of Reimbursement', 'Beneficiary', 'Item Description', 'Invoice Number', 'Date of Purchase', 'Amount', 'Amount Left', 'Flight Number', 'Number of Luggage', 'Observations'],
        ...data.transactions.map((transaction, index) => {
          const transactionsUpToHere = data.transactions.slice(0, index + 1);
          const spentUpToHere = transactionsUpToHere.reduce((sum, t) => sum + t.amount, 0);
          const amountLeftAfterTransaction = data.budget - spentUpToHere;
          
          return [
            new Date(transaction.dateOfReimbursement).toLocaleDateString(),
            transaction.beneficiary,
            transaction.itemDescription,
            transaction.invoiceNumber,
            new Date(transaction.dateOfPurchase).toLocaleDateString(),
            transaction.amount,
            amountLeftAfterTransaction.toFixed(2),
            transaction.flightNumber || '',
            transaction.numberOfLuggage || '',
            transaction.observations || ''
          ];
        })
      ];

      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions');
      XLSX.writeFile(workbook, `expense-report-${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err) {
      alert('Failed to export to Excel. Please try again.');
    }
  };

  if (!isAuthenticated) {
    return React.createElement(AuthForm, { onAuth: handleAuth });
  }
  
  if (loading) {
    return React.createElement('div', { 
      className: 'app-container'
    },
      React.createElement('div', { className: 'flex justify-center items-center h-full' },
        React.createElement('div', { className: 'text-center' },
          React.createElement(Loader, { className: 'w-8 h-8 animate-spin text-red-600 mx-auto mb-4' }),
          React.createElement('div', { className: 'text-gray-600 responsive-text' }, 'Loading your expense data...')
        )
      )
    );
  }

  const totalSpent = data.transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
  const remainingBudget = data.budget - totalSpent;
  const isMobile = screenSize.width < 640;
  const isTablet = screenSize.width >= 640 && screenSize.width < 1024;

  return React.createElement('div', { 
    className: 'app-container'
  },
    // Header
    React.createElement('div', { 
      className: 'app-header'
    },
      React.createElement('div', { className: 'flex items-center gap-4' },
        currentUser && React.createElement('span', { className: 'text-sm text-gray-600' }, 
          isMobile ? currentUser.username : `Welcome, ${currentUser.username}`
        ),
        React.createElement('button', { 
          onClick: handleLogout, 
          className: 'btn btn-secondary text-sm no-print'
        },
          React.createElement(LogOut, { className: 'w-4 h-4 mr-2' }),
          isMobile ? '' : 'Logout'
        )
      ),
      React.createElement('button', { 
        onClick: exportToExcel, 
        className: 'btn btn-purple no-print'
      },
        React.createElement(Download, { className: 'w-5 h-5 mr-2' }),
        isMobile ? '' : 'Export to Excel'
      )
    ),

    // Error Display
    error && React.createElement('div', {
      className: 'px-4 py-2 mx-4 mt-4'
    },
      React.createElement('div', { className: 'error-message' }, error)
    ),

    // Main Content
    React.createElement('div', { className: 'app-content' },
      React.createElement('div', { className: 'adaptive-container' },
        // Header
        React.createElement('header', { className: 'text-center mb-8' },
          React.createElement('h1', { className: 'page-title font-bold text-gray-800' }, 
            isMobile ? 'Expense Tracker' : 'Expense Reimbursement Tracker'
          ),
          React.createElement('p', { className: 'page-subtitle text-gray-600' }, 'Manage your reimbursements with ease')
        ),

        // Budget Card
        React.createElement('div', { className: 'flex flex-col items-center mb-8' },
          React.createElement('div', { className: 'budget-card' },
            React.createElement('p', { className: 'responsive-text-lg font-medium mb-2', style: { opacity: 0.9 }}, 'Available Budget'),
            React.createElement('p', { 
              className: 'font-bold',
              style: { fontSize: isMobile ? 'clamp(2rem, 8vw, 3rem)' : 'clamp(3rem, 6vw, 5rem)' }
            }, `$${remainingBudget.toFixed(2)}`)
          ),
          
          React.createElement('button', { 
            onClick: () => setShowAddFunds(true), 
            className: 'btn btn-blue btn-lg no-print'
          },
            React.createElement(Plus, { className: 'w-5 h-5 mr-2' }),
            'Add Funds'
          )
        ),

        // Transaction Table
        React.createElement('div', { 
          className: 'bg-white rounded-xl shadow-lg overflow-hidden mb-8 flex-1',
          style: { minHeight: 0 }
        },
          React.createElement('div', { className: 'p-6 border-b border-gray-200' },
            React.createElement('h2', { className: 'responsive-text-xl font-bold text-gray-800' }, 'Transaction History')
          ),
          
          React.createElement('div', { 
            className: 'table-container',
            style: { maxHeight: `${Math.max(screenSize.height * 0.4, 200)}px` }
          },
            data.transactions.length === 0 ? 
              React.createElement('div', { className: 'empty-state' },
                React.createElement(FileText, { className: 'w-16 h-16 text-gray-300 mx-auto mb-4' }),
                React.createElement('p', { className: 'responsive-text-lg text-gray-600 mb-2' }, 'No transactions yet'),
                React.createElement('p', { className: 'responsive-text text-gray-400' }, 'Add your first transaction to get started')
              ) :
              React.createElement('table', { className: 'table' },
                React.createElement('thead', null,
                  React.createElement('tr', null,
                    React.createElement('th', null, 'Date'),
                    React.createElement('th', null, isMobile ? 'Person' : 'Beneficiary'),
                    React.createElement('th', null, 'Item'),
                    React.createElement('th', null, 'Amount'),
                    !isMobile && React.createElement('th', null, 'Amount Left')
                  )
                ),
                React.createElement('tbody', null,
                  data.transactions.map((transaction, index) => {
                    const transactionsUpToHere = data.transactions.slice(0, index + 1);
                    const spentUpToHere = transactionsUpToHere.reduce((sum, t) => sum + t.amount, 0);
                    const amountLeftAfterTransaction = data.budget - spentUpToHere;
                    
                    return React.createElement('tr', { 
                      key: transaction.id,
                      onClick: () => setSelectedTransaction(transaction)
                    },
                      React.createElement('td', null, 
                        isMobile ? 
                          new Date(transaction.dateOfReimbursement).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) :
                          new Date(transaction.dateOfReimbursement).toLocaleDateString()
                      ),
                      React.createElement('td', null,
                        React.createElement('div', { className: 'flex items-center' },
                          !isMobile && React.createElement(User, { className: 'w-4 h-4 text-gray-400 mr-2' }),
                          React.createElement('span', null, 
                            isMobile && transaction.beneficiary.length > 10 ? 
                              transaction.beneficiary.substring(0, 10) + '...' : 
                              transaction.beneficiary
                          )
                        )
                      ),
                      React.createElement('td', null, 
                        isMobile && transaction.itemDescription.length > 15 ? 
                          transaction.itemDescription.substring(0, 15) + '...' : 
                          transaction.itemDescription
                      ),
                      React.createElement('td', { className: 'font-medium' }, `$${transaction.amount.toFixed(2)}`),
                      !isMobile && React.createElement('td', { className: 'font-medium' }, `$${amountLeftAfterTransaction.toFixed(2)}`)
                    );
                  })
                )
              )
          )
        ),

        // New Transaction Button
        React.createElement('button', { 
          onClick: () => setShowTransactionForm(true), 
          className: 'new-transaction-btn no-print',
          style: { 
            position: 'fixed',
            bottom: isMobile ? '20px' : '30px',
            right: isMobile ? '20px' : '30px',
            zIndex: 50
          }
        }, isMobile ? '+' : 'NEW')
      )
    ),

    // Modals
    showAddFunds && React.createElement('div', { className: 'modal-overlay' },
      React.createElement('div', { className: 'modal-content', style: { maxWidth: '28rem' }},
        React.createElement('div', { className: 'p-6' },
          React.createElement('h3', { className: 'text-xl font-bold text-gray-800 mb-4' }, 'Add Funds'),
          React.createElement('div', { className: 'mb-4' },
            React.createElement('label', { className: 'block text-sm font-medium text-gray-700 mb-2' }, 'Amount'),
            React.createElement('div', { className: 'relative' },
              React.createElement('span', { className: 'absolute left-3 top-3 text-gray-500' }, '$'),
              React.createElement('input', { 
                type: 'number', 
                step: '0.01',
                min: '0.01',
                max: '999999',
                value: fundsAmount, 
                onChange: (e) => setFundsAmount(e.target.value), 
                placeholder: '0.00', 
                className: 'form-input pl-8',
                autoFocus: true 
              })
            )
          ),
          React.createElement('div', { className: 'flex gap-3' },
            React.createElement('button', { 
              onClick: () => setShowAddFunds(false), 
              className: 'btn btn-secondary flex-1'
            }, 'Cancel'),
            React.createElement('button', { 
              onClick: handleAddFunds, 
              disabled: !fundsAmount || parseFloat(fundsAmount) <= 0, 
              className: `btn btn-blue flex-1 ${!fundsAmount || parseFloat(fundsAmount) <= 0 ? 'btn-disabled' : ''}`
            }, 'Add Funds')
          )
        )
      )
    ),

    showTransactionForm && React.createElement(TransactionForm, {
      onSubmit: handleAddTransaction,
      onCancel: () => setShowTransactionForm(false),
      beneficiaries: data.beneficiaries,
      itemDescriptions: data.itemDescriptions,
      flightNumbers: data.flightNumbers
    }),

    selectedTransaction && React.createElement(TransactionDetails, {
      transaction: selectedTransaction,
      onClose: () => setSelectedTransaction(null)
    })
  );
}

// Render the app
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(App));