// Professional Utility Functions
const LocalStorageManager = {
  getOptions: (key) => {
    try {
      return JSON.parse(localStorage.getItem(`autocomplete_${key}`) || '[]');
    } catch {
      return [];
    }
  },
  
  saveOption: (key, value) => {
    if (!value || !value.trim()) return;
    const capitalized = value.trim().replace(/\b\w/g, l => l.toUpperCase());
    const options = LocalStorageManager.getOptions(key);
    if (!options.includes(capitalized)) {
      options.unshift(capitalized);
      localStorage.setItem(`autocomplete_${key}`, JSON.stringify(options.slice(0, 50)));
    }
  },
  
  initializeDefaults: (key, defaults = []) => {
    const existing = LocalStorageManager.getOptions(key);
    if (existing.length === 0 && defaults.length > 0) {
      localStorage.setItem(`autocomplete_${key}`, JSON.stringify(defaults));
    }
  },
  
  deleteOption: (key, value) => {
    const options = LocalStorageManager.getOptions(key);
    const filtered = options.filter(option => option !== value);
    localStorage.setItem(`autocomplete_${key}`, JSON.stringify(filtered));
  }
};

// Form Validation
const validateForm = (data, requiredFields) => {
  const errors = {};
  
  requiredFields.forEach(field => {
    if (!data[field] || !data[field].toString().trim()) {
      errors[field] = 'This field is required';
    }
  });
  
  if (data.amount && (isNaN(parseFloat(data.amount)) || parseFloat(data.amount) <= 0)) {
    errors.amount = 'Amount must be greater than 0';
  }
  
  if (data.email && !/\S+@\S+\.\S+/.test(data.email)) {
    errors.email = 'Invalid email address';
  }
  
  return errors;
};

// Professional Autocomplete Component
function AutocompleteInput({ 
  value, 
  onChange, 
  storageKey, 
  placeholder, 
  required, 
  type = 'text',
  step,
  min,
  className = 'form-input',
  error,
  defaults = []
}) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredOptions, setFilteredOptions] = useState([]);
  
  useEffect(() => {
    if (storageKey) {
      if (defaults.length > 0) {
        LocalStorageManager.initializeDefaults(storageKey, defaults);
      }
      
      const options = LocalStorageManager.getOptions(storageKey);
      if (value && value.length > 0) {
        const filtered = options.filter(option => 
          option.toLowerCase().includes(value.toLowerCase())
        );
        setFilteredOptions(filtered);
      } else {
        setFilteredOptions(options);
      }
    }
  }, [value, storageKey, defaults]);

  const handleInputChange = (e) => {
    onChange(e.target.value);
  };

  const handleOptionSelect = (option) => {
    onChange(option);
    setShowDropdown(false);
  };

  const handleDeleteOption = (option, e) => {
    e.stopPropagation();
    LocalStorageManager.deleteOption(storageKey, option);
    const options = LocalStorageManager.getOptions(storageKey);
    const filtered = options.filter(opt => 
      opt.toLowerCase().includes(value.toLowerCase())
    );
    setFilteredOptions(filtered);
  };

  const handleBlur = () => {
    setTimeout(() => setShowDropdown(false), 200);
    if (storageKey && value) {
      LocalStorageManager.saveOption(storageKey, value);
    }
  };

  return React.createElement('div', { className: 'autocomplete-container' },
    React.createElement('input', {
      type,
      value,
      onChange: handleInputChange,
      onFocus: () => setShowDropdown(filteredOptions.length > 0),
      onBlur: handleBlur,
      required,
      className: `${className} ${error ? 'error' : ''}`,
      placeholder,
      step,
      min
    }),
    error && React.createElement('div', { className: 'form-error' },
      React.createElement('span', { className: 'icon icon-error' }),
      error
    ),
    showDropdown && React.createElement('div', { className: 'autocomplete-dropdown' },
      filteredOptions.map((option, index) => 
        React.createElement('div', {
          key: index,
          className: 'autocomplete-item',
          onClick: () => handleOptionSelect(option)
        },
          React.createElement('span', null, option),
          React.createElement('span', {
            className: 'delete-option',
            onClick: (e) => handleDeleteOption(option, e)
          }, '×')
        )
      )
    )
  );
}

// Updated Authentication Form (no registration)
function AuthForm({ onAuth }) {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const requiredFields = ['username', 'password'];
    const validationErrors = validateForm(formData, requiredFields);
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    setLoading(true);
    setErrors({});

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      onAuth(data);
    } catch (err) {
      setErrors({ general: err.message });
    }
    
    setLoading(false);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return React.createElement('div', { 
    className: 'app',
    style: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }
  },
    React.createElement('div', { 
      style: { 
        background: 'white', 
        borderRadius: '8px',
        boxShadow: '0 20px 25px rgba(0, 0, 0, 0.3)',
        padding: '32px', 
        width: '400px',
        maxWidth: '90vw'
      }
    },
      React.createElement('h2', { 
        style: { 
          marginBottom: '24px', 
          textAlign: 'center', 
          fontSize: '20px', 
          fontWeight: '600',
          color: '#111827'
        } 
      }, 'Login to Expense Tracker'),
      
      React.createElement('div', {
        style: {
          background: '#fef3c7',
          border: '1px solid #f59e0b',
          borderRadius: '4px',
          padding: '12px',
          marginBottom: '20px',
          fontSize: '14px',
          color: '#92400e'
        }
      }, '⚠️ Registration is disabled. Contact an administrator for account access.'),
      
      errors.general && React.createElement('div', { className: 'form-error', style: { marginBottom: '16px' } },
        React.createElement('span', { className: 'icon icon-error' }),
        errors.general
      ),
      
      React.createElement('form', { onSubmit: handleSubmit },
        React.createElement('div', { className: 'form-group' },
          React.createElement('label', { className: 'form-label' }, 'Username'),
          React.createElement('input', {
            type: 'text',
            value: formData.username,
            onChange: (e) => handleChange('username', e.target.value),
            required: true,
            className: `form-input ${errors.username ? 'error' : ''}`,
            placeholder: 'Your username'
          }),
          errors.username && React.createElement('div', { className: 'form-error' },
            React.createElement('span', { className: 'icon icon-error' }),
            errors.username
          )
        ),
        
        React.createElement('div', { className: 'form-group' },
          React.createElement('label', { className: 'form-label' }, 'Password'),
          React.createElement('input', {
            type: 'password',
            value: formData.password,
            onChange: (e) => handleChange('password', e.target.value),
            required: true,
            className: `form-input ${errors.password ? 'error' : ''}`,
            placeholder: 'Your password'
          }),
          errors.password && React.createElement('div', { className: 'form-error' },
            React.createElement('span', { className: 'icon icon-error' }),
            errors.password
          )
        ),
        
        React.createElement('button', {
          type: 'submit',
          disabled: loading,
          className: 'btn btn-primary',
          style: { width: '100%', marginBottom: '16px' }
        }, loading ? 'Signing in...' : 'Sign In')
      )
    )
  );
}

// Add Funds Modal
function AddFundsModal({ fundsAmount, setFundsAmount, onAdd, onCancel }) {
  return React.createElement('div', { className: 'modal-overlay' },
    React.createElement('div', { className: 'modal' },
      React.createElement('div', { className: 'modal-header' },
        React.createElement('h3', null, 'Add Funds'),
        React.createElement('button', { onClick: onCancel }, '×')
      ),
      React.createElement('div', { className: 'modal-body' },
        React.createElement('div', { className: 'form-group' },
          React.createElement('label', { className: 'form-label' }, 'Amount'),
          React.createElement('input', {
            type: 'number',
            step: '0.01',
            value: fundsAmount,
            onChange: (e) => setFundsAmount(e.target.value),
            className: 'form-input',
            placeholder: '0.00',
            autoFocus: true
          })
        )
      ),
      React.createElement('div', { className: 'modal-footer' },
        React.createElement('button', {
          onClick: onCancel,
          className: 'btn'
        }, 'Cancel'),
        React.createElement('button', {
          onClick: onAdd,
          className: 'btn btn-primary'
        }, 'Add Funds')
      )
    )
  );
}

// BD Number Modal
function BDNumberModal({ bdNumber, setBdNumber, onConfirm, onCancel }) {
  return React.createElement('div', { className: 'modal-overlay' },
    React.createElement('div', { className: 'modal' },
      React.createElement('div', { className: 'modal-header' },
        React.createElement('h3', null, 'Enter BD Number'),
        React.createElement('button', { onClick: onCancel }, '×')
      ),
      React.createElement('div', { className: 'modal-body' },
        React.createElement('div', { className: 'form-group' },
          React.createElement('label', { className: 'form-label' }, 'BD Number'),
          React.createElement('input', {
            type: 'text',
            value: bdNumber,
            onChange: (e) => setBdNumber(e.target.value),
            className: 'form-input',
            placeholder: 'BD-2025-001',
            autoFocus: true
          })
        )
      ),
      React.createElement('div', { className: 'modal-footer' },
        React.createElement('button', {
          onClick: onCancel,
          className: 'btn'
        }, 'Cancel'),
        React.createElement('button', {
          onClick: onConfirm,
          className: 'btn btn-primary'
        }, 'Confirm')
      )
    )
  );
}

// Transaction Edit Modal
function TransactionEditModal({ transaction, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    dateOfReimbursement: transaction.dateOfReimbursement?.split('T')[0] || new Date().toISOString().split('T')[0],
    beneficiary: transaction.beneficiary || '',
    itemDescription: transaction.itemDescription || '',
    invoiceNumber: transaction.invoiceNumber || '',
    dateOfPurchase: transaction.dateOfPurchase?.split('T')[0] || '',
    amount: transaction.amount?.toString() || '',
    observations: transaction.observations || '',
    flightNumber: transaction.flightNumber || '',
    numberOfLuggage: transaction.numberOfLuggage?.toString() || ''
  });

  const [errors, setErrors] = useState({});
  const [showFlightFields, setShowFlightFields] = useState(false);

  useEffect(() => {
    setShowFlightFields(formData.itemDescription.toLowerCase().includes('sky cap'));
  }, [formData.itemDescription]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Only validate if it's not a fund addition
    if (transaction.type !== 'fund_addition') {
      const requiredFields = ['beneficiary', 'itemDescription', 'invoiceNumber', 'dateOfPurchase', 'amount'];
      const validationErrors = validateForm(formData, requiredFields);
      
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        return;
      }
    }

    const updates = {};
    Object.keys(formData).forEach(key => {
      const value = formData[key];
      if (value !== undefined && value !== null && value !== '') {
        if (key === 'amount') {
          updates[key] = parseFloat(value);
        } else {
          updates[key] = value;
        }
      }
    });
    
    onSave(updates);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const isFundAddition = transaction.type === 'fund_addition';

  return React.createElement('div', { className: 'modal-overlay' },
    React.createElement('div', { className: 'modal modal-large' },
      React.createElement('div', { className: 'modal-header' },
        React.createElement('h3', null, 
          React.createElement('span', { className: 'icon icon-edit' }),
          isFundAddition ? 'Edit Fund Addition' : 'Edit Transaction'
        ),
        React.createElement('button', { onClick: onCancel }, '×')
      ),
      React.createElement('form', { onSubmit: handleSubmit },
        React.createElement('div', { className: 'modal-body' },
          React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' } },
            
            React.createElement('div', { className: 'form-group' },
              React.createElement('label', { className: 'form-label' }, 'Date'),
              React.createElement('input', {
                type: 'date',
                value: formData.dateOfReimbursement,
                onChange: (e) => handleChange('dateOfReimbursement', e.target.value),
                className: 'form-input'
              })
            ),
            
            !isFundAddition && React.createElement('div', { className: 'form-group' },
              React.createElement('label', { className: 'form-label' }, 'Beneficiary *'),
              React.createElement(AutocompleteInput, {
                value: formData.beneficiary,
                onChange: (value) => handleChange('beneficiary', value),
                storageKey: 'beneficiaries',
                placeholder: 'Beneficiary name',
                required: true,
                error: errors.beneficiary
              })
            ),
            
            React.createElement('div', { className: 'form-group' },
              React.createElement('label', { className: 'form-label' }, isFundAddition ? 'Description' : 'Item Description *'),
              React.createElement(AutocompleteInput, {
                value: formData.itemDescription,
                onChange: (value) => handleChange('itemDescription', value),
                storageKey: 'itemDescriptions',
                placeholder: 'Item description',
                required: !isFundAddition,
                error: errors.itemDescription,
                defaults: ['Sky Cap']
              })
            ),
            
            !isFundAddition && React.createElement('div', { className: 'form-group' },
              React.createElement('label', { className: 'form-label' }, 'Invoice Number *'),
              React.createElement(AutocompleteInput, {
                value: formData.invoiceNumber,
                onChange: (value) => handleChange('invoiceNumber', value),
                storageKey: 'invoiceNumbers',
                placeholder: 'Invoice number',
                required: true,
                error: errors.invoiceNumber
              })
            ),
            
            !isFundAddition && React.createElement('div', { className: 'form-group' },
              React.createElement('label', { className: 'form-label' }, 'Purchase Date *'),
              React.createElement('input', {
                type: 'date',
                value: formData.dateOfPurchase,
                onChange: (e) => handleChange('dateOfPurchase', e.target.value),
                required: true,
                className: `form-input ${errors.dateOfPurchase ? 'error' : ''}`
              }),
              errors.dateOfPurchase && React.createElement('div', { className: 'form-error' },
                React.createElement('span', { className: 'icon icon-error' }),
                errors.dateOfPurchase
              )
            ),
            
            React.createElement('div', { className: 'form-group' },
              React.createElement('label', { className: 'form-label' }, 'Amount ($) *'),
              React.createElement('input', {
                type: 'number',
                step: '0.01',
                min: '0.01',
                value: formData.amount,
                onChange: (e) => handleChange('amount', e.target.value),
                required: true,
                className: `form-input ${errors.amount ? 'error' : ''}`,
                placeholder: '0.00'
              }),
              errors.amount && React.createElement('div', { className: 'form-error' },
                React.createElement('span', { className: 'icon icon-error' }),
                errors.amount
              )
            )
          ),
          
          React.createElement('div', { className: 'form-group' },
            React.createElement('label', { className: 'form-label' }, 'Observations'),
            React.createElement(AutocompleteInput, {
              value: formData.observations,
              onChange: (value) => handleChange('observations', value),
              storageKey: 'observations',
              placeholder: 'Observations (optional)'
            })
          ),
          
          showFlightFields && !isFundAddition && React.createElement('div', { 
            className: 'flight-fields'
          },
            React.createElement('h4', null,
              React.createElement('span', { className: 'icon icon-flight' }),
              'Flight Information'
            ),
            
            React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' } },
              React.createElement('div', { className: 'form-group', style: { marginBottom: '0' } },
                React.createElement('label', { className: 'form-label' }, 'Flight Number'),
                React.createElement(AutocompleteInput, {
                  value: formData.flightNumber,
                  onChange: (value) => handleChange('flightNumber', value),
                  storageKey: 'flightNumbers',
                  placeholder: 'AT200, AT201...'
                })
              ),
              
              React.createElement('div', { className: 'form-group', style: { marginBottom: '0' } },
                React.createElement('label', { className: 'form-label' }, 'Number of Luggage'),
                React.createElement('input', {
                  type: 'number',
                  min: '1',
                  max: '10',
                  value: formData.numberOfLuggage,
                  onChange: (e) => handleChange('numberOfLuggage', e.target.value),
                  className: 'form-input',
                  placeholder: '1, 2, 3...'
                })
              )
            )
          )
        ),
        
        React.createElement('div', { className: 'modal-footer' },
          React.createElement('button', { 
            type: 'button', 
            onClick: onCancel, 
            className: 'btn' 
          }, 
            React.createElement('span', { className: 'icon icon-cancel' }),
            'Cancel'
          ),
          React.createElement('button', { 
            type: 'submit', 
            className: 'btn btn-primary' 
          }, 
            React.createElement('span', { className: 'icon icon-check' }),
            'Save Changes'
          )
        )
      )
    )
  );
}

// Professional Transaction Form
function TransactionForm({ onSubmit, onCancel }) {
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

  const [errors, setErrors] = useState({});
  const [showFlightFields, setShowFlightFields] = useState(false);

  useEffect(() => {
    setShowFlightFields(formData.itemDescription.toLowerCase().includes('sky cap'));
  }, [formData.itemDescription]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const requiredFields = ['beneficiary', 'itemDescription', 'invoiceNumber', 'dateOfPurchase', 'amount'];
    const validationErrors = validateForm(formData, requiredFields);
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    const cleanedData = {};
    Object.keys(formData).forEach(key => {
      const value = formData[key];
      if (value && value.toString().trim() !== '') {
        cleanedData[key] = value;
      }
    });
    
    cleanedData.dateOfReimbursement = formData.dateOfReimbursement;
    cleanedData.beneficiary = formData.beneficiary.trim();
    cleanedData.itemDescription = formData.itemDescription.trim();
    cleanedData.invoiceNumber = formData.invoiceNumber.trim();
    cleanedData.dateOfPurchase = formData.dateOfPurchase;
    cleanedData.amount = parseFloat(formData.amount);
    
    onSubmit(cleanedData);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return React.createElement('div', { className: 'modal-overlay' },
    React.createElement('div', { className: 'modal modal-large' },
      React.createElement('div', { className: 'modal-header' },
        React.createElement('h3', null, 
          React.createElement('span', { className: 'icon icon-document' }),
          'New Transaction'
        ),
        React.createElement('button', { onClick: onCancel }, '×')
      ),
      React.createElement('form', { onSubmit: handleSubmit },
        React.createElement('div', { className: 'modal-body' },
          React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' } },
            
            React.createElement('div', { className: 'form-group' },
              React.createElement('label', { className: 'form-label' }, 'Reimbursement Date *'),
              React.createElement('input', {
                type: 'date',
                value: formData.dateOfReimbursement,
                onChange: (e) => handleChange('dateOfReimbursement', e.target.value),
                required: true,
                className: 'form-input'
              })
            ),
            
            React.createElement('div', { className: 'form-group' },
              React.createElement('label', { className: 'form-label' }, 'Beneficiary *'),
              React.createElement(AutocompleteInput, {
                value: formData.beneficiary,
                onChange: (value) => handleChange('beneficiary', value),
                storageKey: 'beneficiaries',
                placeholder: 'Beneficiary name',
                required: true,
                error: errors.beneficiary
              })
            ),
            
            React.createElement('div', { className: 'form-group' },
              React.createElement('label', { className: 'form-label' }, 'Item Description *'),
              React.createElement(AutocompleteInput, {
                value: formData.itemDescription,
                onChange: (value) => handleChange('itemDescription', value),
                storageKey: 'itemDescriptions',
                placeholder: 'Item description',
                required: true,
                error: errors.itemDescription,
                defaults: ['Sky Cap']
              })
            ),
            
            React.createElement('div', { className: 'form-group' },
              React.createElement('label', { className: 'form-label' }, 'Invoice Number *'),
              React.createElement(AutocompleteInput, {
                value: formData.invoiceNumber,
                onChange: (value) => handleChange('invoiceNumber', value),
                storageKey: 'invoiceNumbers',
                placeholder: 'Invoice number',
                required: true,
                error: errors.invoiceNumber
              })
            ),
            
            React.createElement('div', { className: 'form-group' },
              React.createElement('label', { className: 'form-label' }, 'Purchase Date *'),
              React.createElement('input', {
                type: 'date',
                value: formData.dateOfPurchase,
                onChange: (e) => handleChange('dateOfPurchase', e.target.value),
                required: true,
                className: `form-input ${errors.dateOfPurchase ? 'error' : ''}`
              }),
              errors.dateOfPurchase && React.createElement('div', { className: 'form-error' },
                React.createElement('span', { className: 'icon icon-error' }),
                errors.dateOfPurchase
              )
            ),
            
            React.createElement('div', { className: 'form-group' },
              React.createElement('label', { className: 'form-label' }, 'Amount ($) *'),
              React.createElement('input', {
                type: 'number',
                step: '0.01',
                min: '0.01',
                value: formData.amount,
                onChange: (e) => handleChange('amount', e.target.value),
                required: true,
                className: `form-input ${errors.amount ? 'error' : ''}`,
                placeholder: '0.00'
              }),
              errors.amount && React.createElement('div', { className: 'form-error' },
                React.createElement('span', { className: 'icon icon-error' }),
                errors.amount
              )
            )
          ),
          
          React.createElement('div', { className: 'form-group' },
            React.createElement('label', { className: 'form-label' }, 'Observations'),
            React.createElement(AutocompleteInput, {
              value: formData.observations,
              onChange: (value) => handleChange('observations', value),
              storageKey: 'observations',
              placeholder: 'Observations (optional)'
            })
          ),
          
          showFlightFields && React.createElement('div', { 
            className: 'flight-fields'
          },
            React.createElement('h4', null,
              React.createElement('span', { className: 'icon icon-flight' }),
              'Flight Information'
            ),
            
            React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' } },
              React.createElement('div', { className: 'form-group', style: { marginBottom: '0' } },
                React.createElement('label', { className: 'form-label' }, 'Flight Number'),
                React.createElement(AutocompleteInput, {
                  value: formData.flightNumber,
                  onChange: (value) => handleChange('flightNumber', value),
                  storageKey: 'flightNumbers',
                  placeholder: 'AT200, AT201...'
                })
              ),
              
              React.createElement('div', { className: 'form-group', style: { marginBottom: '0' } },
                React.createElement('label', { className: 'form-label' }, 'Number of Luggage'),
                React.createElement('input', {
                  type: 'number',
                  min: '1',
                  max: '10',
                  value: formData.numberOfLuggage,
                  onChange: (e) => handleChange('numberOfLuggage', e.target.value),
                  className: 'form-input',
                  placeholder: '1, 2, 3...'
                })
              )
            )
          )
        ),
        
        React.createElement('div', { className: 'modal-footer' },
          React.createElement('button', { 
            type: 'button', 
            onClick: onCancel, 
            className: 'btn' 
          }, 
            React.createElement('span', { className: 'icon icon-cancel' }),
            'Cancel'
          ),
          React.createElement('button', { 
            type: 'submit', 
            className: 'btn btn-primary' 
          }, 
            React.createElement('span', { className: 'icon icon-check' }),
            'Add'
          )
        )
      )
    )
  );
}

// Professional Transaction Details Modal
function TransactionDetails({ transaction, onClose, editMode, onEdit }) {
  const isPositiveTransaction = transaction.type === 'fund_addition';
  
  return React.createElement('div', { className: 'modal-overlay' },
    React.createElement('div', { className: 'modal' },
      React.createElement('div', { className: 'modal-header' },
        React.createElement('h3', null, 
          React.createElement('span', { className: 'icon icon-info' }),
          isPositiveTransaction ? 'Fund Addition Details' : 'Transaction Details'
        ),
        React.createElement('button', { onClick: onClose }, '×')
      ),
      React.createElement('div', { className: 'modal-body' },
        React.createElement('div', { style: { display: 'grid', gap: '16px' } },
          React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' } },
            React.createElement('div', { className: 'detail-card' },
              React.createElement('div', { className: 'detail-label' }, 'Reimbursement Date'),
              React.createElement('div', { className: 'detail-value' },
                new Date(transaction.dateOfReimbursement).toLocaleDateString('en-US')
              )
            ),
            React.createElement('div', { className: 'detail-card' },
              React.createElement('div', { className: 'detail-label' }, 'Beneficiary'),
              React.createElement('div', { className: 'detail-value' },
                transaction.beneficiary || '-'
              )
            ),
            React.createElement('div', { className: 'detail-card' },
              React.createElement('div', { className: 'detail-label' }, 'Article'),
              React.createElement('div', { className: 'detail-value' },
                transaction.itemDescription
              )
            ),
            React.createElement('div', { className: 'detail-card' },
              React.createElement('div', { className: 'detail-label' }, 'Invoice'),
              React.createElement('div', { className: 'detail-value' },
                transaction.invoiceNumber || '-'
              )
            ),
            React.createElement('div', { className: 'detail-card' },
              React.createElement('div', { className: 'detail-label' }, 'Purchase Date'),
              React.createElement('div', { className: 'detail-value' },
                transaction.dateOfPurchase ? new Date(transaction.dateOfPurchase).toLocaleDateString('en-US') : '-'
              )
            ),
            React.createElement('div', { 
              className: 'detail-card',
              style: { 
                background: isPositiveTransaction ? '#f0fdf4' : '#fef2f2',
                borderColor: isPositiveTransaction ? '#bbf7d0' : '#fecaca'
              }
            },
              React.createElement('div', { className: 'detail-label' }, 'Amount'),
              React.createElement('div', { 
                className: `detail-amount ${isPositiveTransaction ? 'positive' : 'negative'}`
              },
                `${isPositiveTransaction ? '+' : '-'}$${transaction.amount.toFixed(2)}`
              )
            )
          ),
          
          transaction.observations && React.createElement('div', { 
            className: 'detail-card',
            style: { background: '#fffbeb', borderColor: '#fed7aa' }
          },
            React.createElement('div', { className: 'detail-label' }, 'Observations'),
            React.createElement('div', { className: 'detail-value' },
              transaction.observations
            )
          ),
          
          (transaction.flightNumber || transaction.numberOfLuggage) && React.createElement('div', { 
            className: 'detail-card',
            style: { background: '#f0f9ff', borderColor: '#bae6fd' }
          },
            React.createElement('div', { className: 'detail-label' }, 'Flight Information'),
            React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px', marginTop: '8px' } },
              transaction.flightNumber && React.createElement('div', null,
                React.createElement('div', { style: { fontSize: '11px', color: '#6b7280', textTransform: 'uppercase' } }, 'Flight'),
                React.createElement('div', { className: 'detail-value' }, transaction.flightNumber)
              ),
              transaction.numberOfLuggage && React.createElement('div', null,
                React.createElement('div', { style: { fontSize: '11px', color: '#6b7280', textTransform: 'uppercase' } }, 'Luggage'),
                React.createElement('div', { className: 'detail-value' }, transaction.numberOfLuggage)
              )
            )
          ),
          
          transaction.bdNumber && React.createElement('div', { 
            className: 'detail-card',
            style: { background: '#fdf4ff', borderColor: '#e9d5ff' }
          },
            React.createElement('div', { className: 'detail-label' }, 'BD Number'),
            React.createElement('div', { className: 'detail-value', style: { color: '#7c3aed', fontWeight: '600' } },
              transaction.bdNumber
            )
          )
        )
      ),
      React.createElement('div', { className: 'modal-footer' },
        editMode && React.createElement('button', { 
          onClick: onEdit, 
          className: 'btn btn-secondary' 
        }, 
          React.createElement('span', { className: 'icon icon-edit' }),
          'Edit'
        ),
        React.createElement('button', { 
          onClick: onClose, 
          className: 'btn btn-primary' 
        }, 
          React.createElement('span', { className: 'icon icon-check' }),
          'Close'
        )
      )
    )
  );
}

// Admin Panel Component
function AdminPanel({ onClose }) {
  const [users, setUsers] = useState([]);
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUserData, setNewUserData] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Request users list from WebSocket
    window.wsManager?.emit('admin_get_users');
    
    // Listen for users list
    const handleUsersList = (data) => {
      setUsers(data.users);
      setLoading(false);
    };

    if (window.wsManager) {
      window.wsManager.on('users_list', handleUsersList);
    }

    return () => {
      // Note: In a real implementation, you'd want to remove specific listeners
    };
  }, []);

  const handleCreateUser = () => {
    if (!newUserData.username.trim() || !newUserData.password.trim()) {
      alert('Please enter both username and password');
      return;
    }

    if (window.wsManager) {
      window.wsManager.emit('admin_create_user', newUserData);
      setNewUserData({ username: '', password: '' });
      setShowCreateUser(false);
      
      // Refresh users list
      setTimeout(() => {
        if (window.wsManager) {
          window.wsManager.emit('admin_get_users');
        }
      }, 1000);
    }
  };

  const handleDeleteUser = (userId) => {
    if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      if (window.wsManager) {
        window.wsManager.emit('admin_delete_user', { userId });
        
        // Refresh users list
        setTimeout(() => {
          if (window.wsManager) {
            window.wsManager.emit('admin_get_users');
          }
        }, 1000);
      }
    }
  };

  const handleResetPassword = (userId) => {
    const newPassword = Math.random().toString(36).slice(-8);
    if (confirm(`Reset password for this user? New password will be: ${newPassword}`)) {
      if (window.wsManager) {
        window.wsManager.emit('admin_reset_password', { userId, newPassword });
      }
    }
  };

  const generatePassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewUserData(prev => ({ ...prev, password }));
  };

  return React.createElement('div', { className: 'modal-overlay' },
    React.createElement('div', { className: 'modal modal-large' },
      React.createElement('div', { className: 'modal-header' },
        React.createElement('h3', null, 
          React.createElement('span', { className: 'icon icon-settings' }),
          'Admin Panel - User Management'
        ),
        React.createElement('button', { onClick: onClose }, '×')
      ),
      React.createElement('div', { className: 'modal-body' },
        React.createElement('div', { style: { marginBottom: '20px' } },
          React.createElement('button', {
            onClick: () => setShowCreateUser(!showCreateUser),
            className: 'btn btn-primary'
          }, 
            React.createElement('span', { className: 'icon icon-add' }),
            'Create New User'
          )
        ),

        showCreateUser && React.createElement('div', { 
          className: 'create-user-form',
          style: { 
            background: '#f9fafb', 
            border: '1px solid #e5e7eb', 
            borderRadius: '8px', 
            padding: '20px', 
            marginBottom: '20px' 
          }
        },
          React.createElement('h4', null, 'Create New User'),
          React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: '10px', alignItems: 'end' } },
            React.createElement('div', { className: 'form-group', style: { marginBottom: '0' } },
              React.createElement('label', { className: 'form-label' }, 'Username'),
              React.createElement('input', {
                type: 'text',
                value: newUserData.username,
                onChange: (e) => setNewUserData(prev => ({ ...prev, username: e.target.value })),
                className: 'form-input',
                placeholder: 'Enter username'
              })
            ),
            React.createElement('div', { className: 'form-group', style: { marginBottom: '0' } },
              React.createElement('label', { className: 'form-label' }, 'Password'),
              React.createElement('input', {
                type: 'text',
                value: newUserData.password,
                onChange: (e) => setNewUserData(prev => ({ ...prev, password: e.target.value })),
                className: 'form-input',
                placeholder: 'Enter password'
              })
            ),
            React.createElement('button', {
              onClick: generatePassword,
              className: 'btn btn-secondary',
              title: 'Generate random password'
            }, '🎲'),
            React.createElement('button', {
              onClick: handleCreateUser,
              className: 'btn btn-success'
            }, 'Create')
          )
        ),

        loading ? React.createElement('div', { style: { textAlign: 'center', padding: '20px' } }, 'Loading users...') :
        React.createElement('div', { className: 'users-table' },
          React.createElement('table', { 
            style: { 
              width: '100%', 
              borderCollapse: 'collapse',
              border: '1px solid #e5e7eb'
            } 
          },
            React.createElement('thead', null,
              React.createElement('tr', { style: { background: '#f9fafb' } },
                React.createElement('th', { style: { padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' } }, 'Username'),
                React.createElement('th', { style: { padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' } }, 'Created'),
                React.createElement('th', { style: { padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' } }, 'Last Login'),
                React.createElement('th', { style: { padding: '12px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' } }, 'Status'),
                React.createElement('th', { style: { padding: '12px', textAlign: 'center', borderBottom: '1px solid #e5e7eb' } }, 'Actions')
              )
            ),
            React.createElement('tbody', null,
              users.map(user => 
                React.createElement('tr', { 
                  key: user.id,
                  style: { borderBottom: '1px solid #f3f4f6' }
                },
                  React.createElement('td', { style: { padding: '12px' } }, user.username),
                  React.createElement('td', { style: { padding: '12px' } }, 
                    user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'
                  ),
                  React.createElement('td', { style: { padding: '12px' } }, 
                    user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'
                  ),
                  React.createElement('td', { style: { padding: '12px' } },
                    React.createElement('span', {
                      style: {
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        background: user.isLocked ? '#fef2f2' : '#f0fdf4',
                        color: user.isLocked ? '#dc2626' : '#16a34a',
                        border: `1px solid ${user.isLocked ? '#fecaca' : '#bbf7d0'}`
                      }
                    }, user.isLocked ? 'Locked' : 'Active')
                  ),
                  React.createElement('td', { style: { padding: '12px', textAlign: 'center' } },
                    React.createElement('div', { style: { display: 'flex', gap: '5px', justifyContent: 'center' } },
                      React.createElement('button', {
                        onClick: () => handleResetPassword(user.id),
                        className: 'btn btn-sm btn-warning',
                        title: 'Reset Password'
                      }, '🔑'),
                      React.createElement('button', {
                        onClick: () => handleDeleteUser(user.id),
                        className: 'btn btn-sm btn-danger',
                        title: 'Delete User'
                      }, '🗑️')
                    )
                  )
                )
              )
            )
          )
        )
      ),
      React.createElement('div', { className: 'modal-footer' },
        React.createElement('button', { 
          onClick: onClose, 
          className: 'btn btn-primary' 
        }, 'Close')
      )
    )
  );
}

// Make components available globally
window.TransactionForm = TransactionForm;
window.TransactionDetails = TransactionDetails;
window.TransactionEditModal = TransactionEditModal;
window.AuthForm = AuthForm;
window.AddFundsModal = AddFundsModal;
window.BDNumberModal = BDNumberModal;
window.AdminPanel = AdminPanel;

// Initialize wsManager globally
window.wsManager = wsManager;