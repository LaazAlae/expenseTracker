// SIMPLE PROFESSIONAL MODAL SYSTEM - CLEAN & FAST
// No overcomplicated features - just works perfectly

// Simple Base Modal
function BaseModal({ isOpen, onClose, title, children, size = 'medium', actions }) {
  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  React.useEffect(() => {
    if (isOpen) {
      document.body.classList.add('modal-open');
      
      const handleEscape = (e) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.body.classList.remove('modal-open');
      };
    }
  }, [isOpen, onClose]);

  return React.createElement('div', {
    className: 'modal-overlay',
    onClick: handleOverlayClick
  },
    React.createElement('div', {
      className: `modal modal-${size}`,
      onClick: (e) => e.stopPropagation()
    },
      React.createElement('div', {
        className: 'modal-content',
        onClick: (e) => e.stopPropagation()
      },
        React.createElement('div', { className: 'modal-header' },
          React.createElement('h3', { className: 'modal-title' }, title),
          React.createElement('button', {
            className: 'modal-close',
            onClick: onClose,
            type: 'button'
          }, '×')
        ),
        React.createElement('div', { className: 'modal-body' }, children),
        actions && React.createElement('div', { className: 'modal-footer' }, actions)
      )
    )
  );
}

// Simple Form Input
function FormInput({ label, value, onChange, type = 'text', required = false, error, placeholder, step, min }) {
  const id = React.useMemo(() => `input-${Math.random().toString(36).substr(2, 9)}`, []);
  
  return React.createElement('div', { className: 'form-field' },
    React.createElement('label', { htmlFor: id, className: 'form-label' },
      label,
      required && React.createElement('span', { className: 'required' }, ' *')
    ),
    React.createElement('input', {
      id,
      type,
      value: value || '',
      onChange: (e) => onChange(e.target.value),
      className: `form-input ${error ? 'error' : ''}`,
      placeholder,
      required,
      step,
      min
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
    onClose();
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
      step: '0.01',
      min: '0.01',
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
    dateOfReimbursement: new Date().toISOString().split('T')[0],
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
      dateOfReimbursement: new Date().toISOString().split('T')[0],
      amount: '',
      observations: '',
      flightNumber: '',
      numberOfLuggage: ''
    });
    onClose();
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
        step: '0.01',
        min: '0.01',
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
        type: 'number',
        min: '1'
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

  const isPositiveTransaction = transaction.type === 'fund_addition';

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
    title: isPositiveTransaction ? 'Fund Addition Details' : 'Transaction Details',
    size: 'medium',
    actions
  },
    React.createElement('div', { className: 'details-grid' },
      React.createElement('div', { className: 'detail-item' },
        React.createElement('label', null, 'Date'),
        React.createElement('div', { className: 'detail-value' }, 
          transaction.dateOfReimbursement ? new Date(transaction.dateOfReimbursement).toLocaleDateString() : '-'
        )
      ),
      !isPositiveTransaction && React.createElement('div', { className: 'detail-item' },
        React.createElement('label', null, 'Beneficiary'),
        React.createElement('div', { className: 'detail-value' }, transaction.beneficiary || '-')
      ),
      React.createElement('div', { className: 'detail-item' },
        React.createElement('label', null, isPositiveTransaction ? 'Description' : 'Item Description'),
        React.createElement('div', { className: 'detail-value' }, transaction.itemDescription || '-')
      ),
      React.createElement('div', { className: 'detail-item' },
        React.createElement('label', null, 'Amount'),
        React.createElement('div', { className: 'detail-value' }, 
          `${isPositiveTransaction ? '+' : '-'}$${transaction.amount?.toFixed(2) || '0.00'}`
        )
      ),
      !isPositiveTransaction && React.createElement('div', { className: 'detail-item' },
        React.createElement('label', null, 'Purchase Date'),
        React.createElement('div', { className: 'detail-value' }, 
          transaction.dateOfPurchase ? new Date(transaction.dateOfPurchase).toLocaleDateString() : '-'
        )
      ),
      !isPositiveTransaction && React.createElement('div', { className: 'detail-item' },
        React.createElement('label', null, 'Invoice Number'),
        React.createElement('div', { className: 'detail-value' }, transaction.invoiceNumber || '-')
      ),
      transaction.flightNumber && React.createElement('div', { className: 'detail-item' },
        React.createElement('label', null, 'Flight Number'),
        React.createElement('div', { className: 'detail-value' }, transaction.flightNumber)
      ),
      transaction.numberOfLuggage && React.createElement('div', { className: 'detail-item' },
        React.createElement('label', null, 'Number of Luggage'),
        React.createElement('div', { className: 'detail-value' }, transaction.numberOfLuggage)
      ),
      transaction.bdNumber && React.createElement('div', { className: 'detail-item' },
        React.createElement('label', null, 'BD Number'),
        React.createElement('div', { className: 'detail-value' }, transaction.bdNumber)
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
    onClose();
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
    title: `Assign BD Number to ${count || 0} Transaction${(count || 0) !== 1 ? 's' : ''}`,
    size: 'small',
    actions
  },
    React.createElement(FormInput, {
      label: 'BD Number',
      value: bdNumber,
      onChange: setBdNumber,
      placeholder: 'Enter BD number (e.g., BD-2025-001)',
      required: true,
      error
    })
  );
}

// Admin Panel Modal
function AdminPanelModal({ isOpen, onClose }) {
  const [users, setUsers] = React.useState([]);
  const [newUser, setNewUser] = React.useState({ username: '', password: '' });
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (isOpen) {
      // Request users list from WebSocket
      window.wsManager?.emit('admin_get_users');
      
      // Listen for users list
      const handleUsersList = (data) => {
        setUsers(data.users || []);
        setLoading(false);
      };

      if (window.wsManager) {
        window.wsManager.on('users_list', handleUsersList);
      }

      return () => {
        // Cleanup listener
      };
    }
  }, [isOpen]);

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
    window.wsManager?.emit('admin_create_user', newUser);
    setNewUser({ username: '', password: '' });
  };

  const handleResetPassword = (userId) => {
    if (confirm('Reset password for this user?')) {
      window.wsManager?.emit('admin_reset_password', { userId });
    }
  };

  const handleDeleteUser = (userId) => {
    if (confirm('Delete this user? This action cannot be undone.')) {
      window.wsManager?.emit('admin_delete_user', { userId });
    }
  };

  return React.createElement(BaseModal, {
    isOpen,
    onClose,
    title: 'Admin Panel - User Management',
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
        loading ? 
          React.createElement('div', { style: { textAlign: 'center', padding: '20px' } }, 'Loading users...') :
          React.createElement('div', { className: 'user-list' },
            users.map(user => 
              React.createElement('div', { key: user.id, className: 'user-item' },
                React.createElement('div', { className: 'user-info' },
                  React.createElement('span', { className: 'user-name' }, user.username),
                  React.createElement('span', { className: 'user-meta' }, 
                    user.lastLogin ? `Last: ${new Date(user.lastLogin).toLocaleDateString()}` : 'Never logged in'
                  )
                ),
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

// Export all modals to window
window.BaseModal = BaseModal;
window.AddFundsModal = AddFundsModal;
window.TransactionFormModal = TransactionFormModal;
window.TransactionDetailsModal = TransactionDetailsModal;
window.BDNumberModal = BDNumberModal;
window.AdminPanelModal = AdminPanelModal;