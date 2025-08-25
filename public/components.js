// React hooks are available globally from app.js

// Auth Form Component
function AuthForm({ onAuth }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    // Basic client-side validation
    if (username.trim().length < 3) {
      setError('Username must be at least 3 characters');
      setLoading(false);
      return;
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }
    
    try {
      const endpoint = isLogin ? '/api/login' : '/api/register';
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: username.trim(), 
          password 
        }),
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      
      localStorage.setItem('authToken', data.token);
      onAuth(data.token, data.user);
    } catch (err) {
      setError(err.message || 'Authentication failed');
    }
    setLoading(false);
  };

  return React.createElement('div', { className: 'auth-container' },
    React.createElement('div', { className: 'auth-card' },
      React.createElement('div', { className: 'text-center mb-8' },
        React.createElement('h1', { className: 'text-3xl font-bold text-gray-800 mb-2' }, 'Expense Tracker'),
        React.createElement('p', { className: 'text-gray-600' }, 
          isLogin ? 'Sign in to your account' : 'Create a new account'
        )
      ),
      
      React.createElement('form', { onSubmit: handleSubmit },
        React.createElement('div', { className: 'mb-4' },
          React.createElement('label', { className: 'flex items-center text-sm font-medium text-gray-700 mb-2' },
            React.createElement(User, { className: 'w-4 h-4 mr-2' }),
            'Username'
          ),
          React.createElement('input', {
            type: 'text',
            value: username,
            onChange: (e) => setUsername(e.target.value),
            className: 'form-input',
            placeholder: 'Enter your username',
            required: true,
            maxLength: 30
          })
        ),
        
        React.createElement('div', { className: 'mb-6' },
          React.createElement('label', { className: 'block text-sm font-medium text-gray-700 mb-2' }, 'Password'),
          React.createElement('input', {
            type: 'password',
            value: password,
            onChange: (e) => setPassword(e.target.value),
            className: 'form-input',
            placeholder: 'Enter your password',
            required: true,
            minLength: 6,
            maxLength: 128
          })
        ),
        
        error && React.createElement('div', { 
          className: 'error-message'
        }, error),
        
        React.createElement('button', {
          type: 'submit',
          disabled: loading,
          className: `btn btn-primary btn-lg w-full mb-4 ${loading ? 'btn-disabled' : ''}`
        }, loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'),
        
        React.createElement('button', {
          type: 'button',
          onClick: () => { setIsLogin(!isLogin); setError(''); setUsername(''); setPassword(''); },
          className: 'btn btn-secondary w-full'
        }, isLogin ? 'Need an account? Sign Up' : 'Already have an account? Sign In')
      )
    )
  );
}

// Transaction Form Component  
function TransactionForm({ onSubmit, onCancel, beneficiaries, itemDescriptions, flightNumbers }) {
  const [formData, setFormData] = useState({
    dateOfReimbursement: new Date().toISOString().split('T')[0],
    beneficiary: '',
    itemDescription: '',
    invoiceNumber: '',
    dateOfPurchase: '',
    amount: '',
    observations: '',
    flightNumber: '',
    numberOfLuggage: ''
  });

  const isSkyCapSelected = formData.itemDescription.toLowerCase() === 'sky cap';

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Client-side validation
    if (!formData.beneficiary.trim()) {
      alert('Beneficiary is required');
      return;
    }
    
    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    
    if (amount > 999999) {
      alert('Amount cannot exceed $999,999');
      return;
    }
    
    const transaction = {
      ...formData,
      beneficiary: formData.beneficiary.trim(),
      itemDescription: formData.itemDescription.trim(),
      invoiceNumber: formData.invoiceNumber.trim(),
      amount: amount,
      observations: formData.observations.trim(),
      numberOfLuggage: isSkyCapSelected && formData.numberOfLuggage ? parseInt(formData.numberOfLuggage) : undefined,
      flightNumber: isSkyCapSelected ? formData.flightNumber.trim().toUpperCase() : undefined
    };
    
    onSubmit(transaction);
  };

  const isValid = () => {
    const required = ['beneficiary', 'itemDescription', 'invoiceNumber', 'dateOfPurchase', 'amount'];
    const basicValid = required.every(field => formData[field].toString().trim() !== '');
    const validAmount = !isNaN(parseFloat(formData.amount)) && parseFloat(formData.amount) > 0;
    
    if (isSkyCapSelected) {
      return basicValid && validAmount && formData.flightNumber.trim() !== '' && formData.numberOfLuggage.toString().trim() !== '';
    }
    return basicValid && validAmount;
  };

  return React.createElement('div', { className: 'modal-overlay' },
    React.createElement('div', { className: 'modal-content', style: { maxWidth: '32rem' }},
      React.createElement('form', { onSubmit: handleSubmit, className: 'p-6' },
        React.createElement('div', { className: 'flex justify-between items-center mb-6' },
          React.createElement('h2', { className: 'text-2xl font-bold text-gray-800' }, 'New Transaction'),
          React.createElement('button', { 
            type: 'button', 
            onClick: onCancel, 
            className: 'text-2xl text-gray-400 hover:text-gray-600'
          }, '×')
        ),

        React.createElement('div', { className: 'flex flex-col gap-4' },
          React.createElement('div', null,
            React.createElement('label', { className: 'block text-sm font-medium text-gray-700 mb-2' }, 'Date of Reimbursement'),
            React.createElement('input', { 
              type: 'date', 
              value: formData.dateOfReimbursement, 
              onChange: (e) => setFormData(prev => ({...prev, dateOfReimbursement: e.target.value})), 
              className: 'form-input',
              required: true 
            })
          ),
          
          React.createElement('div', null,
            React.createElement('label', { className: 'block text-sm font-medium text-gray-700 mb-2' }, 'Beneficiary'),
            React.createElement('input', { 
              type: 'text', 
              value: formData.beneficiary, 
              onChange: (e) => setFormData(prev => ({...prev, beneficiary: e.target.value})), 
              list: 'beneficiaries', 
              className: 'form-input',
              placeholder: 'Enter beneficiary name',
              required: true,
              maxLength: 100
            }),
            React.createElement('datalist', { id: 'beneficiaries' }, 
              beneficiaries.map((b, i) => React.createElement('option', { key: i, value: b }))
            )
          ),
          
          React.createElement('div', null,
            React.createElement('label', { className: 'block text-sm font-medium text-gray-700 mb-2' }, 'Item Description'),
            React.createElement('input', { 
              type: 'text', 
              value: formData.itemDescription, 
              onChange: (e) => setFormData(prev => ({...prev, itemDescription: e.target.value})), 
              list: 'items', 
              className: 'form-input',
              placeholder: 'Enter item description',
              required: true,
              maxLength: 200
            }),
            React.createElement('datalist', { id: 'items' }, 
              itemDescriptions.map((item, i) => React.createElement('option', { key: i, value: item }))
            )
          ),
          
          React.createElement('div', null,
            React.createElement('label', { className: 'block text-sm font-medium text-gray-700 mb-2' }, 'Invoice Number'),
            React.createElement('input', { 
              type: 'text', 
              value: formData.invoiceNumber, 
              onChange: (e) => setFormData(prev => ({...prev, invoiceNumber: e.target.value})), 
              className: 'form-input',
              placeholder: 'Enter invoice number',
              required: true,
              maxLength: 50
            })
          ),
          
          React.createElement('div', null,
            React.createElement('label', { className: 'block text-sm font-medium text-gray-700 mb-2' }, 'Date of Purchase'),
            React.createElement('input', { 
              type: 'date', 
              value: formData.dateOfPurchase, 
              onChange: (e) => setFormData(prev => ({...prev, dateOfPurchase: e.target.value})), 
              className: 'form-input',
              required: true 
            })
          ),
          
          React.createElement('div', null,
            React.createElement('label', { className: 'block text-sm font-medium text-gray-700 mb-2' }, 'Amount'),
            React.createElement('div', { className: 'relative' },
              React.createElement('span', { className: 'absolute left-3 top-3 text-gray-500' }, '$'),
              React.createElement('input', { 
                type: 'number', 
                step: '0.01', 
                min: '0.01',
                max: '999999',
                value: formData.amount, 
                onChange: (e) => setFormData(prev => ({...prev, amount: e.target.value})), 
                className: 'form-input pl-8',
                placeholder: '0.00',
                required: true 
              })
            )
          ),

          isSkyCapSelected && [
            React.createElement('div', { key: 'flight' },
              React.createElement('label', { className: 'block text-sm font-medium text-gray-700 mb-2' }, 'Flight Number'),
              React.createElement('input', { 
                type: 'text', 
                value: formData.flightNumber, 
                onChange: (e) => setFormData(prev => ({...prev, flightNumber: e.target.value})), 
                list: 'flights', 
                className: 'form-input',
                placeholder: 'Enter flight number',
                required: true,
                maxLength: 20
              }),
              React.createElement('datalist', { id: 'flights' }, 
                flightNumbers.map((f, i) => React.createElement('option', { key: i, value: f }))
              )
            ),
            React.createElement('div', { key: 'luggage' },
              React.createElement('label', { className: 'block text-sm font-medium text-gray-700 mb-2' }, 'Number of Luggage'),
              React.createElement('input', { 
                type: 'number', 
                min: '1', 
                max: '99',
                value: formData.numberOfLuggage, 
                onChange: (e) => setFormData(prev => ({...prev, numberOfLuggage: e.target.value})), 
                className: 'form-input',
                placeholder: '1',
                required: true 
              })
            )
          ],
          
          React.createElement('div', null,
            React.createElement('label', { className: 'block text-sm font-medium text-gray-700 mb-2' }, 'Observations (Optional)'),
            React.createElement('textarea', { 
              value: formData.observations, 
              onChange: (e) => setFormData(prev => ({...prev, observations: e.target.value})), 
              rows: 4, 
              className: 'form-textarea',
              placeholder: 'Additional notes or observations',
              maxLength: 500
            })
          )
        ),

        React.createElement('div', { className: 'flex gap-3 mt-6' },
          React.createElement('button', { 
            type: 'button', 
            onClick: onCancel, 
            className: 'btn btn-secondary flex-1'
          }, 'Cancel'),
          React.createElement('button', { 
            type: 'submit', 
            disabled: !isValid(), 
            className: `btn btn-primary flex-1 ${!isValid() ? 'btn-disabled' : ''}`
          }, 'Add Transaction')
        )
      )
    )
  );
}

// Transaction Details Component
function TransactionDetails({ transaction, onClose }) {
  if (!transaction) return null;

  return React.createElement('div', { className: 'modal-overlay' },
    React.createElement('div', { className: 'modal-content', style: { maxWidth: '48rem' }},
      React.createElement('div', { className: 'p-6' },
        React.createElement('div', { className: 'flex justify-between items-center mb-6' },
          React.createElement('h2', { className: 'text-2xl font-bold text-gray-800' }, 'Transaction Details'),
          React.createElement('button', { 
            onClick: onClose, 
            className: 'text-2xl text-gray-400 hover:text-gray-600'
          }, '×')
        ),

        React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }},
          React.createElement('div', { className: 'flex flex-col gap-4' },
            React.createElement('div', null,
              React.createElement('p', { className: 'text-sm font-medium text-gray-600 mb-1' }, 'Date of Reimbursement'),
              React.createElement('p', { className: 'text-gray-800' }, new Date(transaction.dateOfReimbursement).toLocaleDateString())
            ),
            React.createElement('div', null,
              React.createElement('p', { className: 'text-sm font-medium text-gray-600 mb-1' }, 'Beneficiary'),
              React.createElement('p', { className: 'text-gray-800' }, transaction.beneficiary)
            ),
            React.createElement('div', null,
              React.createElement('p', { className: 'text-sm font-medium text-gray-600 mb-1' }, 'Item Description'),
              React.createElement('p', { className: 'text-gray-800' }, transaction.itemDescription)
            ),
            React.createElement('div', null,
              React.createElement('p', { className: 'text-sm font-medium text-gray-600 mb-1' }, 'Invoice Number'),
              React.createElement('p', { className: 'text-gray-800' }, transaction.invoiceNumber)
            )
          ),

          React.createElement('div', { className: 'flex flex-col gap-4' },
            React.createElement('div', null,
              React.createElement('p', { className: 'text-sm font-medium text-gray-600 mb-1' }, 'Date of Purchase'),
              React.createElement('p', { className: 'text-gray-800' }, new Date(transaction.dateOfPurchase).toLocaleDateString())
            ),
            React.createElement('div', null,
              React.createElement('p', { className: 'text-sm font-medium text-gray-600 mb-1' }, 'Amount'),
              React.createElement('p', { className: 'text-gray-800 text-xl font-semibold' }, `$${transaction.amount.toFixed(2)}`)
            ),
            transaction.flightNumber && React.createElement('div', null,
              React.createElement('p', { className: 'text-sm font-medium text-gray-600 mb-1' }, 'Flight Number'),
              React.createElement('p', { className: 'text-gray-800' }, transaction.flightNumber)
            ),
            transaction.numberOfLuggage && React.createElement('div', null,
              React.createElement('p', { className: 'text-sm font-medium text-gray-600 mb-1' }, 'Number of Luggage'),
              React.createElement('p', { className: 'text-gray-800' }, transaction.numberOfLuggage)
            )
          )
        ),

        transaction.observations && React.createElement('div', { 
          className: 'mt-6 pt-6',
          style: { borderTop: '1px solid #e5e7eb' }
        },
          React.createElement('p', { className: 'text-sm font-medium text-gray-600 mb-2' }, 'Observations'),
          React.createElement('p', { className: 'text-gray-800 bg-gray-50 p-3 rounded-md' }, transaction.observations)
        ),

        React.createElement('div', { className: 'mt-8 flex justify-end' },
          React.createElement('button', { 
            onClick: onClose, 
            className: 'btn btn-primary px-6'
          }, 'Close')
        )
      )
    )
  );
}