const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const { sanitize, sanitizeTransaction } = require('../utils/sanitizer');
const { getData, saveData } = require('../services/database');

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
  body('amount').isNumeric().isFloat({ min: 0.01, max: 999999999 }),
  body('dateOfReimbursement').isISO8601(),
  body('dateOfPurchase').isISO8601(),
  body('observations').optional().isLength({ max: 500 }),
  body('flightNumber').optional().isLength({ max: 20 }),
  body('numberOfLuggage').optional().isInt({ min: 1, max: 99 }),
  body('type').optional().isLength({ max: 20 }),
  body('username').optional().isLength({ max: 50 })
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
    
    const userData = data.userData[req.user.userId];
    
    // Calculate current actual balance: initial budget + all fund additions - all expenses
    const totalExpenses = userData.transactions
      .filter(t => t.type !== 'fund_addition')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalFundsAdded = userData.transactions
      .filter(t => t.type === 'fund_addition')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const currentActualBalance = userData.budget + totalFundsAdded - totalExpenses;
    const newBudget = parseFloat(budget);
    const addedAmount = newBudget - currentActualBalance;
    
    // If funds are being added (positive difference), create a fund addition transaction
    if (addedAmount > 0) {
      const fundTransaction = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        dateOfReimbursement: new Date().toISOString().split('T')[0],
        beneficiary: '-',
        itemDescription: 'Ajout de fonds',
        invoiceNumber: '-',
        dateOfPurchase: new Date().toISOString().split('T')[0],
        amount: addedAmount,
        observations: `Fonds ajoutés par ${req.user.username || 'Inconnu'} le ${new Date().toLocaleDateString('fr-FR')}`,
        flightNumber: '',
        numberOfLuggage: '',
        type: 'fund_addition',
        username: req.user.username || 'Inconnu'
      };
      
      userData.transactions.push(fundTransaction);
      
      // Update the base budget to account for the fund addition
      userData.budget += addedAmount;
    } else {
      // If no funds added, just update to the new budget
      userData.budget = newBudget;
    }
    await saveData();
    
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
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      username: req.user.username || 'Unknown'
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
    
    res.json({ success: true });
  } catch (err) {
    console.error('Add transaction error:', err);
    res.status(500).json({ error: 'Failed to add transaction' });
  }
});

// Assign BD number to transactions
router.post('/assign-bd-number', authenticateToken, [
  body('transactionIds')
    .isArray()
    .withMessage('Transaction IDs must be an array')
    .custom((value) => {
      if (!value.length) {
        throw new Error('At least one transaction ID is required');
      }
      return true;
    }),
  body('bdNumber')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('BD number must be between 1 and 50 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { transactionIds, bdNumber } = req.body;
    const data = getData();
    
    if (!data.userData[req.user.userId]) {
      return res.status(404).json({ error: 'User data not found' });
    }
    
    const userData = data.userData[req.user.userId];
    let updatedCount = 0;
    
    // Update transactions with BD number
    userData.transactions = userData.transactions.map(transaction => {
      if (transactionIds.includes(transaction.id)) {
        if (transaction.bdNumber) {
          // Skip transactions that already have BD numbers
          return transaction;
        }
        updatedCount++;
        return {
          ...transaction,
          bdNumber: sanitize(bdNumber),
          username: req.user.username || 'Unknown'
        };
      }
      return transaction;
    });
    
    if (updatedCount === 0) {
      return res.status(400).json({ error: 'No transactions were updated (they may already have BD numbers)' });
    }
    
    await saveData();
    
    res.json({ 
      success: true, 
      message: `BD number assigned to ${updatedCount} transactions`,
      updatedCount 
    });
  } catch (err) {
    console.error('Assign BD number error:', err);
    res.status(500).json({ error: 'Failed to assign BD number' });
  }
});

module.exports = router;