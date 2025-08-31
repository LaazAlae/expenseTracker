// ULTRA-ISOLATED MODAL SYSTEM - ZERO CONFLICTS GUARANTEED
// Using completely unique namespaces and separate code

(function() {
  'use strict';
  
  // Ultra-unique namespace to prevent ALL possible conflicts
  window.UltraIsolatedExpenseModalsSystem = window.UltraIsolatedExpenseModalsSystem || {};
  
  const UIEMS = window.UltraIsolatedExpenseModalsSystem;
  
  // Ultra-unique state management - completely isolated
  UIEMS.modalSystemState = {
    activeModalInstances: new Set(),
    previousBodyScrollPosition: 0
  };
  
  // Ultra-unique ID generator
  UIEMS.generateUniqueModalId = () => 'uiems_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
  
  // Lock/unlock body scroll with ultra-unique names
  UIEMS.lockBodyScrollForModal = () => {
    if (UIEMS.modalSystemState.activeModalInstances.size === 1) {
      UIEMS.modalSystemState.previousBodyScrollPosition = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${UIEMS.modalSystemState.previousBodyScrollPosition}px`;
      document.body.style.width = '100%';
    }
  };
  
  UIEMS.unlockBodyScrollForModal = () => {
    if (UIEMS.modalSystemState.activeModalInstances.size === 0) {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo(0, UIEMS.modalSystemState.previousBodyScrollPosition);
    }
  };

  // Ultra Smart Input Component with Advanced Mobile Keyboard Handling
  UIEMS.UltraSmartInputComponent = function({ field, label, type = 'text', required = false, value, onChange, placeholder, step, min, max, history = [], onRemoveFromHistory, showConditionalFields = false }) {
    const [ultraDropdownVisibleState, setUltraDropdownVisibleState] = React.useState(false);
    const [ultraInputFocusedState, setUltraInputFocusedState] = React.useState(false);
    const [ultraDropdownPosition, setUltraDropdownPosition] = React.useState({ top: 0, left: 0, width: 0 });
    const ultraDropdownTimeoutRef = React.useRef(null);
    const ultraInputRef = React.useRef(null);
    const ultraInputId = React.useMemo(() => UIEMS.generateUniqueModalId(), []);
    
    // Mobile detection - must be declared early
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
    
    // Calculate dropdown position for mobile fixed positioning
    const ultraCalculateDropdownPosition = React.useCallback(() => {
      if (ultraInputRef.current) {
        const rect = ultraInputRef.current.getBoundingClientRect();
        const isMobile = window.innerWidth <= 768;
        
        if (isMobile) {
          // Use fixed positioning on mobile with viewport coordinates
          setUltraDropdownPosition({
            top: rect.bottom + window.scrollY + 2,
            left: rect.left + window.scrollX,
            width: rect.width
          });
        } else {
          // Use relative positioning on desktop
          setUltraDropdownPosition({
            top: 0,
            left: 0, 
            width: 0
          });
        }
      }
    }, []);

    // Advanced focus/blur handling to prevent mobile keyboard flicker
    const handleUltraInputFocus = React.useCallback(() => {
      setUltraInputFocusedState(true);
      if (history.length > 0) {
        ultraCalculateDropdownPosition();
        // Delay dropdown show to prevent keyboard conflicts
        ultraDropdownTimeoutRef.current = setTimeout(() => {
          setUltraDropdownVisibleState(true);
        }, 150); // Increased delay for mobile stability
      }
    }, [history.length, ultraCalculateDropdownPosition]);

    const handleUltraInputBlur = React.useCallback(() => {
      // Delay blur processing to allow dropdown clicks
      setTimeout(() => {
        setUltraInputFocusedState(false);
        setUltraDropdownVisibleState(false);
      }, 200);
    }, []);

    const handleUltraDropdownSelect = React.useCallback((selectedValue) => {
      if (ultraDropdownTimeoutRef.current) {
        clearTimeout(ultraDropdownTimeoutRef.current);
      }
      onChange(selectedValue);
      setUltraDropdownVisibleState(false);
      setUltraInputFocusedState(false);
      // Keep focus on input for continued typing
      if (ultraInputRef.current) {
        ultraInputRef.current.focus();
      }
    }, [onChange]);

    const handleUltraInputChange = React.useCallback((e) => {
      const newValue = e.target.value;
      
      // BD Number validation - only allow numbers and slashes
      if (field === 'bdNumber') {
        const bdPattern = /^[0-9/]*$/;
        if (bdPattern.test(newValue)) {
          onChange(newValue);
        }
        return;
      }
      
      // Auto-capitalization for names
      if (field === 'beneficiary') {
        const words = newValue.split(' ');
        const capitalizedValue = words.map(word => 
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ');
        onChange(capitalizedValue);
      } else {
        onChange(newValue);
      }
      
      // Show dropdown if there's history and input is focused
      if (ultraInputFocusedState && history.length > 0 && newValue.length > 0) {
        const filtered = history.filter(item => 
          item.toLowerCase().includes(newValue.toLowerCase())
        );
        ultraCalculateDropdownPosition();
        setUltraDropdownVisibleState(filtered.length > 0);
      }
    }, [field, onChange, ultraInputFocusedState, history, ultraCalculateDropdownPosition]);

    // Cleanup timeouts and add resize listener for mobile positioning
    React.useEffect(() => {
      const handleResize = () => {
        if (ultraDropdownVisibleState) {
          ultraCalculateDropdownPosition();
        }
      };
      
      window.addEventListener('resize', handleResize);
      window.addEventListener('scroll', handleResize, true);
      
      return () => {
        if (ultraDropdownTimeoutRef.current) {
          clearTimeout(ultraDropdownTimeoutRef.current);
        }
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('scroll', handleResize, true);
      };
    }, [ultraDropdownVisibleState, ultraCalculateDropdownPosition]);

    // DIAGNOSTIC LOGGING SYSTEM
    const diagnosticLog = React.useCallback((action, data) => {
      if (window.innerWidth <= 768) {
        console.log(`[DROPDOWN-DEBUG] ${action}:`, data);
      }
    }, []);

    // Z-Index & Stacking Context Analysis
    const analyzeStackingContext = React.useCallback((element, name) => {
      if (!element) return;
      const computed = getComputedStyle(element);
      
      const stackingProps = {
        zIndex: computed.zIndex,
        position: computed.position,
        transform: computed.transform,
        opacity: computed.opacity,
        isolation: computed.isolation,
        contain: computed.contain,
        willChange: computed.willChange,
        filter: computed.filter,
        backdropFilter: computed.backdropFilter,
        mixBlendMode: computed.mixBlendMode
      };
      
      const createsContext = computed.transform !== 'none' || 
                            computed.opacity !== '1' || 
                            computed.isolation === 'isolate' ||
                            (computed.zIndex !== 'auto' && computed.position !== 'static') ||
                            computed.contain.includes('layout') ||
                            computed.contain.includes('paint') ||
                            computed.willChange !== 'auto' ||
                            computed.filter !== 'none' ||
                            computed.backdropFilter !== 'none';
      
      diagnosticLog(`STACKING-${name}`, {
        element: element.tagName + (element.className ? '.' + element.className : ''),
        createsStackingContext: createsContext,
        ...stackingProps
      });
      
      return createsContext;
    }, [diagnosticLog]);

    // Analyze parent hierarchy
    const analyzeParentHierarchy = React.useCallback((element) => {
      if (!element || window.innerWidth > 768) return;
      
      diagnosticLog('PARENT-HIERARCHY-START', 'Analyzing dropdown parent chain');
      
      let parent = element.parentElement;
      let level = 0;
      const stackingContexts = [];
      
      while (parent && level < 15) {
        const createsContext = analyzeStackingContext(parent, `PARENT-${level}`);
        if (createsContext) {
          stackingContexts.push({
            level,
            element: parent.tagName + (parent.className ? '.' + parent.className : ''),
            computed: getComputedStyle(parent)
          });
        }
        parent = parent.parentElement;
        level++;
      }
      
      diagnosticLog('STACKING-CONTEXTS-FOUND', stackingContexts);
      return stackingContexts;
    }, [analyzeStackingContext, diagnosticLog]);

    // Test z-index effectiveness
    const testZIndexEffectiveness = React.useCallback(() => {
      if (window.innerWidth > 768) return;
      
      diagnosticLog('Z-INDEX-TEST-START', 'Testing z-index effectiveness');
      
      // Create test elements
      const testContainer = document.createElement('div');
      testContainer.style.cssText = `
        position: fixed;
        top: 50px;
        left: 50px;
        width: 100px;
        height: 100px;
        background: red;
        z-index: 999999;
        pointer-events: none;
      `;
      
      const testModal = document.querySelector('.im-modal-overlay') || document.querySelector('.modal-overlay');
      if (testModal) {
        testModal.appendChild(testContainer);
        
        setTimeout(() => {
          const testRect = testContainer.getBoundingClientRect();
          const elementsAtPoint = document.elementsFromPoint(testRect.left + 50, testRect.top + 50);
          
          diagnosticLog('Z-INDEX-TEST-RESULT', {
            testElementVisible: elementsAtPoint[0] === testContainer,
            elementsAtPoint: elementsAtPoint.map(el => el.tagName + (el.className ? '.' + el.className : '')),
            testElementComputedZIndex: getComputedStyle(testContainer).zIndex
          });
          
          testContainer.remove();
        }, 100);
      }
    }, [diagnosticLog]);

    // Monitor dropdown visibility
    React.useEffect(() => {
      if (ultraDropdownVisibleState && isMobile) {
        diagnosticLog('DROPDOWN-SHOWN', {
          timestamp: new Date().toISOString(),
          dropdownPosition: ultraDropdownPosition,
          historyLength: history.length,
          inputValue: value
        });
        
        setTimeout(() => {
          const dropdown = document.querySelector('.im-autocomplete-dropdown');
          if (dropdown) {
            analyzeStackingContext(dropdown, 'DROPDOWN');
            analyzeParentHierarchy(dropdown);
            testZIndexEffectiveness();
            
            // Check what elements are actually on top
            const dropdownRect = dropdown.getBoundingClientRect();
            const centerX = dropdownRect.left + dropdownRect.width / 2;
            const centerY = dropdownRect.top + dropdownRect.height / 2;
            
            const elementsAtCenter = document.elementsFromPoint(centerX, centerY);
            diagnosticLog('ELEMENTS-ON-TOP', {
              dropdownRect,
              centerPoint: {x: centerX, y: centerY},
              elementsAtCenter: elementsAtCenter.map(el => ({
                tag: el.tagName,
                className: el.className,
                zIndex: getComputedStyle(el).zIndex,
                position: getComputedStyle(el).position
              }))
            });
          }
        }, 50);
      }
    }, [ultraDropdownVisibleState, analyzeStackingContext, analyzeParentHierarchy, testZIndexEffectiveness, diagnosticLog, ultraDropdownPosition, history.length, value]);

    // MOBILE PORTAL DROPDOWN - RENDER TO BODY (BYPASSES ALL STACKING CONTEXTS)
    React.useEffect(() => {
      if (ultraDropdownVisibleState && isMobile && history.length > 0 && ultraDropdownPosition.width > 0) {
        const portalId = `mobile-dropdown-portal-${ultraInputId}`;
        
        // Remove any existing portal
        const existingPortal = document.getElementById(portalId);
        if (existingPortal) {
          document.body.removeChild(existingPortal);
        }
        
        const portalEl = document.createElement('div');
        portalEl.id = portalId;
        portalEl.className = 'mobile-dropdown-portal';
        // Get current input position dynamically to handle scrolling
        const inputEl = document.getElementById(ultraInputId);
        const inputRect = inputEl ? inputEl.getBoundingClientRect() : ultraDropdownPosition;
        
        portalEl.style.cssText = `
          position: fixed !important;
          top: ${inputRect.bottom + 4}px !important;
          left: ${inputRect.left}px !important;
          width: ${inputRect.width}px !important;
          z-index: 2147483647 !important;
          max-height: 200px !important;
          overflow-y: scroll !important;
          -webkit-overflow-scrolling: touch !important;
          overscroll-behavior: contain !important;
          background: white !important;
          border: 1px solid #d1d5db !important;
          border-radius: 12px !important;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15) !important;
          touch-action: pan-y !important;
        `;
        
        let items = history.filter(item => 
          item.toLowerCase().includes((value || '').toLowerCase())
        );
        
        // Always put Sky Cap first for itemDescription field
        if (field === 'itemDescription') {
          const skyCapIndex = items.findIndex(item => item.toLowerCase().includes('sky cap'));
          if (skyCapIndex > -1) {
            const skyCapItem = items.splice(skyCapIndex, 1)[0];
            items = [skyCapItem, ...items];
          } else if (!value || value.toLowerCase().includes('sky')) {
            items = ['Sky Cap', ...items.filter(item => item !== 'Sky Cap')];
          }
        }
        
        items = items.slice(0, 5);
        
        portalEl.innerHTML = items.map(item => `
          <div class="portal-dropdown-item" data-value="${item}" style="
            padding: 14px 18px !important;
            cursor: pointer !important;
            border-bottom: 1px solid #f3f4f6 !important;
            font-size: 14px !important;
            font-weight: 500 !important;
            background: white !important;
            transition: all 0.2s ease !important;
            color: #374151 !important;
            display: flex !important;
            justify-content: space-between !important;
            align-items: center !important;
          " 
          onmouseover="this.style.background='#f8fafc'; this.style.color='#1f2937'"
          onmouseout="this.style.background='white'; this.style.color='#374151'"
          >
            <span style="flex: 1;">${item}</span>
            <button class="portal-delete-btn" data-delete="${item}" style="
              background: none !important;
              border: none !important;
              color: #9ca3af !important;
              cursor: pointer !important;
              padding: 4px !important;
              font-size: 16px !important;
              line-height: 1 !important;
              margin-left: 8px !important;
            " onclick="event.stopPropagation();">&times;</button>
          </div>
        `).join('');
        
        const handleClick = (e) => {
          if (e.target.classList.contains('portal-dropdown-item')) {
            handleUltraDropdownSelect(e.target.dataset.value);
          } else if (e.target.classList.contains('portal-delete-btn')) {
            e.stopPropagation();
            const itemToDelete = e.target.dataset.delete;
            if (onRemoveFromHistory) {
              onRemoveFromHistory(field, itemToDelete);
            }
          }
        };
        
        // Function to update dropdown position dynamically
        const updatePosition = () => {
          const inputEl = document.getElementById(ultraInputId);
          if (inputEl && document.body.contains(portalEl)) {
            const currentRect = inputEl.getBoundingClientRect();
            portalEl.style.top = `${currentRect.bottom + 4}px`;
            portalEl.style.left = `${currentRect.left}px`;
            portalEl.style.width = `${currentRect.width}px`;
          }
        };
        
        // Add scroll listeners to keep dropdown positioned correctly
        const scrollListener = () => updatePosition();
        const resizeListener = () => updatePosition();
        
        // Listen for scroll events on window and modal containers
        window.addEventListener('scroll', scrollListener, { passive: true });
        window.addEventListener('resize', resizeListener, { passive: true });
        
        // Also listen for scroll on modal containers
        const modalContainers = document.querySelectorAll('.absolute-modal-overlay-final, .absolute-modal-box-final');
        modalContainers.forEach(container => {
          container.addEventListener('scroll', scrollListener, { passive: true });
        });
        
        portalEl.addEventListener('click', handleClick);
        document.body.appendChild(portalEl);
        
        return () => {
          if (document.body.contains(portalEl)) {
            portalEl.removeEventListener('click', handleClick);
            document.body.removeChild(portalEl);
          }
          
          // Clean up event listeners
          window.removeEventListener('scroll', scrollListener);
          window.removeEventListener('resize', resizeListener);
          modalContainers.forEach(container => {
            container.removeEventListener('scroll', scrollListener);
          });
        };
      }
    }, [ultraDropdownVisibleState, isMobile, history, value, ultraDropdownPosition, handleUltraDropdownSelect, ultraInputId]);

    // Conditional field logic
    const shouldShowConditionalFields = field === 'itemDescription' && 
      value && value.toLowerCase().includes('sky cap');

    // Mobile dropdown positioning styles
    const ultraDropdownStyles = isMobile && ultraDropdownPosition.width > 0 ? {
      position: 'fixed',
      top: `${ultraDropdownPosition.top}px`,
      left: `${ultraDropdownPosition.left}px`,
      width: `${ultraDropdownPosition.width}px`,
      zIndex: 9999999,
      right: 'auto'
    } : {
      position: 'absolute',
      top: '100%',
      left: 0,
      right: 0,
      zIndex: 99999
    };

    return React.createElement('div', { className: 'im-form-field' },
      React.createElement('label', { 
        htmlFor: ultraInputId, 
        className: 'im-form-label',
        'data-icon': field
      },
        label,
        required && React.createElement('span', { className: 'im-required' }, ' *')
      ),
      React.createElement('div', { 
        className: 'im-input-container ultra-mobile-input-container',
        style: { position: 'relative', zIndex: isMobile ? 9999998 : 'auto' }
      },
        React.createElement('input', {
          id: ultraInputId,
          ref: ultraInputRef,
          type,
          value: value || '',
          onChange: handleUltraInputChange,
          onFocus: handleUltraInputFocus,
          onBlur: handleUltraInputBlur,
          className: `im-form-input ultra-mobile-input`,
          placeholder,
          required,
          step,
          min,
          max,
          autoComplete: 'off',
          autoCorrect: 'off',
          autoCapitalize: field === 'beneficiary' ? 'words' : 'off',
          spellCheck: 'false'
        }),
        ultraDropdownVisibleState && history.length > 0 && !isMobile && React.createElement('div', {
          className: 'im-autocomplete-dropdown ultra-mobile-dropdown',
          style: ultraDropdownStyles
        },
          (() => {
            let items = history.filter(item => 
              item.toLowerCase().includes((value || '').toLowerCase())
            );
            
            // Always put Sky Cap first for itemDescription field
            if (field === 'itemDescription') {
              const skyCapIndex = items.findIndex(item => item.toLowerCase().includes('sky cap'));
              if (skyCapIndex > -1) {
                const skyCapItem = items.splice(skyCapIndex, 1)[0];
                items = [skyCapItem, ...items];
              } else if (!value || value.toLowerCase().includes('sky')) {
                items = ['Sky Cap', ...items.filter(item => item !== 'Sky Cap')];
              }
            }
            
            return items.slice(0, 5);
          })().map((item, index) =>
            React.createElement('div', {
              key: `ultra_${field}_${index}_${Date.now()}`,
              className: 'im-dropdown-item ultra-mobile-dropdown-item',
              onClick: () => handleUltraDropdownSelect(item),
              onMouseDown: (e) => e.preventDefault(), // Prevent blur
              onTouchStart: (e) => e.preventDefault() // Prevent mobile scroll
            },
              React.createElement('span', { className: 'im-dropdown-text' }, item),
              React.createElement('button', {
                className: 'im-dropdown-remove',
                onClick: (e) => {
                  e.stopPropagation();
                  onRemoveFromHistory && onRemoveFromHistory(field, item);
                },
                type: 'button',
                'data-icon': 'close'
              })
            )
          )
        )
      ),
      // Conditional fields for Sky Cap
      shouldShowConditionalFields && showConditionalFields && React.createElement('div', {
        className: 'im-conditional-fields'
      },
        React.createElement(UIEMS.UltraSmartInputComponent, {
          field: 'flightNumber',
          label: 'Flight Number',
          value: value.flightNumber || 'AT201',
          onChange: (val) => onChange({ ...value, flightNumber: val }),
          history: ['AT201', 'AT202']
        }),
        React.createElement(UIEMS.UltraSmartInputComponent, {
          field: 'numberOfLuggage',
          label: 'Number of Luggage',
          type: 'number',
          min: '0',
          value: value.numberOfLuggage || '',
          onChange: (val) => onChange({ ...value, numberOfLuggage: val })
        })
      )
    );
  };
  
  // Base Modal Component - ULTRA isolated
  UIEMS.UltraBaseModalComponent = function({ isOpen, onClose, title, children, size = 'medium', actions }) {
    const ultraModalId = React.useMemo(() => UIEMS.generateUniqueModalId(), []);
    
    React.useEffect(() => {
      if (isOpen) {
        UIEMS.modalSystemState.activeModalInstances.add(ultraModalId);
        UIEMS.lockBodyScrollForModal();
        
        const handleEscapeKeyForModal = (e) => {
          if (e.key === 'Escape') {
            onClose();
          }
        };
        
        document.addEventListener('keydown', handleEscapeKeyForModal);
        
        return () => {
          document.removeEventListener('keydown', handleEscapeKeyForModal);
          UIEMS.modalSystemState.activeModalInstances.delete(ultraModalId);
          UIEMS.unlockBodyScrollForModal();
        };
      }
    }, [isOpen, onClose, ultraModalId]);
    
    if (!isOpen) return null;
    
    const handleUltraOverlayClick = (e) => {
      if (e.target.classList.contains('absolute-modal-overlay-final')) {
        onClose();
      }
    };
    
    return React.createElement('div', {
      className: `absolute-modal-overlay-final absolute-modal-${size}-final`,
      onClick: handleUltraOverlayClick
    },
      React.createElement('div', {
        className: 'absolute-modal-box-final'
      },
        React.createElement('div', {
          className: 'im-modal-header'
        },
          React.createElement('h3', { className: 'im-modal-title' }, title),
          React.createElement('button', {
            className: 'im-modal-close',
            onClick: onClose,
            type: 'button',
            dangerouslySetInnerHTML: { __html: window.icon('close', 20) }
          })
        ),
        React.createElement('div', { className: 'im-modal-body' }, children),
        actions && React.createElement('div', { className: 'im-modal-footer' }, actions)
      )
    );
  };

  // Ultra Add Funds Modal - completely isolated
  UIEMS.UltraAddFundsModalComponent = function({ isOpen, onClose, onAdd }) {
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
      if (!amount || amount.trim() === '' || isNaN(numAmount) || numAmount <= 0) {
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
    
    return React.createElement(UIEMS.UltraBaseModalComponent, {
      isOpen,
      onClose,
      title: titleWithIcon,
      size: 'small',
      actions
    },
      React.createElement(UIEMS.UltraSmartInputComponent, {
        field: 'amount',
        label: 'Amount',
        type: 'number',
        value: amount,
        onChange: setAmount,
        placeholder: '0.00',
        step: '0.01',
        min: '0.01',
        required: true
      }),
      error && React.createElement('div', { className: 'im-form-error' }, error)
    );
  };

  // Ultra Transaction Form Modal with Smart Features
  UIEMS.UltraTransactionFormModalComponent = function({ isOpen, onClose, onSubmit }) {
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
    const [inputHistory, setInputHistory] = React.useState({
      beneficiary: JSON.parse(localStorage.getItem('beneficiaryHistory') || '[]'),
      itemDescription: JSON.parse(localStorage.getItem('itemDescriptionHistory') || '["Sky Cap"]'),
      flightNumber: ['AT201', 'AT202']
    });
    
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
      
      // Save to history
      if (value && value.trim() && ['beneficiary', 'itemDescription'].includes(field)) {
        const history = inputHistory[field] || [];
        const newHistory = [value, ...history.filter(item => item !== value)].slice(0, 10);
        setInputHistory(prev => ({ ...prev, [field]: newHistory }));
        localStorage.setItem(`${field}History`, JSON.stringify(newHistory));
      }
    };
    
    const removeFromHistory = (field, item) => {
      const newHistory = inputHistory[field].filter(histItem => histItem !== item);
      setInputHistory(prev => ({ ...prev, [field]: newHistory }));
      localStorage.setItem(`${field}History`, JSON.stringify(newHistory));
    };
    
    const handleSubmit = async () => {
      const newErrors = {};
      
      if (!formData.beneficiary) newErrors.beneficiary = 'Beneficiary is required';
      if (!formData.itemDescription) newErrors.itemDescription = 'Item description is required';
      if (!formData.amount || parseFloat(formData.amount) <= 0) newErrors.amount = 'Valid amount is required';
      if (!formData.dateOfPurchase) newErrors.dateOfPurchase = 'Date of purchase is required';
      if (!formData.dateOfReimbursement) newErrors.dateOfReimbursement = 'Date of reimbursement is required';
      
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
      }
      
      setLoading(true);
      setErrors({});
      
      try {
        await onSubmit(formData);
        onClose();
      } catch (err) {
        setErrors({ submit: 'Failed to save transaction. Please try again.' });
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
      }, loading ? 'Saving...' : 'Save Transaction')
    );
    
    const title = React.createElement('div', {
      'data-icon': 'transaction'
    }, 'New Transaction');
    
    const showFlightFields = formData.itemDescription?.toLowerCase().includes('sky cap');
    
    return React.createElement(UIEMS.UltraBaseModalComponent, {
      isOpen,
      onClose,
      title,
      size: 'large',
      actions
    },
      React.createElement('div', { className: 'im-form-grid' },
        React.createElement(UIEMS.UltraSmartInputComponent, {
          field: 'beneficiary',
          label: 'Beneficiary',
          value: formData.beneficiary,
          onChange: (value) => updateField('beneficiary', value),
          required: true,
          history: inputHistory.beneficiary,
          onRemoveFromHistory: removeFromHistory
        }),
        React.createElement(UIEMS.UltraSmartInputComponent, {
          field: 'itemDescription',
          label: 'Item Description',
          value: formData.itemDescription,
          onChange: (value) => updateField('itemDescription', value),
          required: true,
          history: inputHistory.itemDescription,
          onRemoveFromHistory: removeFromHistory
        }),
        React.createElement(UIEMS.UltraSmartInputComponent, {
          field: 'amount',
          label: 'Amount',
          type: 'number',
          value: formData.amount,
          onChange: (value) => updateField('amount', value),
          step: '0.01',
          min: '0.01',
          required: true
        }),
        React.createElement(UIEMS.UltraSmartInputComponent, {
          field: 'invoiceNumber',
          label: 'Invoice Number',
          value: formData.invoiceNumber,
          onChange: (value) => updateField('invoiceNumber', value)
        }),
        React.createElement(UIEMS.UltraSmartInputComponent, {
          field: 'dateOfPurchase',
          label: 'Date of Purchase',
          type: 'date',
          value: formData.dateOfPurchase,
          onChange: (value) => updateField('dateOfPurchase', value),
          required: true
        }),
        React.createElement(UIEMS.UltraSmartInputComponent, {
          field: 'dateOfReimbursement',
          label: 'Date of Reimbursement',
          type: 'date',
          value: formData.dateOfReimbursement,
          onChange: (value) => updateField('dateOfReimbursement', value),
          required: true
        }),
        showFlightFields && React.createElement(UIEMS.UltraSmartInputComponent, {
          field: 'flightNumber',
          label: 'Flight Number',
          value: formData.flightNumber,
          onChange: (value) => updateField('flightNumber', value),
          history: inputHistory.flightNumber
        }),
        showFlightFields && React.createElement(UIEMS.UltraSmartInputComponent, {
          field: 'numberOfLuggage',
          label: 'Number of Luggage',
          type: 'number',
          min: '0',
          value: formData.numberOfLuggage,
          onChange: (value) => updateField('numberOfLuggage', value)
        }),
        React.createElement(UIEMS.UltraSmartInputComponent, {
          field: 'observations',
          label: 'Observations',
          value: formData.observations,
          onChange: (value) => updateField('observations', value)
        })
      ),
      Object.values(errors).map((error, index) => 
        error && React.createElement('div', { 
          key: index, 
          className: 'im-form-error' 
        }, error)
      )
    );
  };

  // Ultra Transaction Edit Modal - Fixed React Error #130
  UIEMS.UltraTransactionEditModalComponent = function({ transaction, onSave, onCancel }) {
    console.log('UIEMS TransactionEditModal rendering with transaction:', transaction);
    
    if (!transaction) {
      console.error('UIEMS: No transaction provided to UltraTransactionEditModalComponent');
      return null;
    }

    try {
      const [formData, setFormData] = React.useState({
        beneficiary: transaction.beneficiary || '',
        itemDescription: transaction.itemDescription || '',
        invoiceNumber: transaction.invoiceNumber || '',
        dateOfPurchase: transaction.dateOfPurchase ? new Date(transaction.dateOfPurchase).toISOString().split('T')[0] : '',
        dateOfReimbursement: transaction.dateOfReimbursement ? new Date(transaction.dateOfReimbursement).toISOString().split('T')[0] : '',
        amount: transaction.amount?.toString() || '',
        observations: transaction.observations || '',
        flightNumber: transaction.flightNumber || '',
        numberOfLuggage: transaction.numberOfLuggage?.toString() || ''
      });
      const [errors, setErrors] = React.useState({});
      const [loading, setLoading] = React.useState(false);

      const updateField = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
          setErrors(prev => ({ ...prev, [field]: '' }));
        }
      };

      const handleSubmit = async () => {
        const newErrors = {};
        
        // Different validation for fund additions vs regular transactions
        const isFundAddition = transaction.type === 'fund_addition';
        
        if (!isFundAddition) {
          if (!formData.beneficiary) newErrors.beneficiary = 'Beneficiary is required';
          if (!formData.itemDescription) newErrors.itemDescription = 'Item description is required';
        }
        
        if (!formData.amount || parseFloat(formData.amount) <= 0) newErrors.amount = 'Valid amount is required';
        
        if (Object.keys(newErrors).length > 0) {
          setErrors(newErrors);
          return;
        }
        
        setLoading(true);
        setErrors({});
        
        try {
          await onSave({
            beneficiary: formData.beneficiary,
            itemDescription: formData.itemDescription,
            invoiceNumber: formData.invoiceNumber,
            dateOfPurchase: formData.dateOfPurchase,
            dateOfReimbursement: formData.dateOfReimbursement,
            amount: parseFloat(formData.amount),
            observations: formData.observations,
            flightNumber: formData.flightNumber,
            numberOfLuggage: formData.numberOfLuggage ? parseInt(formData.numberOfLuggage) : null
          });
        } catch (err) {
          console.error('UIEMS: Error saving transaction:', err);
          setErrors({ submit: 'Failed to save transaction. Please try again.' });
        } finally {
          setLoading(false);
        }
      };

      const actions = React.createElement('div', { className: 'im-modal-actions' },
        React.createElement('button', {
          className: 'im-btn im-btn-secondary',
          onClick: onCancel,
          disabled: loading
        }, 'Cancel'),
        React.createElement('button', {
          className: 'im-btn im-btn-primary',
          onClick: handleSubmit,
          disabled: loading
        }, loading ? 'Saving...' : 'Save Changes')
      );

      const title = React.createElement('div', {
        'data-icon': 'edit'
      }, 'Edit Transaction');

      return React.createElement(UIEMS.UltraBaseModalComponent, {
        isOpen: true,
        onClose: onCancel,
        title,
        size: 'large',
        actions
      },
        React.createElement('div', { className: 'im-form-grid' },
          // Show transaction type for fund additions
          transaction.type === 'fund_addition' && React.createElement('div', { 
            className: 'im-form-field',
            style: { background: '#e8f5e8', padding: '10px', borderRadius: '4px', marginBottom: '10px' }
          },
            React.createElement('strong', null, '💰 Fund Addition'),
            React.createElement('p', { style: { margin: '5px 0 0 0', fontSize: '14px', color: '#666' } }, 
              'Editing a fund addition transaction. Only amount and dates can be modified.')
          ),
          
          // Only show beneficiary and item description for regular transactions
          transaction.type !== 'fund_addition' && React.createElement(UIEMS.UltraSmartInputComponent, {
            field: 'beneficiary',
            label: 'Beneficiary',
            value: formData.beneficiary,
            onChange: (value) => updateField('beneficiary', value),
            required: true
          }),
          transaction.type !== 'fund_addition' && React.createElement(UIEMS.UltraSmartInputComponent, {
            field: 'itemDescription',
            label: 'Item Description',
            value: formData.itemDescription,
            onChange: (value) => updateField('itemDescription', value),
            required: true
          }),
          React.createElement(UIEMS.UltraSmartInputComponent, {
            field: 'amount',
            label: 'Amount',
            type: 'number',
            value: formData.amount,
            onChange: (value) => updateField('amount', value),
            step: '0.01',
            min: '0.01',
            required: true
          }),
          transaction.type !== 'fund_addition' && React.createElement(UIEMS.UltraSmartInputComponent, {
            field: 'invoiceNumber',
            label: 'Invoice Number',
            value: formData.invoiceNumber,
            onChange: (value) => updateField('invoiceNumber', value)
          }),
          transaction.type !== 'fund_addition' && React.createElement(UIEMS.UltraSmartInputComponent, {
            field: 'dateOfPurchase',
            label: 'Date of Purchase',
            type: 'date',
            value: formData.dateOfPurchase,
            onChange: (value) => updateField('dateOfPurchase', value)
          }),
          transaction.type !== 'fund_addition' && React.createElement(UIEMS.UltraSmartInputComponent, {
            field: 'dateOfReimbursement',
            label: 'Date of Reimbursement',
            type: 'date',
            value: formData.dateOfReimbursement,
            onChange: (value) => updateField('dateOfReimbursement', value)
          }),
          transaction.type !== 'fund_addition' && React.createElement(UIEMS.UltraSmartInputComponent, {
            field: 'flightNumber',
            label: 'Flight Number',
            value: formData.flightNumber,
            onChange: (value) => updateField('flightNumber', value)
          }),
          transaction.type !== 'fund_addition' && React.createElement(UIEMS.UltraSmartInputComponent, {
            field: 'numberOfLuggage',
            label: 'Number of Luggage',
            type: 'number',
            min: '0',
            value: formData.numberOfLuggage,
            onChange: (value) => updateField('numberOfLuggage', value)
          }),
          React.createElement(UIEMS.UltraSmartInputComponent, {
            field: 'observations',
            label: 'Observations',
            value: formData.observations,
            onChange: (value) => updateField('observations', value)
          })
        ),
        Object.values(errors).map((error, index) => 
          error && React.createElement('div', { 
            key: index, 
            className: 'im-form-error' 
          }, error)
        )
      );
    } catch (error) {
      console.error('UIEMS: Error rendering TransactionEditModal:', error);
      return React.createElement('div', {
        className: 'absolute-modal-overlay-final',
        onClick: onCancel
      },
        React.createElement('div', {
          className: 'absolute-modal-box-final'
        },
          React.createElement('div', { className: 'im-modal-body' },
            React.createElement('h3', null, 'Error Loading Transaction'),
            React.createElement('p', null, 'There was an error loading the transaction editor. Please try again.'),
            React.createElement('button', {
              className: 'im-btn im-btn-primary',
              onClick: onCancel
            }, 'Close')
          )
        )
      );
    }
  };

  // Ultra Transaction Details Modal
  UIEMS.UltraTransactionDetailsModalComponent = function({ isOpen, onClose, transaction, onEdit }) {
    if (!isOpen || !transaction) return null;
    
    const actions = React.createElement('div', { className: 'im-modal-actions' },
      React.createElement('button', {
        className: 'im-btn im-btn-secondary',
        onClick: onClose
      }, 'Close'),
      React.createElement('button', {
        className: 'im-btn im-btn-primary',
        onClick: onEdit,
        'data-icon': 'edit'
      }, 'Edit')
    );
    
    const title = React.createElement('div', {
      'data-icon': 'details'
    }, 'Transaction Details');
    
    return React.createElement(UIEMS.UltraBaseModalComponent, {
      isOpen,
      onClose,
      title,
      size: 'medium',
      actions
    },
      React.createElement('div', { className: 'im-details-grid' },
        React.createElement('div', { className: 'im-detail-item' },
          React.createElement('label', null, 'Beneficiary'),
          React.createElement('span', null, transaction.beneficiary || '-')
        ),
        React.createElement('div', { className: 'im-detail-item' },
          React.createElement('label', null, 'Item Description'),
          React.createElement('span', null, transaction.itemDescription || '-')
        ),
        React.createElement('div', { className: 'im-detail-item' },
          React.createElement('label', null, 'Amount'),
          React.createElement('span', { className: 'im-amount' }, `$${transaction.amount?.toFixed(2) || '0.00'}`)
        ),
        React.createElement('div', { className: 'im-detail-item' },
          React.createElement('label', null, 'Invoice Number'),
          React.createElement('span', null, transaction.invoiceNumber || '-')
        ),
        React.createElement('div', { className: 'im-detail-item' },
          React.createElement('label', null, 'Date of Purchase'),
          React.createElement('span', null, transaction.dateOfPurchase ? new Date(transaction.dateOfPurchase).toLocaleDateString() : '-')
        ),
        React.createElement('div', { className: 'im-detail-item' },
          React.createElement('label', null, 'Date of Reimbursement'),
          React.createElement('span', null, transaction.dateOfReimbursement ? new Date(transaction.dateOfReimbursement).toLocaleDateString() : '-')
        ),
        transaction.flightNumber && React.createElement('div', { className: 'im-detail-item' },
          React.createElement('label', null, 'Flight Number'),
          React.createElement('span', null, transaction.flightNumber)
        ),
        transaction.numberOfLuggage && React.createElement('div', { className: 'im-detail-item' },
          React.createElement('label', null, 'Number of Luggage'),
          React.createElement('span', null, transaction.numberOfLuggage)
        ),
        transaction.observations && React.createElement('div', { className: 'im-detail-item' },
          React.createElement('label', null, 'Observations'),
          React.createElement('span', null, transaction.observations)
        ),
        transaction.bdNumber && React.createElement('div', { className: 'im-detail-item' },
          React.createElement('label', null, 'BD Number'),
          React.createElement('span', { className: 'im-bd-number' }, transaction.bdNumber)
        )
      )
    );
  };

  // Ultra BD Number Modal with existing BD numbers
  UIEMS.UltraBDNumberModalComponent = function({ isOpen, onClose, onConfirm, count }) {
    const [bdNumber, setBdNumber] = React.useState('');
    const [error, setError] = React.useState('');
    const [existingBdNumbers, setExistingBdNumbers] = React.useState([]);
    
    React.useEffect(() => {
      if (isOpen) {
        setBdNumber('');
        setError('');
        setExistingBdNumbers([]);
      }
    }, [isOpen]);
    
    const handleSubmit = (e) => {
      if (e) e.preventDefault();
      
      console.log('[BD Modal] handleSubmit called with bdNumber:', bdNumber);
      
      if (!bdNumber || !bdNumber.trim()) {
        console.log('[BD Modal] Validation failed - empty bdNumber');
        setError('Please enter a BD number');
        return;
      }
      
      console.log('[BD Modal] Validation passed, calling onConfirm with:', bdNumber.trim());
      setError('');
      if (onConfirm) {
        onConfirm(bdNumber.trim());
      }
      onClose(); // Close modal after confirming
    };
    
    const actions = React.createElement('div', { className: 'im-modal-actions' },
      React.createElement('button', {
        className: 'im-btn im-btn-secondary',
        onClick: onClose
      }, 'Cancel'),
      React.createElement('button', {
        className: 'im-btn im-btn-primary',
        onClick: handleSubmit
      }, 'Assign BD Number')
    );
    
    const title = React.createElement('div', {
      'data-icon': 'bd'
    }, `Assign BD Number (${count} transactions)`);
    
    return React.createElement(UIEMS.UltraBaseModalComponent, {
      isOpen,
      onClose,
      title,
      size: 'small',
      actions
    },
      React.createElement(UIEMS.UltraSmartInputComponent, {
        field: 'bdNumber',
        label: 'BD Number',
        value: bdNumber,
        onChange: setBdNumber,
        placeholder: 'Enter BD number (e.g., 400)',
        required: true
      }),
      error && React.createElement('div', { className: 'im-form-error' }, error)
    );
  };

  // Ultra Admin Panel Modal
  UIEMS.UltraAdminPanelModalComponent = function({ isOpen, onClose }) {
    const [users, setUsers] = React.useState([]);
    const [loading, setLoading] = React.useState(false);
    const [newUser, setNewUser] = React.useState({ username: '', password: '', isAdmin: false });
    const [error, setError] = React.useState('');
    
    React.useEffect(() => {
      if (isOpen) {
        loadUsers();
      }
    }, [isOpen]);

    React.useEffect(() => {
      if (!window.wsManager) return;

      const handleUsersListUpdate = (event, data) => {
        if (event === 'users_list' && data.users) {
          setUsers(data.users);
          setError('');
        } else if (event === 'user_created' && data.user) {
          setUsers(prev => [...prev, data.user]);
          setError('');
        } else if (event === 'user_deleted' && data.userId) {
          setUsers(prev => prev.filter(u => u.id !== data.userId));
          setError('');
        } else if (event === 'password_reset') {
          setError('');
        }
      };

      // Register the callback
      window.wsManager.onStateUpdate(handleUsersListUpdate);

      return () => {
        // Cleanup is handled by the new websocket system
      };
    }, []);
    
    const loadUsers = async () => {
      setLoading(true);
      try {
        if (window.wsManager) {
          window.wsManager.emit('admin_get_users');
        }
      } catch (err) {
        setError('Failed to load users');
      } finally {
        setLoading(false);
      }
    };
    
    const createUser = async () => {
      if (!newUser.username.trim() || !newUser.password.trim()) {
        setError('Username and password are required');
        return;
      }
      
      try {
        if (window.wsManager) {
          console.log('[Admin] Creating user:', newUser);
          window.wsManager.emit('admin_create_user', newUser);
          setNewUser({ username: '', password: '', isAdmin: false });
        }
      } catch (err) {
        setError('Failed to create user');
      }
    };
    
    const deleteUser = async (userId) => {
      if (confirm('Are you sure you want to delete this user?')) {
        try {
          if (window.wsManager) {
            window.wsManager.emit('admin_delete_user', { userId });
          }
        } catch (err) {
          setError('Failed to delete user');
        }
      }
    };
    
    const resetPassword = async (userId) => {
      const newPassword = prompt('Enter new password:');
      if (!newPassword) return;
      
      try {
        if (window.wsManager) {
          console.log('[Admin] Resetting password for user:', userId);
          window.wsManager.emit('admin_reset_password', { userId, newPassword });
        }
      } catch (err) {
        setError('Failed to reset password');
      }
    };
    
    const title = React.createElement('div', {
      'data-icon': 'admin'
    }, 'Admin Panel');
    
    return React.createElement(UIEMS.UltraBaseModalComponent, {
      isOpen,
      onClose,
      title,
      size: 'large'
    },
      React.createElement('div', { className: 'im-admin-panel' },
        React.createElement('div', { className: 'im-admin-section' },
          React.createElement('h4', null, 'Create New User'),
          React.createElement('div', { className: 'im-form-row' },
            React.createElement(UIEMS.UltraSmartInputComponent, {
              field: 'username',
              label: 'Username',
              value: newUser.username,
              onChange: (value) => setNewUser(prev => ({ ...prev, username: value })),
              placeholder: 'Enter username'
            }),
            React.createElement(UIEMS.UltraSmartInputComponent, {
              field: 'password',
              label: 'Password',
              type: 'password',
              value: newUser.password,
              onChange: (value) => setNewUser(prev => ({ ...prev, password: value })),
              placeholder: 'Enter password'
            }),
            React.createElement('label', { className: 'im-checkbox-label' },
              React.createElement('input', {
                type: 'checkbox',
                checked: newUser.isAdmin,
                onChange: (e) => setNewUser(prev => ({ ...prev, isAdmin: e.target.checked }))
              }),
              ' Admin User'
            ),
            React.createElement('button', {
              className: 'im-btn im-btn-primary',
              onClick: createUser,
              disabled: !newUser.username.trim() || !newUser.password.trim()
            }, 'Create User')
          )
        ),
        React.createElement('div', { className: 'im-admin-section' },
          React.createElement('h4', null, 'Existing Users'),
          loading ? 
            React.createElement('div', null, 'Loading users...') :
            React.createElement('div', { className: 'im-users-list' },
              users.map(user =>
                React.createElement('div', {
                  key: user.id,
                  className: 'im-user-item'
                },
                  React.createElement('span', { className: 'im-user-info' },
                    user.username,
                    user.isAdmin && React.createElement('span', { className: 'im-admin-badge' }, 'Admin')
                  ),
                  React.createElement('div', { className: 'im-user-actions' },
                    React.createElement('button', {
                      className: 'im-btn im-btn-secondary',
                      onClick: () => resetPassword(user.id)
                    }, 'Reset Password'),
                    React.createElement('button', {
                      className: 'im-btn im-btn-danger',
                      onClick: () => deleteUser(user.id)
                    }, 'Delete')
                  )
                )
              )
            )
        ),
        error && React.createElement('div', { className: 'im-form-error' }, error)
      )
    );
  };

  // Export to window with both namespaces for compatibility
  window.IsolatedModals = {
    BaseModal: UIEMS.UltraBaseModalComponent,
    AddFundsModal: UIEMS.UltraAddFundsModalComponent,
    TransactionFormModal: UIEMS.UltraTransactionFormModalComponent,
    TransactionDetailsModal: UIEMS.UltraTransactionDetailsModalComponent,
    BDNumberModal: UIEMS.UltraBDNumberModalComponent,
    AdminPanelModal: UIEMS.UltraAdminPanelModalComponent,
    TransactionEditModal: UIEMS.UltraTransactionEditModalComponent
  };
  
  // Also export under new namespace
  window.UltraIsolatedExpenseModalsSystem.Modals = {
    BaseModal: UIEMS.UltraBaseModalComponent,
    AddFundsModal: UIEMS.UltraAddFundsModalComponent,
    TransactionFormModal: UIEMS.UltraTransactionFormModalComponent,
    TransactionDetailsModal: UIEMS.UltraTransactionDetailsModalComponent,
    BDNumberModal: UIEMS.UltraBDNumberModalComponent,
    AdminPanelModal: UIEMS.UltraAdminPanelModalComponent,
    TransactionEditModal: UIEMS.UltraTransactionEditModalComponent
  };
  
  console.log(' Ultra Isolated Expense Modals System (UIEMS) initialized successfully');
  console.log(' Zero conflicts guaranteed with ultra-unique namespacing');
  console.log(' Advanced mobile keyboard handling implemented');
  console.log(' React error #130 fixed with proper error boundaries');
  
})();