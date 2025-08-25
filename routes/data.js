const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const { sanitize, sanitizeTransaction } = require('../utils/sanitizer');
const { getData, saveData } = require('../services/database');
const { broadcastUpdate } = require('../services/socket');

const router = express.Router();

// Validation rules
const budgetValidation = [
  body('budget')
    .isNumeric()
    .isFloat({ min: 0, max: 999999999 })
    .withMessage('Budget must be a valid positive number')
];

const transactionValidation = [
  body('beneficiary').trim().isLength({ min: 1, max: 100 }),
  body('itemDescription').trim().isLength({ min: 1, max: 200 }),
  body('invoiceNumber').trim().isLength({ min: 1, max: 50 }),
  body('amount').isNumeric().isFloat({ min: 0.01, max: 999999 }),
  body('dateOfReimbursement').isISO8601(),
  body('dateOfPurchase').isISO8601(),
  body('observations').optional().isLength({ max: 500 }),
  body('flightNumber').optional().isLength({ max: 20 }),
  body('numberOfLuggage').optional().isInt({ min: 1, max: 99 })
];

// Get user data
router.get('/user-data', authenticateToken, (req, res) => {
  try {
    const data = getData();
    const userData = data.userData[req.user.userId] || {
      budget: 0,
      transactions: [],
      beneficiaries: [],
      itemDescriptions: ['Sky Cap'],
      flightNumbers: ['AT200', 'AT201']
    };
    
    res.json(userData);
  } catch (err) {
    console.error('Fetch data error:', err);
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

// Update budget
router.post('/update-budget', authenticateToken, budgetValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { budget } = req.body;
    const data = getData();
    
    if (!data.userData[req.user.userId]) {
      data.userData[req.user.userId] = {
        budget: 0,
        transactions: [],
        beneficiaries: [],
        itemDescriptions: ['Sky Cap'],
        flightNumbers: ['AT200', 'AT201']
      };
    }
    
    data.userData[req.user.userId].budget = parseFloat(budget);
    await saveData();
    
    broadcastUpdate(data.userData[req.user.userId]);
    res.json({ success: true });
  } catch (err) {
    console.error('Update budget error:', err);
    res.status(500).json({ error: 'Failed to update budget' });
  }
});

// Add transaction
router.post('/add-transaction', authenticateToken, transactionValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const transaction = sanitizeTransaction({
      ...req.body,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9)
    });
    
    const data = getData();
    
    if (!data.userData[req.user.userId]) {
      data.userData[req.user.userId] = {
        budget: 0,
        transactions: [],
        beneficiaries: [],
        itemDescriptions: ['Sky Cap'],
        flightNumbers: ['AT200', 'AT201']
      };
    }
    
    const userData = data.userData[req.user.userId];
    
    // Prevent duplicate transactions
    const isDuplicate = userData.transactions.some(t => 
      t.beneficiary === transaction.beneficiary &&
      t.amount === transaction.amount &&
      t.dateOfPurchase === transaction.dateOfPurchase &&
      Math.abs(new Date(t.dateOfReimbursement) - new Date(transaction.dateOfReimbursement)) < 60000
    );
    
    if (isDuplicate) {
      return res.status(400).json({ error: 'Duplicate transaction detected' });
    }
    
    userData.transactions.push(transaction);
    
    // Update autocomplete lists (sanitized)
    if (!userData.beneficiaries.includes(transaction.beneficiary)) {
      userData.beneficiaries.push(transaction.beneficiary);
      userData.beneficiaries = userData.beneficiaries.slice(-50); // Keep last 50
    }
    
    if (!userData.itemDescriptions.includes(transaction.itemDescription)) {
      userData.itemDescriptions.push(transaction.itemDescription);
      userData.itemDescriptions = userData.itemDescriptions.slice(-50);
    }
    
    if (transaction.flightNumber && !userData.flightNumbers.includes(transaction.flightNumber)) {
      userData.flightNumbers.push(transaction.flightNumber);
      userData.flightNumbers = userData.flightNumbers.slice(-50);
    }
    
    await saveData();
    
    broadcastUpdate(userData);
    res.json({ success: true });
  } catch (err) {
    console.error('Add transaction error:', err);
    res.status(500).json({ error: 'Failed to add transaction' });
  }
});

module.exports = router;