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
      errors[field] = 'Ce champ est requis';
    }
  });
  
  if (data.amount && (isNaN(parseFloat(data.amount)) || parseFloat(data.amount) <= 0)) {
    errors.amount = 'Le montant doit être supérieur à 0';
  }
  
  if (data.email && !/\S+@\S+\.\S+/.test(data.email)) {
    errors.email = 'Adresse email invalide';
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
      // Initialize defaults if provided
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

// Professional Authentication Form
function AuthForm({ onAuth }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const requiredFields = isLogin ? ['username', 'password'] : ['username', 'email', 'password'];
    const validationErrors = validateForm(formData, requiredFields);
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    setLoading(true);
    setErrors({});

    try {
      const endpoint = isLogin ? '/api/login' : '/api/register';
      const payload = isLogin 
        ? { username: formData.username, password: formData.password }
        : formData;

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Échec de l\'authentification');
      }

      localStorage.setItem('authToken', data.token);
      onAuth(data.token, data.user);
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
      }, isLogin ? 'Connexion' : 'Inscription'),
      
      errors.general && React.createElement('div', { className: 'form-error', style: { marginBottom: '16px' } },
        React.createElement('span', { className: 'icon icon-error' }),
        errors.general
      ),
      
      React.createElement('form', { onSubmit: handleSubmit },
        React.createElement('div', { className: 'form-group' },
          React.createElement('label', { className: 'form-label' }, 'Nom d\'utilisateur'),
          React.createElement('input', {
            type: 'text',
            value: formData.username,
            onChange: (e) => handleChange('username', e.target.value),
            required: true,
            className: `form-input ${errors.username ? 'error' : ''}`,
            placeholder: 'Votre nom d\'utilisateur'
          }),
          errors.username && React.createElement('div', { className: 'form-error' },
            React.createElement('span', { className: 'icon icon-error' }),
            errors.username
          )
        ),
        
        !isLogin && React.createElement('div', { className: 'form-group' },
          React.createElement('label', { className: 'form-label' }, 'Email'),
          React.createElement('input', {
            type: 'email',
            value: formData.email,
            onChange: (e) => handleChange('email', e.target.value),
            required: true,
            className: `form-input ${errors.email ? 'error' : ''}`,
            placeholder: 'votre@email.com'
          }),
          errors.email && React.createElement('div', { className: 'form-error' },
            React.createElement('span', { className: 'icon icon-error' }),
            errors.email
          )
        ),
        
        React.createElement('div', { className: 'form-group' },
          React.createElement('label', { className: 'form-label' }, 'Mot de passe'),
          React.createElement('input', {
            type: 'password',
            value: formData.password,
            onChange: (e) => handleChange('password', e.target.value),
            required: true,
            className: `form-input ${errors.password ? 'error' : ''}`,
            placeholder: 'Votre mot de passe'
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
        }, loading ? 'Traitement en cours...' : (isLogin ? 'Se connecter' : 'Créer un compte')),
        
        React.createElement('button', {
          type: 'button',
          onClick: () => {
            setIsLogin(!isLogin);
            setErrors({});
          },
          className: 'btn',
          style: { width: '100%' }
        }, isLogin ? 'Créer un compte' : 'Connexion existante')
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
    React.createElement('div', { className: 'modal' },
      React.createElement('div', { className: 'modal-header' },
        React.createElement('h3', null, 
          React.createElement('span', { className: 'icon icon-document' }),
          'Nouvelle Transaction'
        ),
        React.createElement('button', { onClick: onCancel }, '×')
      ),
      React.createElement('form', { onSubmit: handleSubmit },
        React.createElement('div', { className: 'modal-body' },
          React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' } },
            
            React.createElement('div', { className: 'form-group' },
              React.createElement('label', { className: 'form-label' }, 'Date de Remboursement *'),
              React.createElement('input', {
                type: 'date',
                value: formData.dateOfReimbursement,
                onChange: (e) => handleChange('dateOfReimbursement', e.target.value),
                required: true,
                className: 'form-input'
              })
            ),
            
            React.createElement('div', { className: 'form-group' },
              React.createElement('label', { className: 'form-label' }, 'Bénéficiaire *'),
              React.createElement(AutocompleteInput, {
                value: formData.beneficiary,
                onChange: (value) => handleChange('beneficiary', value),
                storageKey: 'beneficiaries',
                placeholder: 'Nom du bénéficiaire',
                required: true,
                error: errors.beneficiary
              })
            ),
            
            React.createElement('div', { className: 'form-group' },
              React.createElement('label', { className: 'form-label' }, 'Description de l\'Article *'),
              React.createElement(AutocompleteInput, {
                value: formData.itemDescription,
                onChange: (value) => handleChange('itemDescription', value),
                storageKey: 'itemDescriptions',
                placeholder: 'Description de l\'article',
                required: true,
                error: errors.itemDescription,
                defaults: ['Sky Cap']
              })
            ),
            
            React.createElement('div', { className: 'form-group' },
              React.createElement('label', { className: 'form-label' }, 'Numéro de Facture *'),
              React.createElement(AutocompleteInput, {
                value: formData.invoiceNumber,
                onChange: (value) => handleChange('invoiceNumber', value),
                storageKey: 'invoiceNumbers',
                placeholder: 'Numéro de facture',
                required: true,
                error: errors.invoiceNumber
              })
            ),
            
            React.createElement('div', { className: 'form-group' },
              React.createElement('label', { className: 'form-label' }, 'Date d\'Achat *'),
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
              React.createElement('label', { className: 'form-label' }, 'Montant ($) *'),
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
              placeholder: 'Observations (optionnel)'
            })
          ),
          
          showFlightFields && React.createElement('div', { 
            className: 'flight-fields'
          },
            React.createElement('h4', null,
              React.createElement('span', { className: 'icon icon-flight' }),
              'Informations de Vol'
            ),
            
            React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' } },
              React.createElement('div', { className: 'form-group', style: { marginBottom: '0' } },
                React.createElement('label', { className: 'form-label' }, 'Numéro de Vol'),
                React.createElement(AutocompleteInput, {
                  value: formData.flightNumber,
                  onChange: (value) => handleChange('flightNumber', value),
                  storageKey: 'flightNumbers',
                  placeholder: 'AT200, AT201...'
                })
              ),
              
              React.createElement('div', { className: 'form-group', style: { marginBottom: '0' } },
                React.createElement('label', { className: 'form-label' }, 'Nombre de Bagages'),
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
            'Annuler'
          ),
          React.createElement('button', { 
            type: 'submit', 
            className: 'btn btn-primary' 
          }, 
            React.createElement('span', { className: 'icon icon-check' }),
            'Ajouter'
          )
        )
      )
    )
  );
}

// Professional Transaction Details Modal
function TransactionDetails({ transaction, onClose }) {
  const isPositiveTransaction = transaction.type === 'fund_addition';
  
  return React.createElement('div', { className: 'modal-overlay' },
    React.createElement('div', { className: 'modal' },
      React.createElement('div', { className: 'modal-header' },
        React.createElement('h3', null, 
          React.createElement('span', { className: 'icon icon-info' }),
          isPositiveTransaction ? 'Détails de l\'Ajout de Fonds' : 'Détails de la Transaction'
        ),
        React.createElement('button', { onClick: onClose }, '×')
      ),
      React.createElement('div', { className: 'modal-body' },
        React.createElement('div', { style: { display: 'grid', gap: '16px' } },
          React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' } },
            React.createElement('div', { className: 'detail-card' },
              React.createElement('div', { className: 'detail-label' }, 'Date de Remboursement'),
              React.createElement('div', { className: 'detail-value' },
                new Date(transaction.dateOfReimbursement).toLocaleDateString('fr-FR')
              )
            ),
            React.createElement('div', { className: 'detail-card' },
              React.createElement('div', { className: 'detail-label' }, 'Bénéficiaire'),
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
              React.createElement('div', { className: 'detail-label' }, 'Facture'),
              React.createElement('div', { className: 'detail-value' },
                transaction.invoiceNumber || '-'
              )
            ),
            React.createElement('div', { className: 'detail-card' },
              React.createElement('div', { className: 'detail-label' }, 'Date d\'Achat'),
              React.createElement('div', { className: 'detail-value' },
                transaction.dateOfPurchase ? new Date(transaction.dateOfPurchase).toLocaleDateString('fr-FR') : '-'
              )
            ),
            React.createElement('div', { 
              className: 'detail-card',
              style: { 
                background: isPositiveTransaction ? '#f0fdf4' : '#fef2f2',
                borderColor: isPositiveTransaction ? '#bbf7d0' : '#fecaca'
              }
            },
              React.createElement('div', { className: 'detail-label' }, 'Montant'),
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
            React.createElement('div', { className: 'detail-label' }, 'Informations de Vol'),
            React.createElement('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px', marginTop: '8px' } },
              transaction.flightNumber && React.createElement('div', null,
                React.createElement('div', { style: { fontSize: '11px', color: '#6b7280', textTransform: 'uppercase' } }, 'Vol'),
                React.createElement('div', { className: 'detail-value' }, transaction.flightNumber)
              ),
              transaction.numberOfLuggage && React.createElement('div', null,
                React.createElement('div', { style: { fontSize: '11px', color: '#6b7280', textTransform: 'uppercase' } }, 'Bagages'),
                React.createElement('div', { className: 'detail-value' }, transaction.numberOfLuggage)
              )
            )
          ),
          
          transaction.bdNumber && React.createElement('div', { 
            className: 'detail-card',
            style: { background: '#fdf4ff', borderColor: '#e9d5ff' }
          },
            React.createElement('div', { className: 'detail-label' }, 'Numéro BD'),
            React.createElement('div', { className: 'detail-value', style: { color: '#7c3aed', fontWeight: '600' } },
              transaction.bdNumber
            )
          )
        )
      ),
      React.createElement('div', { className: 'modal-footer' },
        React.createElement('button', { 
          onClick: onClose, 
          className: 'btn btn-primary' 
        }, 
          React.createElement('span', { className: 'icon icon-check' }),
          'Fermer'
        )
      )
    )
  );
}