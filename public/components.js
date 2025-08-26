// React hooks are available globally from app.js

// Professional Auth Form Component
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
    
    if (!navigator.onLine) {
      setError('This app requires an internet connection to sign in.');
      setLoading(false);
      return;
    }
    
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
        React.createElement('h1', { className: 'modal-title mb-2' }, 'Expense Tracker'),
        React.createElement('p', { className: 'text-gray-600' }, 
          isLogin ? 'Sign in to your account' : 'Create a new account'
        )
      ),
      
      React.createElement('form', { onSubmit: handleSubmit },
        React.createElement('div', { className: 'form-group' },
          React.createElement('label', { className: 'form-label flex items-center' },
            React.createElement(User, { className: 'icon mr-2' }),
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
        
        React.createElement('div', { className: 'form-group' },
          React.createElement('label', { className: 'form-label' }, 'Password'),
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
          className: 'error-message',
          style: { margin: '1rem 0' }
        }, error),
        
        React.createElement('button', {
          type: 'submit',
          disabled: loading,
          className: `btn btn-primary btn-lg w-full ${loading ? 'btn-disabled' : ''}`,
          style: { marginBottom: '1rem' }
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

// Professional Transaction Form Component  
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
    React.createElement('div', { className: 'modal-content' },
      React.createElement('div', { className: 'modal-header' },
        React.createElement('h2', { className: 'modal-title' }, 'New Transaction'),
        React.createElement('button', { 
          type: 'button', 
          onClick: onCancel, 
          className: 'btn btn-secondary'
        }, '×')
      ),
      React.createElement('form', { onSubmit: handleSubmit },
        React.createElement('div', { className: 'modal-body' },
          React.createElement('div', { className: 'flex flex-col gap-4' },
            React.createElement('div', { className: 'form-group' },
              React.createElement('label', { className: 'form-label' }, 'Date of Reimbursement'),
              React.createElement('input', { 
                type: 'date', 
                value: formData.dateOfReimbursement, 
                onChange: (e) => setFormData(prev => ({...prev, dateOfReimbursement: e.target.value})), 
                className: 'form-input',
                required: true 
              })
            ),
            
            React.createElement('div', { className: 'form-group' },
              React.createElement('label', { className: 'form-label' }, 'Beneficiary'),
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
            
            React.createElement('div', { className: 'form-group' },
              React.createElement('label', { className: 'form-label' }, 'Item Description'),
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
            
            React.createElement('div', { className: 'form-group' },
              React.createElement('label', { className: 'form-label' }, 'Invoice Number'),
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
            
            React.createElement('div', { className: 'form-group' },
              React.createElement('label', { className: 'form-label' }, 'Date of Purchase'),
              React.createElement('input', { 
                type: 'date', 
                value: formData.dateOfPurchase, 
                onChange: (e) => setFormData(prev => ({...prev, dateOfPurchase: e.target.value})), 
                className: 'form-input',
                required: true 
              })
            ),
            
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
                  value: formData.amount, 
                  onChange: (e) => setFormData(prev => ({...prev, amount: e.target.value})), 
                  className: 'form-input',
                  placeholder: '0.00',
                  required: true,
                  style: { paddingLeft: '2.5rem' }
                })
              )
            ),

            isSkyCapSelected && [
              React.createElement('div', { key: 'flight', className: 'form-group' },
                React.createElement('label', { className: 'form-label' }, 'Flight Number'),
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
              React.createElement('div', { key: 'luggage', className: 'form-group' },
                React.createElement('label', { className: 'form-label' }, 'Number of Luggage'),
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
            
            React.createElement('div', { className: 'form-group' },
              React.createElement('label', { className: 'form-label' }, 'Observations (Optional)'),
              React.createElement('textarea', { 
                value: formData.observations, 
                onChange: (e) => setFormData(prev => ({...prev, observations: e.target.value})), 
                className: 'form-textarea',
                placeholder: 'Additional notes or observations',
                maxLength: 500
              })
            )
          ),

          React.createElement('div', { className: 'flex gap-3', style: { marginTop: '1.5rem' } },
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
    )
  );
}

// Professional Transaction Details Component
function TransactionDetails({ transaction, onClose }) {
  if (!transaction) return null;

  return React.createElement('div', { className: 'modal-overlay' },
    React.createElement('div', { className: 'modal-content' },
      React.createElement('div', { className: 'modal-header' },
        React.createElement('h2', { className: 'modal-title' }, 'Transaction Details'),
        React.createElement('button', { 
          onClick: onClose, 
          className: 'btn btn-secondary'
        }, '×')
      ),
      React.createElement('div', { className: 'modal-body' },
        React.createElement('div', { 
          className: 'flex flex-col gap-4',
          style: { 
            display: 'grid', 
            gridTemplateColumns: window.innerWidth > 640 ? '1fr 1fr' : '1fr', 
            gap: '1.5rem' 
          }
        },
          React.createElement('div', { className: 'flex flex-col gap-4' },
            React.createElement('div', null,
              React.createElement('label', { className: 'form-label' }, 'Date of Reimbursement'),
              React.createElement('div', { 
                className: 'text-gray-700',
                style: { 
                  padding: '0.75rem 1rem',
                  background: '#f8f9fa',
                  borderRadius: '8px',
                  border: '1px solid rgba(0,0,0,0.05)'
                }
              }, new Date(transaction.dateOfReimbursement).toLocaleDateString())
            ),
            React.createElement('div', null,
              React.createElement('label', { className: 'form-label' }, 'Beneficiary'),
              React.createElement('div', { 
                className: 'text-gray-700',
                style: { 
                  padding: '0.75rem 1rem',
                  background: '#f8f9fa',
                  borderRadius: '8px',
                  border: '1px solid rgba(0,0,0,0.05)'
                }
              }, transaction.beneficiary)
            ),
            React.createElement('div', null,
              React.createElement('label', { className: 'form-label' }, 'Item Description'),
              React.createElement('div', { 
                className: 'text-gray-700',
                style: { 
                  padding: '0.75rem 1rem',
                  background: '#f8f9fa',
                  borderRadius: '8px',
                  border: '1px solid rgba(0,0,0,0.05)'
                }
              }, transaction.itemDescription)
            ),
            React.createElement('div', null,
              React.createElement('label', { className: 'form-label' }, 'Invoice Number'),
              React.createElement('div', { 
                className: 'text-gray-700',
                style: { 
                  padding: '0.75rem 1rem',
                  background: '#f8f9fa',
                  borderRadius: '8px',
                  border: '1px solid rgba(0,0,0,0.05)'
                }
              }, transaction.invoiceNumber)
            )
          ),

          React.createElement('div', { className: 'flex flex-col gap-4' },
            React.createElement('div', null,
              React.createElement('label', { className: 'form-label' }, 'Date of Purchase'),
              React.createElement('div', { 
                className: 'text-gray-700',
                style: { 
                  padding: '0.75rem 1rem',
                  background: '#f8f9fa',
                  borderRadius: '8px',
                  border: '1px solid rgba(0,0,0,0.05)'
                }
              }, new Date(transaction.dateOfPurchase).toLocaleDateString())
            ),
            React.createElement('div', null,
              React.createElement('label', { className: 'form-label' }, 'Amount'),
              React.createElement('div', { 
                className: 'text-gray-700 font-bold',
                style: { 
                  fontSize: '1.5rem',
                  padding: '0.75rem 1rem',
                  background: '#f0f9ff',
                  borderRadius: '8px',
                  border: '1px solid rgba(0,122,255,0.1)',
                  color: '#007AFF'
                }
              }, `$${transaction.amount.toFixed(2)}`)
            ),
            transaction.flightNumber && React.createElement('div', null,
              React.createElement('label', { className: 'form-label' }, 'Flight Number'),
              React.createElement('div', { 
                className: 'text-gray-700',
                style: { 
                  padding: '0.75rem 1rem',
                  background: '#f8f9fa',
                  borderRadius: '8px',
                  border: '1px solid rgba(0,0,0,0.05)'
                }
              }, transaction.flightNumber)
            ),
            transaction.numberOfLuggage && React.createElement('div', null,
              React.createElement('label', { className: 'form-label' }, 'Number of Luggage'),
              React.createElement('div', { 
                className: 'text-gray-700',
                style: { 
                  padding: '0.75rem 1rem',
                  background: '#f8f9fa',
                  borderRadius: '8px',
                  border: '1px solid rgba(0,0,0,0.05)'
                }
              }, transaction.numberOfLuggage)
            )
          )
        ),

        transaction.observations && React.createElement('div', { 
          className: 'form-group',
          style: { 
            marginTop: '1.5rem',
            paddingTop: '1.5rem',
            borderTop: '1px solid rgba(0,0,0,0.05)' 
          }
        },
          React.createElement('label', { className: 'form-label' }, 'Observations'),
          React.createElement('div', { 
            className: 'text-gray-700',
            style: { 
              backgroundColor: '#f8f9fa', 
              padding: '1rem', 
              borderRadius: '8px',
              border: '1px solid rgba(0,0,0,0.05)',
              lineHeight: '1.6'
            }
          }, transaction.observations)
        ),

        React.createElement('div', { 
          className: 'flex justify-end',
          style: { marginTop: '2rem' }
        },
          React.createElement('button', { 
            onClick: onClose, 
            className: 'btn btn-primary'
          }, 'Close')
        )
      )
    )
  );
}