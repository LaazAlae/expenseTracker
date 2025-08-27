const validator = require('validator');

// Basic XSS protection and sanitization
const sanitize = (input) => {
  if (typeof input !== 'string') return input;
  
  return validator.escape(input.trim());
};

// Sanitize transaction data
const sanitizeTransaction = (transaction) => {
  const formatName = (name) => {
    return name.trim().split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };
  
  return {
    id: sanitize(transaction.id),
    dateOfReimbursement: sanitize(transaction.dateOfReimbursement),
    beneficiary: formatName(sanitize(transaction.beneficiary)),
    itemDescription: sanitize(transaction.itemDescription),
    invoiceNumber: sanitize(transaction.invoiceNumber),
    dateOfPurchase: sanitize(transaction.dateOfPurchase),
    amount: parseFloat(transaction.amount),
    observations: transaction.observations ? sanitize(transaction.observations) : '',
    flightNumber: transaction.flightNumber ? sanitize(transaction.flightNumber.toUpperCase()) : undefined,
    numberOfLuggage: transaction.numberOfLuggage ? parseInt(transaction.numberOfLuggage) : undefined,
    type: transaction.type ? sanitize(transaction.type) : undefined,
    username: transaction.username ? sanitize(transaction.username) : undefined,
    bdNumber: transaction.bdNumber ? sanitize(transaction.bdNumber) : undefined
  };
};

// Validate date format
const isValidDate = (dateString) => {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date) && dateString === date.toISOString().split('T')[0];
};

// Validate amount
const isValidAmount = (amount) => {
  const num = parseFloat(amount);
  return !isNaN(num) && isFinite(num) && num >= 0 && num <= 999999;
};

module.exports = { 
  sanitize, 
  sanitizeTransaction, 
  isValidDate, 
  isValidAmount 
};