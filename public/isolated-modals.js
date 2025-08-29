// COMPLETELY ISOLATED MODAL SYSTEM - NO INTERFERENCE POSSIBLE
// Using unique namespaces and completely separate code

(function() {
  'use strict';
  
  // Unique namespace to prevent ALL conflicts
  window.IsolatedModals = window.IsolatedModals || {};
  
  const IM = window.IsolatedModals;
  
  // Unique state management - completely isolated
  IM.state = {
    openModals: new Set(),
    bodyScrollY: 0
  };
  
  // Unique ID generator
  IM.generateId = () => 'im_' + Math.random().toString(36).substr(2, 9);
  
  // Lock/unlock body scroll
  IM.lockBodyScroll = () => {
    if (IM.state.openModals.size === 1) {
      IM.state.bodyScrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${IM.state.bodyScrollY}px`;
      document.body.style.width = '100%';
    }
  };
  
  IM.unlockBodyScroll = () => {
    if (IM.state.openModals.size === 0) {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo(0, IM.state.bodyScrollY);
    }
  };
  
  // Base Modal Component - completely isolated
  IM.BaseModal = function({ isOpen, onClose, title, children, size = 'medium', actions }) {
    const modalId = React.useMemo(() => IM.generateId(), []);
    
    React.useEffect(() => {
      if (isOpen) {
        IM.state.openModals.add(modalId);
        IM.lockBodyScroll();
        
        const handleEscape = (e) => {
          if (e.key === 'Escape') {
            onClose();
          }
        };
        
        document.addEventListener('keydown', handleEscape);
        
        return () => {
          document.removeEventListener('keydown', handleEscape);
          IM.state.openModals.delete(modalId);
          IM.unlockBodyScroll();
        };
      }
    }, [isOpen, onClose, modalId]);
    
    if (!isOpen) return null;
    
    const handleOverlayClick = (e) => {
      if (e.target.classList.contains('im-modal-overlay')) {
        onClose();
      }
    };
    
    return React.createElement('div', {
      className: `im-modal-overlay im-modal-${size}`,
      onClick: handleOverlayClick
    },
      React.createElement('div', {
        className: 'im-modal-container'
      },
        React.createElement('div', {
          className: 'im-modal-header'
        },
          React.createElement('h3', { className: 'im-modal-title' }, title),
          React.createElement('button', {
            className: 'im-modal-close',
            onClick: onClose,
            type: 'button'
          }, '×')
        ),
        React.createElement('div', { className: 'im-modal-body' }, children),
        actions && React.createElement('div', { className: 'im-modal-footer' }, actions)
      )
    );
  };
  
  // Form Input Component - isolated
  IM.FormInput = function({ label, value, onChange, type = 'text', required = false, error, placeholder, step, min, max }) {
    const inputId = React.useMemo(() => IM.generateId(), []);
    
    return React.createElement('div', { className: 'im-form-field' },
      React.createElement('label', { htmlFor: inputId, className: 'im-form-label' },
        label,
        required && React.createElement('span', { className: 'im-required' }, ' *')
      ),
      React.createElement('input', {
        id: inputId,
        type,
        value: value || '',
        onChange: (e) => onChange(e.target.value),
        className: `im-form-input ${error ? 'im-error' : ''}`,
        placeholder,
        required,
        step,
        min,
        max
      }),
      error && React.createElement('div', { className: 'im-form-error' }, error)
    );
  };
  
  // Add Funds Modal - completely isolated
  IM.AddFundsModal = function({ isOpen, onClose, onAdd }) {
    const [amount, setAmount] = React.useState('');
    const [error, setError] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    
    React.useEffect(() => {
      if (isOpen) {
        setAmount('');
        setError('');
        setLoading(false);
      }
    }, [isOpen]);
    
    const handleSubmit = async () => {
      const numAmount = parseFloat(amount);
      if (!amount || numAmount <= 0) {
        setError('Please enter a valid amount');
        return;
      }
      
      setLoading(true);
      setError('');
      
      try {
        await onAdd(numAmount);
        setAmount('');
        onClose();
      } catch (err) {
        setError('Failed to add funds. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    const actions = React.createElement('div', { className: 'im-modal-actions' },
      React.createElement('button', {
        className: 'im-btn im-btn-secondary',
        onClick: onClose,
        disabled: loading
      }, 'Cancel'),
      React.createElement('button', {
        className: 'im-btn im-btn-primary',
        onClick: handleSubmit,
        disabled: loading || !amount
      }, loading ? 'Adding...' : 'Add Funds')
    );
    
    const titleWithIcon = React.createElement('div', {
      'data-icon': 'funds'
    }, 'Add Funds');
    
    return React.createElement(IM.BaseModal, {
      isOpen,
      onClose,
      title: titleWithIcon,
      size: 'small',
      actions
    },
      React.createElement('div', { className: 'im-form-field' },
        React.createElement('label', { 
          className: 'im-form-label',
          'data-icon': 'amount'
        }, 'Amount', React.createElement('span', { className: 'im-required' }, ' *')),
        React.createElement('input', {
          type: 'number',
          value: amount || '',
          onChange: (e) => setAmount(e.target.value),
          className: `im-form-input ${error ? 'im-error' : ''}`,
          placeholder: '0.00',
          step: '0.01',
          min: '0.01',
          required: true
        }),
        error && React.createElement('div', { className: 'im-form-error' }, error)
      )
    );
  };
  
  // Transaction Form Modal - isolated
  IM.TransactionFormModal = function({ isOpen, onClose, onSubmit }) {
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
    const [loading, setLoading] = React.useState(false);
    
    React.useEffect(() => {
      if (isOpen) {
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
        setErrors({});
        setLoading(false);
      }
    }, [isOpen]);
    
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
    
    const handleSubmit = async () => {
      const newErrors = validate();
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }
      
      setLoading(true);
      try {
        await onSubmit(formData);
        onClose();
      } catch (err) {
        setErrors({ general: 'Failed to add transaction. Please try again.' });
      } finally {
        setLoading(false);
      }
    };
    
    const actions = React.createElement('div', { className: 'im-modal-actions' },
      React.createElement('button', {
        className: 'im-btn im-btn-secondary',
        onClick: onClose,
        disabled: loading
      }, 'Cancel'),
      React.createElement('button', {
        className: 'im-btn im-btn-primary',
        onClick: handleSubmit,
        disabled: loading
      }, loading ? 'Adding...' : 'Add Transaction')
    );
    
    const titleWithIcon = React.createElement('div', {
      'data-icon': 'transaction'
    }, 'New Transaction');
    
    return React.createElement(IM.BaseModal, {
      isOpen,
      onClose,
      title: titleWithIcon,
      size: 'large',
      actions
    },
      errors.general && React.createElement('div', { className: 'im-form-error im-general-error' }, errors.general),
      React.createElement('div', { className: 'im-form-grid' },
        React.createElement('div', { className: 'im-form-field' },
          React.createElement('label', { 
            className: 'im-form-label',
            'data-icon': 'user'
          }, 'Beneficiary', React.createElement('span', { className: 'im-required' }, ' *')),
          React.createElement('input', {
            type: 'text',
            value: formData.beneficiary || '',
            onChange: (e) => updateField('beneficiary', e.target.value),
            className: `im-form-input ${errors.beneficiary ? 'im-error' : ''}`,
            required: true
          }),
          errors.beneficiary && React.createElement('div', { className: 'im-form-error' }, errors.beneficiary)
        ),
        React.createElement('div', { className: 'im-form-field' },
          React.createElement('label', { 
            className: 'im-form-label',
            'data-icon': 'item'
          }, 'Item Description', React.createElement('span', { className: 'im-required' }, ' *')),
          React.createElement('input', {
            type: 'text',
            value: formData.itemDescription || '',
            onChange: (e) => updateField('itemDescription', e.target.value),
            className: `im-form-input ${errors.itemDescription ? 'im-error' : ''}`,
            required: true
          }),
          errors.itemDescription && React.createElement('div', { className: 'im-form-error' }, errors.itemDescription)
        ),
        React.createElement('div', { className: 'im-form-field' },
          React.createElement('label', { 
            className: 'im-form-label',
            'data-icon': 'invoice'
          }, 'Invoice Number'),
          React.createElement('input', {
            type: 'text',
            value: formData.invoiceNumber || '',
            onChange: (e) => updateField('invoiceNumber', e.target.value),
            className: 'im-form-input'
          })
        ),
        React.createElement('div', { className: 'im-form-field' },
          React.createElement('label', { 
            className: 'im-form-label',
            'data-icon': 'amount'
          }, 'Amount', React.createElement('span', { className: 'im-required' }, ' *')),
          React.createElement('input', {
            type: 'number',
            value: formData.amount || '',
            onChange: (e) => updateField('amount', e.target.value),
            className: `im-form-input ${errors.amount ? 'im-error' : ''}`,
            step: '0.01',
            min: '0.01',
            required: true
          }),
          errors.amount && React.createElement('div', { className: 'im-form-error' }, errors.amount)
        ),
        React.createElement('div', { className: 'im-form-field' },
          React.createElement('label', { 
            className: 'im-form-label',
            'data-icon': 'calendar'
          }, 'Purchase Date', React.createElement('span', { className: 'im-required' }, ' *')),
          React.createElement('input', {
            type: 'date',
            value: formData.dateOfPurchase || '',
            onChange: (e) => updateField('dateOfPurchase', e.target.value),
            className: `im-form-input ${errors.dateOfPurchase ? 'im-error' : ''}`,
            required: true
          }),
          errors.dateOfPurchase && React.createElement('div', { className: 'im-form-error' }, errors.dateOfPurchase)
        ),
        React.createElement('div', { className: 'im-form-field' },
          React.createElement('label', { 
            className: 'im-form-label',
            'data-icon': 'calendar'
          }, 'Reimbursement Date', React.createElement('span', { className: 'im-required' }, ' *')),
          React.createElement('input', {
            type: 'date',
            value: formData.dateOfReimbursement || '',
            onChange: (e) => updateField('dateOfReimbursement', e.target.value),
            className: `im-form-input ${errors.dateOfReimbursement ? 'im-error' : ''}`,
            required: true
          }),
          errors.dateOfReimbursement && React.createElement('div', { className: 'im-form-error' }, errors.dateOfReimbursement)
        ),
        React.createElement('div', { className: 'im-form-field' },
          React.createElement('label', { 
            className: 'im-form-label',
            'data-icon': 'plane'
          }, 'Flight Number'),
          React.createElement('input', {
            type: 'text',
            value: formData.flightNumber || '',
            onChange: (e) => updateField('flightNumber', e.target.value),
            className: 'im-form-input'
          })
        ),
        React.createElement('div', { className: 'im-form-field' },
          React.createElement('label', { 
            className: 'im-form-label',
            'data-icon': 'luggage'
          }, 'Number of Luggage'),
          React.createElement('input', {
            type: 'number',
            value: formData.numberOfLuggage || '',
            onChange: (e) => updateField('numberOfLuggage', e.target.value),
            className: 'im-form-input',
            min: '1'
          })
        ),
        React.createElement('div', { className: 'im-form-field im-full-width' },
          React.createElement('label', { 
            className: 'im-form-label',
            'data-icon': 'notes'
          }, 'Observations'),
          React.createElement('textarea', {
            value: formData.observations,
            onChange: (e) => updateField('observations', e.target.value),
            className: 'im-form-textarea',
            rows: 3,
            placeholder: 'Optional notes...'
          })
        )
      )
    );
  };
  
  // Transaction Details Modal - isolated
  IM.TransactionDetailsModal = function({ isOpen, onClose, transaction, onEdit }) {
    if (!transaction) return null;
    
    const isPositiveTransaction = transaction.type === 'fund_addition';
    
    const actions = React.createElement('div', { className: 'im-modal-actions' },
      React.createElement('button', {
        className: 'im-btn im-btn-secondary',
        onClick: onClose
      }, 'Close'),
      onEdit && React.createElement('button', {
        className: 'im-btn im-btn-primary',
        onClick: () => onEdit(transaction)
      }, 'Edit')
    );
    
    const titleWithIcon = React.createElement('div', {
      'data-icon': isPositiveTransaction ? 'funds' : 'details'
    }, isPositiveTransaction ? 'Fund Addition Details' : 'Transaction Details');
    
    return React.createElement(IM.BaseModal, {
      isOpen,
      onClose,
      title: titleWithIcon,
      size: 'medium',
      actions
    },
      React.createElement('div', { className: 'im-details-grid' },
        React.createElement('div', { className: 'im-detail-item' },
          React.createElement('label', null, 'Date'),
          React.createElement('div', { className: 'im-detail-value' }, 
            transaction.dateOfReimbursement ? new Date(transaction.dateOfReimbursement).toLocaleDateString() : '-'
          )
        ),
        !isPositiveTransaction && React.createElement('div', { className: 'im-detail-item' },
          React.createElement('label', null, 'Beneficiary'),
          React.createElement('div', { className: 'im-detail-value' }, transaction.beneficiary || '-')
        ),
        React.createElement('div', { className: 'im-detail-item' },
          React.createElement('label', null, isPositiveTransaction ? 'Description' : 'Item Description'),
          React.createElement('div', { className: 'im-detail-value' }, transaction.itemDescription || '-')
        ),
        React.createElement('div', { className: 'im-detail-item' },
          React.createElement('label', null, 'Amount'),
          React.createElement('div', { className: 'im-detail-value' }, 
            `${isPositiveTransaction ? '+' : '-'}$${transaction.amount?.toFixed(2) || '0.00'}`
          )
        ),
        !isPositiveTransaction && transaction.dateOfPurchase && React.createElement('div', { className: 'im-detail-item' },
          React.createElement('label', null, 'Purchase Date'),
          React.createElement('div', { className: 'im-detail-value' }, 
            new Date(transaction.dateOfPurchase).toLocaleDateString()
          )
        ),
        !isPositiveTransaction && transaction.invoiceNumber && React.createElement('div', { className: 'im-detail-item' },
          React.createElement('label', null, 'Invoice Number'),
          React.createElement('div', { className: 'im-detail-value' }, transaction.invoiceNumber)
        ),
        transaction.flightNumber && React.createElement('div', { className: 'im-detail-item' },
          React.createElement('label', null, 'Flight Number'),
          React.createElement('div', { className: 'im-detail-value' }, transaction.flightNumber)
        ),
        transaction.numberOfLuggage && React.createElement('div', { className: 'im-detail-item' },
          React.createElement('label', null, 'Number of Luggage'),
          React.createElement('div', { className: 'im-detail-value' }, transaction.numberOfLuggage)
        ),
        transaction.bdNumber && React.createElement('div', { className: 'im-detail-item' },
          React.createElement('label', null, 'BD Number'),
          React.createElement('div', { className: 'im-detail-value' }, transaction.bdNumber)
        ),
        transaction.observations && React.createElement('div', { className: 'im-detail-item im-full-width' },
          React.createElement('label', null, 'Observations'),
          React.createElement('div', { className: 'im-detail-value' }, transaction.observations)
        )
      )
    );
  };
  
  // BD Number Modal - isolated
  IM.BDNumberModal = function({ isOpen, onClose, onConfirm, count }) {
    const [bdNumber, setBdNumber] = React.useState('');
    const [error, setError] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    
    React.useEffect(() => {
      if (isOpen) {
        setBdNumber('');
        setError('');
        setLoading(false);
      }
    }, [isOpen]);
    
    const handleSubmit = async () => {
      if (!bdNumber.trim()) {
        setError('BD number is required');
        return;
      }
      
      setLoading(true);
      try {
        await onConfirm(bdNumber.trim());
        onClose();
      } catch (err) {
        setError('Failed to assign BD number. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    const actions = React.createElement('div', { className: 'im-modal-actions' },
      React.createElement('button', {
        className: 'im-btn im-btn-secondary',
        onClick: onClose,
        disabled: loading
      }, 'Cancel'),
      React.createElement('button', {
        className: 'im-btn im-btn-primary',
        onClick: handleSubmit,
        disabled: loading || !bdNumber.trim()
      }, loading ? 'Assigning...' : 'Assign BD Number')
    );
    
    const titleWithIcon = React.createElement('div', {
      'data-icon': 'document'
    }, `Assign BD Number to ${count || 0} Transaction${(count || 0) !== 1 ? 's' : ''}`);
    
    return React.createElement(IM.BaseModal, {
      isOpen,
      onClose,
      title: titleWithIcon,
      size: 'small',
      actions
    },
      React.createElement('div', { className: 'im-form-field' },
        React.createElement('label', { 
          className: 'im-form-label',
          'data-icon': 'document'
        }, 'BD Number', React.createElement('span', { className: 'im-required' }, ' *')),
        React.createElement('input', {
          type: 'text',
          value: bdNumber || '',
          onChange: (e) => setBdNumber(e.target.value),
          className: `im-form-input ${error ? 'im-error' : ''}`,
          placeholder: 'Enter BD number (e.g., BD-2025-001)',
          required: true
        }),
        error && React.createElement('div', { className: 'im-form-error' }, error)
      )
    );
  };
  
  // Admin Panel Modal - isolated with real-time updates
  IM.AdminPanelModal = function({ isOpen, onClose }) {
    const [users, setUsers] = React.useState([]);
    const [newUser, setNewUser] = React.useState({ username: '', password: '' });
    const [loading, setLoading] = React.useState(false);
    const [errors, setErrors] = React.useState({});
    
    // Real-time user list management
    React.useEffect(() => {
      if (isOpen && window.wsManager) {
        // Request fresh users list
        window.wsManager.emit('admin_get_users');
        
        const handleUsersList = (data) => {
          setUsers(data.users || []);
          setLoading(false);
        };
        
        const handleUserCreated = (data) => {
          if (data.success) {
            setUsers(prev => [...prev, data.user]);
            setNewUser({ username: '', password: '' });
            setErrors({});
          }
        };
        
        const handleUserDeleted = (data) => {
          if (data.success) {
            setUsers(prev => prev.filter(user => user.id !== data.userId));
          }
        };
        
        // Listen for real-time updates
        window.wsManager.on('users_list', handleUsersList);
        window.wsManager.on('user_created', handleUserCreated);
        window.wsManager.on('user_deleted', handleUserDeleted);
        
        return () => {
          // Clean up listeners (in production you'd want proper cleanup)
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
    
    const handleCreateUser = async () => {
      if (!newUser.username.trim() || !newUser.password.trim()) {
        setErrors({ general: 'Username and password are required' });
        return;
      }
      
      setLoading(true);
      setErrors({});
      
      if (window.wsManager) {
        window.wsManager.emit('admin_create_user', newUser);
        // Response handled by listener above
      }
      
      setTimeout(() => setLoading(false), 1000);
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
    
    const titleWithIcon = React.createElement('div', {
      'data-icon': 'settings'
    }, 'Admin Panel - User Management');
    
    return React.createElement(IM.BaseModal, {
      isOpen,
      onClose,
      title: titleWithIcon,
      size: 'large'
    },
      React.createElement('div', { className: 'im-admin-content' },
        React.createElement('div', { className: 'im-admin-section' },
          React.createElement('h4', null, 'Create New User'),
          errors.general && React.createElement('div', { className: 'im-form-error im-general-error' }, errors.general),
          React.createElement('div', { className: 'im-form-row' },
            React.createElement('div', { className: 'im-form-field' },
              React.createElement('label', { 
                className: 'im-form-label',
                'data-icon': 'user'
              }, 'Username', React.createElement('span', { className: 'im-required' }, ' *')),
              React.createElement('input', {
                type: 'text',
                value: newUser.username || '',
                onChange: (e) => setNewUser(prev => ({ ...prev, username: e.target.value })),
                className: 'im-form-input',
                required: true
              })
            ),
            React.createElement('div', { className: 'im-form-field' },
              React.createElement('label', { 
                className: 'im-form-label',
                'data-icon': 'password'
              }, 'Password', React.createElement('span', { className: 'im-required' }, ' *')),
              React.createElement('div', { className: 'im-password-input' },
                React.createElement('input', {
                  type: 'text',
                  value: newUser.password,
                  onChange: (e) => setNewUser(prev => ({ ...prev, password: e.target.value })),
                  className: 'im-form-input',
                  required: true
                }),
                React.createElement('button', {
                  type: 'button',
                  onClick: generatePassword,
                  className: 'im-btn im-btn-sm im-btn-secondary',
                  'data-icon': 'generate'
                }, 'Generate')
              )
            )
          ),
          React.createElement('button', {
            onClick: handleCreateUser,
            className: 'im-btn im-btn-primary',
            disabled: loading
          }, loading ? 'Creating...' : 'Create User')
        ),
        React.createElement('div', { className: 'im-admin-section' },
          React.createElement('h4', null, `Manage Users (${users.length})`),
          React.createElement('div', { className: 'im-user-list' },
            users.map(user => 
              React.createElement('div', { key: user.id, className: 'im-user-item' },
                React.createElement('div', { className: 'im-user-info' },
                  React.createElement('span', { className: 'im-user-name' }, user.username),
                  React.createElement('span', { className: 'im-user-meta' }, 
                    user.lastLogin ? `Last: ${new Date(user.lastLogin).toLocaleDateString()}` : 'Never logged in'
                  )
                ),
                React.createElement('div', { className: 'im-user-actions' },
                  React.createElement('button', {
                    onClick: () => handleResetPassword(user.id),
                    className: 'im-btn im-btn-sm im-btn-warning'
                  }, 'Reset Password'),
                  React.createElement('button', {
                    onClick: () => handleDeleteUser(user.id),
                    className: 'im-btn im-btn-sm im-btn-danger'
                  }, 'Delete')
                )
              )
            )
          )
        )
      )
    );
  };
  
  // Export all components to window with unique namespace
  window.IsolatedModals.BaseModal = IM.BaseModal;
  window.IsolatedModals.AddFundsModal = IM.AddFundsModal;
  window.IsolatedModals.TransactionFormModal = IM.TransactionFormModal;
  window.IsolatedModals.TransactionDetailsModal = IM.TransactionDetailsModal;
  window.IsolatedModals.BDNumberModal = IM.BDNumberModal;
  window.IsolatedModals.AdminPanelModal = IM.AdminPanelModal;
  
})();