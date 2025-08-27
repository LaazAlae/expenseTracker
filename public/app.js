// Notification system
let notificationTimeout = null;

function showNotification(message, type = 'info') {
  // Remove existing notification
  const existing = document.querySelector('.notification');
  if (existing) existing.remove();
  if (notificationTimeout) clearTimeout(notificationTimeout);

  // Create new notification
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.innerHTML = `
    <span class="icon icon-${type}"></span>
    ${message}
  `;
  
  document.body.appendChild(notification);
  
  // Auto remove after 4 seconds
  notificationTimeout = setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 4000);
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState({
    budget: 0,
    transactions: [],
    beneficiaries: [],
    itemDescriptions: ['Sky Cap'],
    flightNumbers: ['AT200', 'AT201']
  });
  
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showAddFunds, setShowAddFunds] = useState(false);
  const [fundsAmount, setFundsAmount] = useState('');
  
  const [showBDCreation, setShowBDCreation] = useState(false);
  const [selectedForBD, setSelectedForBD] = useState(new Set());
  const [bdNumber, setBdNumber] = useState('');
  const [showBDNumberPrompt, setShowBDNumberPrompt] = useState(false);

  // Check authentication on load
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('currentUser');
    
    if (token && user) {
      try {
        setCurrentUser(JSON.parse(user));
        setIsAuthenticated(true);
        fetchData();
      } catch (err) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const fetchData = async () => {
    try {
      const authToken = localStorage.getItem('authToken');
      console.log('Fetching data with token:', authToken ? 'present' : 'missing');
      
      const response = await fetch('/api/user-data', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });
      
      console.log('Response status:', response.status);
      
      if (response.ok) {
        const userData = await response.json();
        setData(userData);
      } else {
        if (response.status === 401) {
          // Token is invalid, clear auth
          localStorage.removeItem('authToken');
          localStorage.removeItem('currentUser');
          setIsAuthenticated(false);
          setCurrentUser(null);
        }
        throw new Error('Failed to fetch data');
      }
    } catch (err) {
      console.error('Fetch data error:', err);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = (user) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    setLoading(true);
    fetchData();
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    setIsAuthenticated(false);
    setCurrentUser(null);
    setData({
      budget: 0,
      transactions: [],
      beneficiaries: [],
      itemDescriptions: ['Sky Cap'],
      flightNumbers: ['AT200', 'AT201']
    });
  };

  const handleAddFunds = async () => {
    if (!fundsAmount || parseFloat(fundsAmount) <= 0) {
      showNotification('Veuillez saisir un montant valide', 'error');
      return;
    }

    try {
      const authToken = localStorage.getItem('authToken');
      const response = await fetch('/api/update-budget', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          budget: data.budget + parseFloat(fundsAmount)
        })
      });

      if (response.ok) {
        showNotification('Fonds ajoutés avec succès', 'success');
        setFundsAmount('');
        setShowAddFunds(false);
        fetchData();
      } else {
        throw new Error('Failed to add funds');
      }
    } catch (err) {
      showNotification('Erreur lors de l\'ajout des fonds', 'error');
    }
  };

  const handleAddTransaction = async (transactionData) => {
    try {
      const authToken = localStorage.getItem('authToken');
      const response = await fetch('/api/add-transaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(transactionData)
      });

      if (response.ok) {
        showNotification('Transaction ajoutée avec succès', 'success');
        setShowTransactionForm(false);
        fetchData();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add transaction');
      }
    } catch (err) {
      showNotification(err.message, 'error');
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
      showNotification('Veuillez sélectionner au moins une transaction', 'warning');
      return;
    }
    setShowBDNumberPrompt(true);
  };

  const confirmBDCreation = async () => {
    if (!bdNumber.trim()) {
      showNotification('Veuillez saisir un numéro BD', 'error');
      return;
    }

    try {
      const authToken = localStorage.getItem('authToken');
      const response = await fetch('/api/assign-bd-number', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          transactionIds: Array.from(selectedForBD),
          bdNumber: bdNumber.trim()
        })
      });

      if (response.ok) {
        const result = await response.json();
        showNotification(result.message, 'success');
        setShowBDNumberPrompt(false);
        setShowBDCreation(false);
        setSelectedForBD(new Set());
        setBdNumber('');
        fetchData();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to assign BD number');
      }
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  const cancelBDCreation = () => {
    setShowBDCreation(false);
    setSelectedForBD(new Set());
  };

  const exportToExcel = async () => {
    try {
      const workbook = XLSX.utils.book_new();
      const worksheetData = [
        ['Date de Remboursement', 'Bénéficiaire', 'Description Article', 'Numéro Facture', 'Date d\'Achat', 'Montant', 'Observations', 'Numéro de Vol', 'Nombre de Bagages', 'BD#']
      ];

      data.transactions
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
      XLSX.writeFile(workbook, `transactions_${new Date().toISOString().split('T')[0]}.xlsx`);
      showNotification('Fichier Excel exporté avec succès', 'success');
    } catch (err) {
      showNotification('Erreur lors de l\'export Excel', 'error');
    }
  };

  if (!isAuthenticated) {
    return React.createElement(AuthForm, { onAuth: handleAuth });
  }

  if (loading) {
    return React.createElement('div', { className: 'app' },
      React.createElement('div', { style: { padding: '50px', textAlign: 'center' } },
        'Chargement...'
      )
    );
  }

  const totalExpenses = data.transactions
    .filter(t => t.type !== 'fund_addition')
    .reduce((sum, t) => sum + t.amount, 0);
  const remainingBudget = data.budget - totalExpenses;

  return React.createElement('div', { className: 'app' },
    React.createElement('div', { className: 'header' },
      React.createElement('h1', null, `Bienvenu ${currentUser?.username || 'Utilisateur'}`),
      React.createElement('div', { className: 'header-actions' },
        currentUser ? React.createElement('span', { className: 'header-user' }, `${currentUser.username}`) : '',
        React.createElement('button', { onClick: exportToExcel, className: 'btn btn-success btn-header' }, 
          React.createElement('span', { className: 'icon icon-export' }),
          'Exporter'
        ),
        React.createElement('button', { onClick: handleLogout, className: 'btn btn-header' }, 
          React.createElement('span', { className: 'icon icon-logout' }),
          'Déconnexion'
        )
      )
    ),

    error && React.createElement('div', { className: 'error-message' }, error),

    React.createElement('div', { className: 'main' },
      React.createElement('div', { className: 'budget-card' },
        React.createElement('h2', null, 'Budget Disponible'),
        React.createElement('div', {
          className: `budget-amount${remainingBudget <= 0 ? ' negative' : ''}`
        }, `$${remainingBudget.toFixed(2)}`),
        React.createElement('button', {
          onClick: () => setShowAddFunds(true),
          className: 'btn-link'
        }, 'Ajouter des Fonds')
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
              'Nouvelle Transaction'
            ),
            React.createElement('button', {
              onClick: handleBDCreation,
              className: 'btn'
            }, 
              React.createElement('span', { className: 'icon icon-bd' }),
              'Créer BD'
            )
          )
        ),
        
        data.transactions.length === 0 ?
          React.createElement('div', { className: 'empty-state' }, 'Aucune transaction pour le moment') :
          React.createElement('div', { className: 'transaction-table-container' },
            React.createElement('table', { className: 'transaction-table' },
              React.createElement('thead', null,
                React.createElement('tr', null,
                  React.createElement('th', { className: 'col-date' }, 'Date'),
                  React.createElement('th', { className: 'col-beneficiary' }, 'Bénéficiaire'),
                  React.createElement('th', { className: 'col-article' }, 'Article'),
                  React.createElement('th', { className: 'col-amount' }, 'Montant'),
                  React.createElement('th', { className: 'col-bd' }, 'BD#'),
                  showBDCreation && React.createElement('th', null, 'Sélectionner')
                )
              ),
              React.createElement('tbody', null,
                data.transactions.map(transaction => {
                  const hasBD = transaction.bdNumber;
                  const isSelected = selectedForBD.has(transaction.id);
                  const isPositiveTransaction = transaction.type === 'fund_addition';
                  
                  return React.createElement('tr', {
                    key: transaction.id,
                    onClick: showBDCreation || isPositiveTransaction ? undefined : () => setSelectedTransaction(transaction),
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
                      onClick: isPositiveTransaction ? (e) => {
                        e.stopPropagation();
                        setSelectedTransaction(transaction);
                      } : undefined,
                      style: isPositiveTransaction ? { 
                        cursor: 'pointer', 
                        color: '#2563eb', 
                        textDecoration: 'underline' 
                      } : {}
                    }, isPositiveTransaction ? 'Ajout de fonds' : transaction.itemDescription),
                    React.createElement('td', { 
                      className: 'col-amount',
                      style: isPositiveTransaction ? { color: 'green', fontWeight: 'bold' } : { color: 'red', fontWeight: 'bold' }
                    }, `${isPositiveTransaction ? '+' : '-'}$${transaction.amount.toFixed(2)}`),
                    React.createElement('td', { className: 'col-bd' }, transaction.bdNumber || '-'),
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
    showAddFunds && React.createElement('div', { className: 'modal-overlay' },
      React.createElement('div', { className: 'modal' },
        React.createElement('div', { className: 'modal-header' },
          React.createElement('h3', null, 'Ajouter des Fonds'),
          React.createElement('button', {
            onClick: () => setShowAddFunds(false)
          }, '×')
        ),
        React.createElement('div', { className: 'modal-body' },
          React.createElement('div', { className: 'form-group' },
            React.createElement('label', { className: 'form-label' }, 'Montant'),
            React.createElement('input', {
              type: 'number',
              step: '0.01',
              value: fundsAmount,
              onChange: (e) => setFundsAmount(e.target.value),
              className: 'form-input',
              placeholder: '0.00'
            })
          )
        ),
        React.createElement('div', { className: 'modal-footer' },
          React.createElement('button', {
            onClick: () => setShowAddFunds(false),
            className: 'btn'
          }, 'Annuler'),
          React.createElement('button', {
            onClick: handleAddFunds,
            className: 'btn btn-primary'
          }, 'Ajouter des Fonds')
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
    }),

    showBDCreation && React.createElement('div', { className: 'bd-controls' },
      React.createElement('span', null, `${selectedForBD.size} transactions sélectionnées`),
      React.createElement('button', {
        onClick: submitBDSelection,
        className: 'btn btn-primary'
      }, 'Soumettre BD'),
      React.createElement('button', {
        onClick: cancelBDCreation,
        className: 'btn'
      }, 'Annuler')
    ),

    showBDNumberPrompt && React.createElement('div', { className: 'modal-overlay' },
      React.createElement('div', { className: 'modal' },
        React.createElement('div', { className: 'modal-header' },
          React.createElement('h3', null, 'Saisir le Numéro BD'),
          React.createElement('button', {
            onClick: () => setShowBDNumberPrompt(false)
          }, '×')
        ),
        React.createElement('div', { className: 'modal-body' },
          React.createElement('div', { className: 'form-group' },
            React.createElement('label', { className: 'form-label' }, 'Numéro BD'),
            React.createElement('input', {
              type: 'text',
              value: bdNumber,
              onChange: (e) => setBdNumber(e.target.value),
              className: 'form-input',
              placeholder: 'BD-2025-001'
            })
          )
        ),
        React.createElement('div', { className: 'modal-footer' },
          React.createElement('button', {
            onClick: () => setShowBDNumberPrompt(false),
            className: 'btn'
          }, 'Annuler'),
          React.createElement('button', {
            onClick: confirmBDCreation,
            className: 'btn btn-primary'
          }, 'Confirmer')
        )
      )
    )
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(App));