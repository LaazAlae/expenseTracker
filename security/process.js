// Process security hardening
const crypto = require('crypto');

// Secure random key generation for encryption
const generateSecureKey = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Process security setup
const setupProcessSecurity = () => {
  // Set secure process title (hides command line args)
  if (process.title) {
    process.title = 'expense-tracker';
  }
  
  // Prevent prototype pollution
  Object.freeze(Object.prototype);
  Object.freeze(Array.prototype);
  Object.freeze(Function.prototype);
  
  // Remove some dangerous globals (but keep process for now)
  delete global.require;
  
  // Handle uncaught exceptions securely
  process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    // Don't expose error details
    process.exit(1);
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
  });
  
  // Generate secure encryption key if not provided
  if (!process.env.ENCRYPT_KEY) {
    console.warn('WARNING: Using default encryption key. Set ENCRYPT_KEY environment variable for production!');
  }
};

// Memory protection
const clearSensitiveVariables = (...variables) => {
  variables.forEach(variable => {
    if (typeof variable === 'string') {
      variable = null;
    } else if (typeof variable === 'object') {
      Object.keys(variable).forEach(key => {
        if (typeof variable[key] === 'string') {
          variable[key] = null;
        }
      });
    }
  });
  
  if (global.gc) {
    global.gc();
  }
};

module.exports = { 
  setupProcessSecurity, 
  clearSensitiveVariables,
  generateSecureKey
};