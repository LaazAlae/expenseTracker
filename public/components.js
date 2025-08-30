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
      }, '⚠ Registration is disabled. Contact an administrator for account access.'),
      
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

// Legacy Add Funds Modal - REPLACED WITH NEW SYSTEM
// This is kept for compatibility but redirects to new modal system
function AddFundsModal({ fundsAmount, setFundsAmount, onAdd, onCancel }) {
  return React.createElement(window.AddFundsModal, {
    isOpen: true,
    onClose: onCancel,
    onAdd: () => {
      onAdd();
      onCancel();
    }
  });
}

// Legacy BD Number Modal - REPLACED WITH NEW SYSTEM
// This is kept for compatibility but redirects to new modal system
function BDNumberModal({ bdNumber, setBdNumber, onConfirm, onCancel, count }) {
  return React.createElement(window.BDNumberModal, {
    isOpen: true,
    onClose: onCancel,
    onConfirm: (bdNumberValue) => {
      setBdNumber(bdNumberValue);
      onConfirm();
    },
    count: count || 0
  });
}

// Ultimate Transaction Edit Modal - NEW RESPONSIVE SYSTEM
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
  const [isLoading, setIsLoading] = useState(false);
  const [showFlightFields, setShowFlightFields] = useState(false);

  useEffect(() => {
    setShowFlightFields(formData.itemDescription.toLowerCase().includes('sky cap'));
  }, [formData.itemDescription]);

  const handleSubmit = async (e) => {
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

    setIsLoading(true);
    try {
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
      
      await onSave(updates);
      onCancel();
    } catch (err) {
      setErrors({ general: 'Failed to save changes. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const isFundAddition = transaction.type === 'fund_addition';

  const actions = React.createElement('div', { className: 'modal-actions' },
    React.createElement('button', { 
      type: 'button', 
      onClick: onCancel, 
      className: 'btn btn-secondary',
      disabled: isLoading
    }, 'Cancel'),
    React.createElement('button', { 
      type: 'submit', 
      className: 'btn btn-primary',
      disabled: isLoading,
      onClick: handleSubmit
    }, isLoading ? 'Saving...' : 'Save Changes')
  );

  return React.createElement(window.BaseModal, {
    isOpen: true,
    onClose: onCancel,
    title: isFundAddition ? 'Edit Fund Addition' : 'Edit Transaction',
    size: 'large',
    actions
  },
    errors.general && React.createElement('div', { className: 'form-error general-error' }, errors.general),
    React.createElement('div', { className: 'form-grid' },
      React.createElement('div', { className: 'form-field' },
        React.createElement('label', { className: 'form-label' }, 'Date *'),
        React.createElement('input', {
          type: 'date',
          value: formData.dateOfReimbursement,
          onChange: (e) => handleChange('dateOfReimbursement', e.target.value),
          className: 'form-input',
          required: true
        })
      ),
      
      !isFundAddition && React.createElement('div', { className: 'form-field' },
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
      
      React.createElement('div', { className: 'form-field' },
        React.createElement('label', { className: 'form-label' }, 
          isFundAddition ? 'Description' : 'Item Description *'
        ),
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
      
      !isFundAddition && React.createElement('div', { className: 'form-field' },
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
      
      !isFundAddition && React.createElement('div', { className: 'form-field' },
        React.createElement('label', { className: 'form-label' }, 'Purchase Date *'),
        React.createElement('input', {
          type: 'date',
          value: formData.dateOfPurchase,
          onChange: (e) => handleChange('dateOfPurchase', e.target.value),
          required: true,
          className: `form-input ${errors.dateOfPurchase ? 'error' : ''}`,
          'aria-invalid': errors.dateOfPurchase ? 'true' : 'false'
        }),
        errors.dateOfPurchase && React.createElement('div', { className: 'form-error' }, errors.dateOfPurchase)
      ),
      
      React.createElement('div', { className: 'form-field' },
        React.createElement('label', { className: 'form-label' }, 'Amount ($) *'),
        React.createElement('input', {
          type: 'number',
          step: '0.01',
          min: '0.01',
          value: formData.amount,
          onChange: (e) => handleChange('amount', e.target.value),
          required: true,
          className: `form-input ${errors.amount ? 'error' : ''}`,
          placeholder: '0.00',
          'aria-invalid': errors.amount ? 'true' : 'false'
        }),
        errors.amount && React.createElement('div', { className: 'form-error' }, errors.amount)
      ),
      
      showFlightFields && !isFundAddition && React.createElement('div', { className: 'form-field' },
        React.createElement('label', { className: 'form-label' }, 'Flight Number'),
        React.createElement(AutocompleteInput, {
          value: formData.flightNumber,
          onChange: (value) => handleChange('flightNumber', value),
          storageKey: 'flightNumbers',
          placeholder: 'AT200, AT201...'
        })
      ),
      
      showFlightFields && !isFundAddition && React.createElement('div', { className: 'form-field' },
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
      ),
      
      React.createElement('div', { className: 'form-field full-width' },
        React.createElement('label', { className: 'form-label' }, 'Observations'),
        React.createElement('textarea', {
          value: formData.observations,
          onChange: (e) => handleChange('observations', e.target.value),
          className: 'form-textarea',
          rows: 3,
          placeholder: 'Optional notes...',
          'aria-label': 'Observations'
        })
      )
    )
  );
}

// Legacy Transaction Form - REPLACED WITH NEW SYSTEM
// This is kept for compatibility but redirects to new modal system
function TransactionForm({ onSubmit, onCancel, beneficiaries, itemDescriptions, flightNumbers }) {
  return React.createElement(window.TransactionFormModal, {
    isOpen: true,
    onClose: onCancel,
    onSubmit: onSubmit
  });
}

// Legacy Transaction Details - REPLACED WITH NEW SYSTEM
// This is kept for compatibility but redirects to new modal system
function TransactionDetails({ transaction, onClose, editMode, onEdit }) {
  return React.createElement(window.TransactionDetailsModal, {
    isOpen: true,
    onClose: onClose,
    transaction: transaction,
    onEdit: onEdit
  });
}

// Legacy Admin Panel - REPLACED WITH NEW SYSTEM
// This is kept for compatibility but redirects to new modal system
function AdminPanel({ onClose }) {
  return React.createElement(window.AdminPanelModal, {
    isOpen: true,
    onClose: onClose
  });
}

// Make components available globally
window.TransactionForm = TransactionForm;
window.TransactionDetails = TransactionDetails;
window.TransactionEditModal = TransactionEditModal;
window.AuthForm = AuthForm;
window.AddFundsModal = AddFundsModal;
window.BDNumberModal = BDNumberModal;
window.AdminPanel = AdminPanel;

// Remove wsManager reference - it's handled in app.js
// window.wsManager = wsManager;