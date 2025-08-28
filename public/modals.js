// PROFESSIONAL MODAL SYSTEM - COMPLETE REWRITE
// All modals rebuilt from scratch for industry-standard UX

// Base Modal Component
function BaseModal({ isOpen, onClose, title, children, size = 'medium', actions }) {
  if (!isOpen) return null;

  const modalSizes = {
    small: 'modal-sm',
    medium: 'modal-md', 
    large: 'modal-lg'
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  React.useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.body.classList.add('modal-open');
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.classList.remove('modal-open');
    };
  }, []);

  return React.createElement('div', {
    className: 'modal-overlay',
    onClick: handleOverlayClick
  },
    React.createElement('div', {
      className: `modal ${modalSizes[size]}`,
      onClick: (e) => e.stopPropagation()
    },
      React.createElement('div', { className: 'modal-header' },
        React.createElement('h3', { className: 'modal-title' }, title),
        React.createElement('button', {
          className: 'modal-close',
          onClick: onClose,
          'aria-label': 'Close modal'
        }, '×')
      ),
      React.createElement('div', { className: 'modal-body' }, children),
      actions && React.createElement('div', { className: 'modal-footer' }, actions)
    )
  );
}

// Form Input Component
function FormInput({ label, value, onChange, type = 'text', required = false, error, placeholder }) {
  const id = `input-${Math.random().toString(36).substr(2, 9)}`;
  
  return React.createElement('div', { className: 'form-field' },
    React.createElement('label', { htmlFor: id, className: 'form-label' },
      label,
      required && React.createElement('span', { className: 'required' }, ' *')
    ),
    React.createElement('input', {
      id,
      type,
      value,
      onChange: (e) => onChange(e.target.value),
      className: `form-input ${error ? 'error' : ''}`,
      placeholder,
      required
    }),
    error && React.createElement('div', { className: 'form-error' }, error)
  );
}

// Add Funds Modal
function AddFundsModal({ isOpen, onClose, onAdd }) {
  const [amount, setAmount] = React.useState('');
  const [error, setError] = React.useState('');

  const handleSubmit = () => {
    const numAmount = parseFloat(amount);
    if (!amount || numAmount <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    onAdd(numAmount);
    setAmount('');
    setError('');
  };

  const actions = React.createElement('div', { className: 'modal-actions' },
    React.createElement('button', {
      className: 'btn btn-secondary',
      onClick: onClose
    }, 'Cancel'),
    React.createElement('button', {
      className: 'btn btn-primary',
      onClick: handleSubmit
    }, 'Add Funds')
  );

  return React.createElement(BaseModal, {
    isOpen,
    onClose,
    title: 'Add Funds',
    size: 'small',
    actions
  },
    React.createElement(FormInput, {
      label: 'Amount',
      value: amount,
      onChange: setAmount,
      type: 'number',
      placeholder: '0.00',
      required: true,
      error
    })
  );
}

// Transaction Form Modal
function TransactionFormModal({ isOpen, onClose, onSubmit }) {
  const [formData, setFormData] = React.useState({
    beneficiary: '',
    itemDescription: '',
    invoiceNumber: '',
    dateOfPurchase: '',
    dateOfReimbursement: '',
    amount: '',
    observations: '',
    flightNumber: '',
    numberOfLuggage: ''
  });
  const [errors, setErrors] = React.useState({});

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.beneficiary.trim()) newErrors.beneficiary = 'Beneficiary is required';
    if (!formData.itemDescription.trim()) newErrors.itemDescription = 'Item description is required';
    if (!formData.amount || parseFloat(formData.amount) <= 0) newErrors.amount = 'Valid amount is required';
    if (!formData.dateOfPurchase) newErrors.dateOfPurchase = 'Purchase date is required';
    if (!formData.dateOfReimbursement) newErrors.dateOfReimbursement = 'Reimbursement date is required';
    return newErrors;
  };

  const handleSubmit = () => {
    const newErrors = validate();
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    onSubmit(formData);
    setFormData({
      beneficiary: '',
      itemDescription: '',
      invoiceNumber: '',
      dateOfPurchase: '',
      dateOfReimbursement: '',
      amount: '',
      observations: '',
      flightNumber: '',
      numberOfLuggage: ''
    });
  };

  const actions = React.createElement('div', { className: 'modal-actions' },
    React.createElement('button', {
      className: 'btn btn-secondary',
      onClick: onClose
    }, 'Cancel'),
    React.createElement('button', {
      className: 'btn btn-primary',
      onClick: handleSubmit
    }, 'Add Transaction')
  );

  return React.createElement(BaseModal, {
    isOpen,
    onClose,
    title: 'New Transaction',
    size: 'large',
    actions
  },
    React.createElement('div', { className: 'form-grid' },
      React.createElement(FormInput, {
        label: 'Beneficiary',
        value: formData.beneficiary,
        onChange: (value) => updateField('beneficiary', value),
        required: true,
        error: errors.beneficiary
      }),
      React.createElement(FormInput, {
        label: 'Item Description',
        value: formData.itemDescription,
        onChange: (value) => updateField('itemDescription', value),
        required: true,
        error: errors.itemDescription
      }),
      React.createElement(FormInput, {
        label: 'Invoice Number',
        value: formData.invoiceNumber,
        onChange: (value) => updateField('invoiceNumber', value)
      }),
      React.createElement(FormInput, {
        label: 'Amount',
        value: formData.amount,
        onChange: (value) => updateField('amount', value),
        type: 'number',
        required: true,
        error: errors.amount
      }),
      React.createElement(FormInput, {
        label: 'Purchase Date',
        value: formData.dateOfPurchase,
        onChange: (value) => updateField('dateOfPurchase', value),
        type: 'date',
        required: true,
        error: errors.dateOfPurchase
      }),
      React.createElement(FormInput, {
        label: 'Reimbursement Date',
        value: formData.dateOfReimbursement,
        onChange: (value) => updateField('dateOfReimbursement', value),
        type: 'date',
        required: true,
        error: errors.dateOfReimbursement
      }),
      React.createElement(FormInput, {
        label: 'Flight Number',
        value: formData.flightNumber,
        onChange: (value) => updateField('flightNumber', value)
      }),
      React.createElement(FormInput, {
        label: 'Number of Luggage',
        value: formData.numberOfLuggage,
        onChange: (value) => updateField('numberOfLuggage', value),
        type: 'number'
      }),
      React.createElement('div', { className: 'form-field full-width' },
        React.createElement('label', { className: 'form-label' }, 'Observations'),
        React.createElement('textarea', {
          value: formData.observations,
          onChange: (e) => updateField('observations', e.target.value),
          className: 'form-textarea',
          rows: 3,
          placeholder: 'Optional notes...'
        })
      )
    )
  );
}

// Transaction Details Modal
function TransactionDetailsModal({ isOpen, onClose, transaction, onEdit }) {
  if (!transaction) return null;

  const actions = React.createElement('div', { className: 'modal-actions' },
    React.createElement('button', {
      className: 'btn btn-secondary',
      onClick: onClose
    }, 'Close'),
    onEdit && React.createElement('button', {
      className: 'btn btn-primary',
      onClick: () => onEdit(transaction)
    }, 'Edit')
  );

  return React.createElement(BaseModal, {
    isOpen,
    onClose,
    title: 'Transaction Details',
    size: 'medium',
    actions
  },
    React.createElement('div', { className: 'details-grid' },
      React.createElement('div', { className: 'detail-item' },
        React.createElement('label', null, 'Beneficiary'),
        React.createElement('div', { className: 'detail-value' }, transaction.beneficiary || '-')
      ),
      React.createElement('div', { className: 'detail-item' },
        React.createElement('label', null, 'Item Description'),
        React.createElement('div', { className: 'detail-value' }, transaction.itemDescription || '-')
      ),
      React.createElement('div', { className: 'detail-item' },
        React.createElement('label', null, 'Amount'),
        React.createElement('div', { className: 'detail-value' }, `$${transaction.amount?.toFixed(2) || '0.00'}`)
      ),
      React.createElement('div', { className: 'detail-item' },
        React.createElement('label', null, 'Purchase Date'),
        React.createElement('div', { className: 'detail-value' }, 
          transaction.dateOfPurchase ? new Date(transaction.dateOfPurchase).toLocaleDateString() : '-'
        )
      ),
      React.createElement('div', { className: 'detail-item' },
        React.createElement('label', null, 'Reimbursement Date'),
        React.createElement('div', { className: 'detail-value' }, 
          transaction.dateOfReimbursement ? new Date(transaction.dateOfReimbursement).toLocaleDateString() : '-'
        )
      ),
      React.createElement('div', { className: 'detail-item' },
        React.createElement('label', null, 'Invoice Number'),
        React.createElement('div', { className: 'detail-value' }, transaction.invoiceNumber || '-')
      ),
      React.createElement('div', { className: 'detail-item' },
        React.createElement('label', null, 'Flight Number'),
        React.createElement('div', { className: 'detail-value' }, transaction.flightNumber || '-')
      ),
      React.createElement('div', { className: 'detail-item' },
        React.createElement('label', null, 'Number of Luggage'),
        React.createElement('div', { className: 'detail-value' }, transaction.numberOfLuggage || '-')
      ),
      transaction.observations && React.createElement('div', { className: 'detail-item full-width' },
        React.createElement('label', null, 'Observations'),
        React.createElement('div', { className: 'detail-value' }, transaction.observations)
      )
    )
  );
}

// BD Number Modal
function BDNumberModal({ isOpen, onClose, onConfirm, count }) {
  const [bdNumber, setBdNumber] = React.useState('');
  const [error, setError] = React.useState('');

  const handleSubmit = () => {
    if (!bdNumber.trim()) {
      setError('BD number is required');
      return;
    }
    onConfirm(bdNumber.trim());
    setBdNumber('');
    setError('');
  };

  const actions = React.createElement('div', { className: 'modal-actions' },
    React.createElement('button', {
      className: 'btn btn-secondary',
      onClick: onClose
    }, 'Cancel'),
    React.createElement('button', {
      className: 'btn btn-primary',
      onClick: handleSubmit
    }, 'Assign BD Number')
  );

  return React.createElement(BaseModal, {
    isOpen,
    onClose,
    title: `Assign BD Number to ${count} Transaction${count > 1 ? 's' : ''}`,
    size: 'small',
    actions
  },
    React.createElement(FormInput, {
      label: 'BD Number',
      value: bdNumber,
      onChange: setBdNumber,
      placeholder: 'Enter BD number...',
      required: true,
      error
    })
  );
}

// Admin Panel Modal
function AdminPanelModal({ isOpen, onClose }) {
  const [users, setUsers] = React.useState([]);
  const [newUser, setNewUser] = React.useState({ username: '', password: '' });
  const [loading, setLoading] = React.useState(false);

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewUser(prev => ({ ...prev, password }));
  };

  const handleCreateUser = () => {
    if (!newUser.username.trim() || !newUser.password.trim()) {
      alert('Username and password are required');
      return;
    }
    window.wsManager?.emit('create_user', newUser);
    setNewUser({ username: '', password: '' });
  };

  const handleResetPassword = (userId) => {
    if (confirm('Reset password for this user?')) {
      window.wsManager?.emit('reset_password', { userId });
    }
  };

  const handleDeleteUser = (userId) => {
    if (confirm('Delete this user? This action cannot be undone.')) {
      window.wsManager?.emit('delete_user', { userId });
    }
  };

  return React.createElement(BaseModal, {
    isOpen,
    onClose,
    title: 'Admin Panel',
    size: 'large'
  },
    React.createElement('div', { className: 'admin-content' },
      React.createElement('div', { className: 'admin-section' },
        React.createElement('h4', null, 'Create New User'),
        React.createElement('div', { className: 'form-row' },
          React.createElement(FormInput, {
            label: 'Username',
            value: newUser.username,
            onChange: (value) => setNewUser(prev => ({ ...prev, username: value })),
            required: true
          }),
          React.createElement('div', { className: 'form-field' },
            React.createElement('label', { className: 'form-label' }, 'Password *'),
            React.createElement('div', { className: 'password-input' },
              React.createElement('input', {
                type: 'text',
                value: newUser.password,
                onChange: (e) => setNewUser(prev => ({ ...prev, password: e.target.value })),
                className: 'form-input',
                required: true
              }),
              React.createElement('button', {
                type: 'button',
                onClick: generatePassword,
                className: 'btn btn-sm btn-secondary'
              }, 'Generate')
            )
          )
        ),
        React.createElement('button', {
          onClick: handleCreateUser,
          className: 'btn btn-primary'
        }, 'Create User')
      ),
      React.createElement('div', { className: 'admin-section' },
        React.createElement('h4', null, 'Manage Users'),
        React.createElement('div', { className: 'user-list' },
          users.map(user => 
            React.createElement('div', { key: user.id, className: 'user-item' },
              React.createElement('span', { className: 'user-name' }, user.username),
              React.createElement('div', { className: 'user-actions' },
                React.createElement('button', {
                  onClick: () => handleResetPassword(user.id),
                  className: 'btn btn-sm btn-warning'
                }, 'Reset Password'),
                React.createElement('button', {
                  onClick: () => handleDeleteUser(user.id),
                  className: 'btn btn-sm btn-danger'
                }, 'Delete')
              )
            )
          )
        )
      )
    )
  );
}

// Export all modals
window.AddFundsModal = AddFundsModal;
window.TransactionFormModal = TransactionFormModal;
window.TransactionDetailsModal = TransactionDetailsModal;
window.BDNumberModal = BDNumberModal;
window.AdminPanelModal = AdminPanelModal;