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

// Registration disabled - invite-only system
router.post('/register', (req, res) => {
  res.status(403).json({ 
    error: 'Registration is disabled. Please contact an administrator for an invitation.' 
  });
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
      { expiresIn: '30d' } // Extended session for persistence
    );

    // Update last login
    user.lastLogin = new Date().toISOString();
    await saveData();
    
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

// Token validation endpoint for session persistence
router.post('/validate-token', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    
    const data = getData();
    const user = Object.values(data.users).find(u => u.id === decoded.userId);
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Check if account is locked
    if (user.lockUntil && user.lockUntil > Date.now()) {
      return res.status(429).json({ error: 'Account temporarily locked' });
    }

    // Return user data with admin status
    const isAdmin = user.id === Object.values(data.users)[0]?.id;
    
    res.json({
      valid: true,
      user: { 
        id: user.id, 
        username: user.username,
        isAdmin 
      }
    });
  } catch (err) {
    console.error('Token validation error:', err);
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;