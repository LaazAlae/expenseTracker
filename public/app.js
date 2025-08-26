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
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Initialize auth - online only
  useEffect(() => {
    if (!navigator.onLine) {
      setError('This app requires an internet connection to function properly.');
      setLoading(false);
      return;
    }
    
    const token = localStorage.getItem('authToken');
    if (token) {
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

  // Real-time screen size detection and online status
  useEffect(() => {
    const handleResize = () => {
      setScreenSize({ width: window.innerWidth, height: window.innerHeight });
    };
    
    const handleOnline = () => {
      setIsOnline(true);
      setError('');
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      setError('This app requires an internet connection to function properly.');
    };
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadData = async () => {
    if (!navigator.onLine) {
      setError('This app requires an internet connection to function properly.');
      setLoading(false);
      return;
    }
    
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
      setError('Failed to load data. Please check your internet connection.');
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
    if (!navigator.onLine) {
      alert('This action requires an internet connection.');
      return;
    }
    
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
    if (!navigator.onLine) {
      alert('This action requires an internet connection.');
      return;
    }
    
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

  // Show auth form if not authenticated
  if (!isAuthenticated) {
    return React.createElement(AuthForm, { onAuth: handleAuth });
  }
  
  // Show loading screen
  if (loading) {
    return React.createElement('div', { className: 'app-container' },
      React.createElement('div', { className: 'flex items-center justify-center h-full' },
        React.createElement('div', { className: 'text-center' },
          React.createElement(Loader, { className: 'icon animate-spin text-gray-600 mx-auto mb-4' }),
          React.createElement('div', { className: 'text-gray-600' }, 'Loading your expense data...')
        )
      )
    );
  }

  const totalSpent = data.transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
  const remainingBudget = data.budget - totalSpent;
  const isMobile = screenSize.width < 640;

  return React.createElement('div', { className: 'app-container' },
    // Professional Header with Perfect Alignment
    React.createElement('div', { className: 'app-header' },
      React.createElement('div', { className: 'header-left' },
        React.createElement('button', { 
          onClick: handleLogout, 
          className: 'btn btn-secondary no-print'
        },
          React.createElement(LogOut, { className: 'icon mr-2' }),
          isMobile ? '' : 'Logout'
        )
      ),
      React.createElement('div', { className: 'header-center' },
        currentUser ? `Hello, ${currentUser.username}` : ''
      ),
      React.createElement('div', { className: 'header-right' },
        React.createElement('button', { 
          onClick: exportToExcel, 
          className: 'btn btn-secondary no-print'
        },
          React.createElement(Download, { className: 'icon mr-2' }),
          isMobile ? '' : 'Export'
        )
      )
    ),

    // Error Display
    error && React.createElement('div', { className: 'error-message' }, error),

    // Main Professional Content
    React.createElement('div', { className: 'app-content' },
      React.createElement('div', { className: 'content-container' },
        
        // Clean Budget Section - More Compact Layout
        React.createElement('div', { className: 'budget-section' },
          React.createElement('div', { className: 'budget-display' },
            React.createElement('div', { className: 'budget-label' }, 'Available Budget'),
            React.createElement('div', { 
              className: `budget-amount${remainingBudget <= 0 ? ' negative' : ''}` 
            }, 
              `$${remainingBudget.toFixed(2)}`
            )
          ),
          React.createElement('button', { 
            onClick: () => setShowAddFunds(true), 
            className: 'btn btn-link no-print'
          },
            React.createElement(Plus, { className: 'icon mr-2' }),
            'Add Funds'
          )
        ),

        // Professional Transaction Section
        React.createElement('div', { className: 'transaction-section' },
          React.createElement('div', { className: 'transaction-header' },
            React.createElement('h2', null, 'Transaction History')
          ),
          React.createElement('div', { className: 'transaction-content' },
            data.transactions.length === 0 ? 
              React.createElement('div', { className: 'empty-state' },
                React.createElement(FileText, { className: 'empty-icon' }),
                React.createElement('div', { className: 'empty-title' }, 'No transactions yet'),
                React.createElement('div', { className: 'empty-subtitle' }, 'Add your first transaction to get started')
              ) :
              React.createElement('table', { className: 'table' },
                React.createElement('thead', null,
                  React.createElement('tr', null,
                    React.createElement('th', null, 'Date'),
                    React.createElement('th', null, isMobile ? 'Person' : 'Beneficiary'),
                    React.createElement('th', null, 'Item'),
                    React.createElement('th', null, 'Amount'),
                    !isMobile && React.createElement('th', null, 'Remaining')
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
                          !isMobile && React.createElement(User, { className: 'icon text-gray-600 mr-2' }),
                          React.createElement('span', null, 
                            isMobile && transaction.beneficiary.length > 12 ? 
                              transaction.beneficiary.substring(0, 12) + '...' : 
                              transaction.beneficiary
                          )
                        )
                      ),
                      React.createElement('td', null, 
                        isMobile && transaction.itemDescription.length > 15 ? 
                          transaction.itemDescription.substring(0, 15) + '...' : 
                          transaction.itemDescription
                      ),
                      React.createElement('td', { className: 'font-medium' }, 
                        `$${transaction.amount.toFixed(2)}`
                      ),
                      !isMobile && React.createElement('td', { className: 'font-medium' }, 
                        `$${amountLeftAfterTransaction.toFixed(2)}`
                      )
                    );
                  })
                )
              )
          )
        )
      )
    ),

    // Professional Floating Action Button - More Prominent
    React.createElement('button', { 
      onClick: () => setShowTransactionForm(true), 
      className: 'fab-button no-print',
      title: 'Add New Transaction'
    }, '+'),

    // Professional Add Funds Modal
    showAddFunds && React.createElement('div', { className: 'modal-overlay' },
      React.createElement('div', { className: 'modal-content' },
        React.createElement('div', { className: 'modal-header' },
          React.createElement('h3', { className: 'modal-title' }, 'Add Funds'),
          React.createElement('button', { 
            onClick: () => setShowAddFunds(false),
            className: 'btn btn-secondary'
          }, '×')
        ),
        React.createElement('div', { className: 'modal-body' },
          React.createElement('div', { className: 'form-group' },
            React.createElement('label', { className: 'form-label' }, 'Amount'),
            React.createElement('div', { className: 'relative' },
              React.createElement('span', { 
                className: 'absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500' 
              }, '$'),
              React.createElement('input', { 
                type: 'number', 
                step: '0.01',
                min: '0.01',
                max: '999999',
                value: fundsAmount, 
                onChange: (e) => setFundsAmount(e.target.value), 
                placeholder: '0.00', 
                className: 'form-input',
                autoFocus: true,
                style: { paddingLeft: '2.5rem' }
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

    // Transaction Form Modal
    showTransactionForm && React.createElement(TransactionForm, {
      onSubmit: handleAddTransaction,
      onCancel: () => setShowTransactionForm(false),
      beneficiaries: data.beneficiaries,
      itemDescriptions: data.itemDescriptions,
      flightNumbers: data.flightNumbers
    }),

    // Transaction Details Modal
    selectedTransaction && React.createElement(TransactionDetails, {
      transaction: selectedTransaction,
      onClose: () => setSelectedTransaction(null)
    })
  );
}

// Render the app
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(App));