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

  useEffect(() => {
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
      setError('Failed to load data');
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
      showNotification('Veuillez saisir un montant valide', 'error');
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
        throw new Error(errorData.error || 'Échec de l\'ajout de fonds');
      }

      setFundsAmount('');
      setShowAddFunds(false);
      loadData();
      showNotification(`Fonds ajoutés avec succès: $${amount.toFixed(2)}`, 'success');
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  const handleBDCreation = () => {
    setShowBDCreation(true);
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
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_URL}/api/assign-bd-number`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          transactionIds: Array.from(selectedForBD),
          bdNumber: bdNumber.trim()
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Échec de l\'attribution du numéro BD');
      }

      const count = selectedForBD.size;
      setSelectedForBD(new Set());
      setBdNumber('');
      setShowBDCreation(false);
      setShowBDNumberPrompt(false);
      loadData();
      showNotification(`Numéro BD attribué à ${count} transaction${count > 1 ? 's' : ''}`, 'success');
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  const cancelBDCreation = () => {
    setSelectedForBD(new Set());
    setBdNumber('');
    setShowBDCreation(false);
    setShowBDNumberPrompt(false);
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
        throw new Error(errorData.error || 'Échec de l\'ajout de la transaction');
      }

      setShowTransactionForm(false);
      loadData();
      showNotification('Transaction ajoutée avec succès', 'success');
    } catch (err) {
      showNotification(err.message, 'error');
    }
  };

  const exportToExcel = () => {
    try {
      const worksheetData = [
        ['Date', 'Bénéficiaire', 'Description Item', 'Facture N', 'Date de Facture', 'Montant', 'Solde Restant', 'N de Vol', 'Bagages', 'Observations', 'Numéro BD', 'Nom d\'utilisateur'],
        ...data.transactions.map(transaction => [
          new Date(transaction.dateOfReimbursement).toLocaleDateString('fr-FR'),
          transaction.beneficiary || '-',
          transaction.itemDescription || '-',
          transaction.invoiceNumber || '-',
          transaction.dateOfPurchase ? new Date(transaction.dateOfPurchase).toLocaleDateString('fr-FR') : '-',
          transaction.amount || '-',
          '-', // Solde Restant - always dash
          transaction.flightNumber || '-',
          transaction.numberOfLuggage || '-',
          transaction.observations || '-',
          transaction.bdNumber || '-',
          transaction.username || currentUser?.username || 'Inconnu'
        ])
      ];

      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      
      // Apply gray background to dash cells
      const range = XLSX.utils.decode_range(worksheet['!ref']);
      for (let R = range.s.r + 1; R <= range.e.r; ++R) {
        for (let C = range.s.c; C <= range.e.c; ++C) {
          const cellAddress = XLSX.utils.encode_cell({r: R, c: C});
          const cell = worksheet[cellAddress];
          if (cell && cell.v === '-') {
            worksheet[cellAddress].s = {
              fill: {
                fgColor: { rgb: "E8E8E8" }
              }
            };
          }
        }
      }
      
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions');
      XLSX.writeFile(workbook, `rapport-depenses-${new Date().toISOString().split('T')[0]}.xlsx`);
      showNotification('Rapport Excel exporté avec succès', 'success');
    } catch (err) {
      showNotification('Échec de l\'export vers Excel', 'error');
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
    .filter(transaction => transaction.type !== 'fund_addition')
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  
  // Budget already includes fund additions from server, so just subtract expenses
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
          className: 'btn btn-primary'
        }, 
          React.createElement('span', { className: 'icon icon-money' }),
          'Ajouter des Fonds'
        )
      ),

      React.createElement('div', { className: 'transaction-section' },
        React.createElement('div', { className: 'transaction-header' },
          React.createElement('h2', null, 'Transactions'),
          React.createElement('button', {
            onClick: handleBDCreation,
            className: 'btn'
          }, 
            React.createElement('span', { className: 'icon icon-bd' }),
            'Créer BD'
          )
        ),
        
        data.transactions.length === 0 ?
          React.createElement('div', { className: 'empty-state' }, 'Aucune transaction pour le moment') :
          React.createElement('table', { className: 'transaction-table' },
            React.createElement('thead', null,
              React.createElement('tr', null,
                React.createElement('th', null, 'Date'),
                React.createElement('th', null, 'Bénéficiaire'),
                React.createElement('th', null, 'Article'),
                React.createElement('th', null, 'Montant'),
                React.createElement('th', null, 'BD#'),
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
                  onClick: showBDCreation ? undefined : () => setSelectedTransaction(transaction),
                  className: isPositiveTransaction ? 'fund-addition-row' : ''
                },
                  React.createElement('td', null,
                    new Date(transaction.dateOfReimbursement).toLocaleDateString()
                  ),
                  React.createElement('td', null, isPositiveTransaction ? '-' : transaction.beneficiary),
                  React.createElement('td', null, transaction.itemDescription),
                  React.createElement('td', { 
                    style: isPositiveTransaction ? { color: 'green', fontWeight: 'bold' } : { color: 'red', fontWeight: 'bold' }
                  }, `${isPositiveTransaction ? '+' : '-'}$${transaction.amount.toFixed(2)}`),
                  React.createElement('td', null, transaction.bdNumber || '-'),
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
    ),

    React.createElement('button', {
      onClick: () => setShowTransactionForm(true),
      className: 'fab'
    }, React.createElement('span', { className: 'icon icon-add' })),

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