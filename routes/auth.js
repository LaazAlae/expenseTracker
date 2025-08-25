const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { sanitize } = require('../utils/sanitizer');
const { getData, saveData } = require('../services/database');
const { clearSensitiveVariables } = require('../security/process');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'expense-tracker-secret-2024';

// Validation rules
const registerValidation = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username must be 3-30 characters, alphanumeric and underscores only'),
  body('password')
    .isLength({ min: 6, max: 128 })
    .withMessage('Password must be 6-128 characters long')
];

const loginValidation = [
  body('username').trim().notEmpty(),
  body('password').notEmpty()
];

// Register endpoint
router.post('/register', registerValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { username, password } = req.body;
    const cleanUsername = sanitize(username);
    
    const data = getData();
    
    if (data.users[cleanUsername]) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 12);
    const userId = Date.now().toString();
    
    data.users[cleanUsername] = {
      id: userId,
      username: cleanUsername,
      password: hashedPassword,
      createdAt: new Date().toISOString(),
      loginAttempts: 0,
      lockUntil: null
    };
    
    data.userData[userId] = {
      budget: 0,
      transactions: [],
      beneficiaries: [],
      itemDescriptions: ['Sky Cap'],
      flightNumbers: ['AT200', 'AT201']
    };
    
    await saveData();
    
    const token = jwt.sign(
      { userId, username: cleanUsername },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    // Clear sensitive variables from memory
    clearSensitiveVariables(password);
    
    res.json({ 
      token, 
      user: { id: userId, username: cleanUsername }
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login endpoint
router.post('/login', loginValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const { username, password } = req.body;
    const cleanUsername = sanitize(username);
    
    const data = getData();
    const user = data.users[cleanUsername];
    
    if (!user) {
      return res.status(400).json({ error: 'Invalid username or password' });
    }

    // Check if account is locked
    if (user.lockUntil && user.lockUntil > Date.now()) {
      return res.status(429).json({ error: 'Account temporarily locked. Try again later.' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    
    if (!validPassword) {
      // Increment failed login attempts
      user.loginAttempts = (user.loginAttempts || 0) + 1;
      
      if (user.loginAttempts >= 5) {
        user.lockUntil = Date.now() + (15 * 60 * 1000); // 15 minutes
      }
      
      await saveData();
      return res.status(400).json({ error: 'Invalid username or password' });
    }

    // Reset login attempts on successful login
    user.loginAttempts = 0;
    user.lockUntil = null;
    await saveData();
    
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    // Clear sensitive variables from memory
    clearSensitiveVariables(password);
    
    res.json({ 
      token, 
      user: { id: user.id, username: user.username }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

module.exports = router;