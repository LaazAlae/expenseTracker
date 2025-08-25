const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const http = require('http');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'expense-tracker-secret-2024';
const DATA_FILE = 'data.json';

// Simple file-based storage
let data = {
  users: {},
  userData: {}
};

// Load data from file
async function loadData() {
  try {
    const fileData = await fs.readFile(DATA_FILE, 'utf8');
    data = JSON.parse(fileData);
    console.log('Data loaded from file');
  } catch (err) {
    console.log('No existing data file, starting fresh');
  }
}

// Save data to file
async function saveData() {
  try {
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error saving data:', err);
  }
}

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.sendStatus(401);
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.sendStatus(403);
  }
};

// Routes
app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (data.users[username]) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = Date.now().toString();
    
    data.users[username] = {
      id: userId,
      username,
      password: hashedPassword,
      createdAt: new Date().toISOString()
    };
    
    data.userData[userId] = {
      budget: 0,
      transactions: [],
      beneficiaries: [],
      itemDescriptions: ['Sky Cap'],
      flightNumbers: ['AT200', 'AT201']
    };
    
    await saveData();
    
    const token = jwt.sign({ userId, username }, JWT_SECRET);
    res.json({ token, user: { id: userId, username } });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = data.users[username];
    
    if (!user) {
      return res.status(400).json({ error: 'Invalid username or password' });
    }
    
    const validPassword = await bcrypt.compare(password, user.password);
    
    if (!validPassword) {
      return res.status(400).json({ error: 'Invalid username or password' });
    }
    
    const token = jwt.sign({ userId: user.id, username: user.username }, JWT_SECRET);
    res.json({ token, user: { id: user.id, username: user.username } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/user-data', authenticateToken, (req, res) => {
  const userData = data.userData[req.user.userId] || {
    budget: 0,
    transactions: [],
    beneficiaries: [],
    itemDescriptions: ['Sky Cap'],
    flightNumbers: ['AT200', 'AT201']
  };
  
  res.json(userData);
});

app.post('/api/update-budget', authenticateToken, async (req, res) => {
  try {
    const { budget } = req.body;
    
    if (!data.userData[req.user.userId]) {
      data.userData[req.user.userId] = {
        budget: 0,
        transactions: [],
        beneficiaries: [],
        itemDescriptions: ['Sky Cap'],
        flightNumbers: ['AT200', 'AT201']
      };
    }
    
    data.userData[req.user.userId].budget = budget;
    await saveData();
    
    io.emit('data-sync', data.userData[req.user.userId]);
    res.json({ success: true });
  } catch (err) {
    console.error('Update budget error:', err);
    res.status(500).json({ error: 'Failed to update budget' });
  }
});

app.post('/api/add-transaction', authenticateToken, async (req, res) => {
  try {
    const transaction = { ...req.body, id: Date.now().toString() };
    
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
    userData.transactions.push(transaction);
    
    // Update autocomplete lists
    if (!userData.beneficiaries.includes(transaction.beneficiary)) {
      userData.beneficiaries.push(transaction.beneficiary);
    }
    
    if (!userData.itemDescriptions.includes(transaction.itemDescription)) {
      userData.itemDescriptions.push(transaction.itemDescription);
    }
    
    if (transaction.flightNumber && !userData.flightNumbers.includes(transaction.flightNumber)) {
      userData.flightNumbers.push(transaction.flightNumber);
    }
    
    await saveData();
    
    io.emit('data-sync', userData);
    res.json({ success: true });
  } catch (err) {
    console.error('Add transaction error:', err);
    res.status(500).json({ error: 'Failed to add transaction' });
  }
});

// Socket authentication
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.userId = decoded.userId;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.userId);
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.userId);
  });
});

// Serve the single HTML page
app.get('*', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Expense Tracker</title>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="/socket.io/socket.io.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
  <script>
    // Inline Lucide icons
    const lucide = {
      Plus: () => ({ 
        type: 'svg', 
        props: { 
          width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' 
        }, 
        children: [
          { type: 'path', props: { d: 'M12 5v14M5 12h14' } }
        ]
      }),
      Download: () => ({ 
        type: 'svg', 
        props: { 
          width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' 
        }, 
        children: [
          { type: 'path', props: { d: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4' } },
          { type: 'polyline', props: { points: '7,10 12,15 17,10' } },
          { type: 'line', props: { x1: 12, y1: 15, x2: 12, y2: 3 } }
        ]
      }),
      User: () => ({ 
        type: 'svg', 
        props: { 
          width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' 
        }, 
        children: [
          { type: 'path', props: { d: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2' } },
          { type: 'circle', props: { cx: 12, cy: 7, r: 4 } }
        ]
      }),
      FileText: () => ({ 
        type: 'svg', 
        props: { 
          width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' 
        }, 
        children: [
          { type: 'path', props: { d: 'M14,2 L20,8 L20,20 A2,2 0 0,1 18,22 L6,22 A2,2 0 0,1 4,20 L4,4 A2,2 0 0,1 6,2 Z' } },
          { type: 'polyline', props: { points: '14,2 14,8 20,8' } },
          { type: 'line', props: { x1: 16, y1: 13, x2: 8, y2: 13 } },
          { type: 'line', props: { x1: 16, y1: 17, x2: 8, y2: 17 } },
          { type: 'polyline', props: { points: '10,9 9,9 8,9' } }
        ]
      }),
      LogOut: () => ({ 
        type: 'svg', 
        props: { 
          width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' 
        }, 
        children: [
          { type: 'path', props: { d: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4' } },
          { type: 'polyline', props: { points: '16,17 21,12 16,7' } },
          { type: 'line', props: { x1: 21, y1: 12, x2: 9, y2: 12 } }
        ]
      }),
      Wifi: () => ({ 
        type: 'svg', 
        props: { 
          width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' 
        }, 
        children: [
          { type: 'path', props: { d: 'M5 12.55a11 11 0 0 1 14.08 0' } },
          { type: 'path', props: { d: 'M1.42 9a16 16 0 0 1 21.16 0' } },
          { type: 'path', props: { d: 'M8.53 16.11a6 6 0 0 1 6.95 0' } },
          { type: 'line', props: { x1: 12, y1: 20, x2: 12.01, y2: 20 } }
        ]
      }),
      WifiOff: () => ({ 
        type: 'svg', 
        props: { 
          width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' 
        }, 
        children: [
          { type: 'line', props: { x1: 1, y1: 1, x2: 23, y2: 23 } },
          { type: 'path', props: { d: 'M16.72 11.06A10.94 10.94 0 0 1 19 12.55' } },
          { type: 'path', props: { d: 'M5 12.55a10.94 10.94 0 0 1 5.17-2.39' } },
          { type: 'path', props: { d: 'M10.71 5.05A16 16 0 0 1 22.58 9' } },
          { type: 'path', props: { d: 'M1.42 9a15.91 15.91 0 0 1 4.7-2.88' } },
          { type: 'path', props: { d: 'M8.53 16.11a6 6 0 0 1 6.95 0' } },
          { type: 'line', props: { x1: 12, y1: 20, x2: 12.01, y2: 20 } }
        ]
      }),
      Loader: () => ({ 
        type: 'svg', 
        props: { 
          width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' 
        }, 
        children: [
          { type: 'line', props: { x1: 12, y1: 2, x2: 12, y2: 6 } },
          { type: 'line', props: { x1: 12, y1: 18, x2: 12, y2: 22 } },
          { type: 'line', props: { x1: 4.93, y1: 4.93, x2: 7.76, y2: 7.76 } },
          { type: 'line', props: { x1: 16.24, y1: 16.24, x2: 19.07, y2: 19.07 } },
          { type: 'line', props: { x1: 2, y1: 12, x2: 6, y2: 12 } },
          { type: 'line', props: { x1: 18, y1: 12, x2: 22, y2: 12 } },
          { type: 'line', props: { x1: 4.93, y1: 19.07, x2: 7.76, y2: 16.24 } },
          { type: 'line', props: { x1: 16.24, y1: 7.76, x2: 19.07, y2: 4.93 } }
        ]
      })
    };
    
    // Helper to create React elements from icon definitions
    const createIcon = (iconDef, props = {}) => {
      const icon = iconDef();
      const mergedProps = { ...icon.props, ...props };
      const children = icon.children ? icon.children.map(child => 
        React.createElement(child.type, child.props)
      ) : [];
      return React.createElement(icon.type, mergedProps, ...children);
    };
  </script>
</head>
<body>
  <div id="root"></div>
  
  <script>
    const { useState, useEffect } = React;
    
    // Use inline icon components
    const Plus = (props) => createIcon(lucide.Plus, props);
    const Download = (props) => createIcon(lucide.Download, props);
    const User = (props) => createIcon(lucide.User, props);
    const FileText = (props) => createIcon(lucide.FileText, props);
    const LogOut = (props) => createIcon(lucide.LogOut, props);
    const Wifi = (props) => createIcon(lucide.Wifi, props);
    const WifiOff = (props) => createIcon(lucide.WifiOff, props);
    const Loader = (props) => createIcon(lucide.Loader, props);
    
    const API_URL = window.location.origin;
    
    // Auth Form Component
    function AuthForm({ onAuth }) {
      const [isLogin, setIsLogin] = useState(true);
      const [username, setUsername] = useState('');
      const [password, setPassword] = useState('');
      const [error, setError] = useState('');
      const [loading, setLoading] = useState(false);

      const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        
        try {
          const endpoint = isLogin ? '/api/login' : '/api/register';
          const response = await fetch(\`\${API_URL}\${endpoint}\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
          });
          
          const data = await response.json();
          if (!response.ok) throw new Error(data.error);
          
          localStorage.setItem('authToken', data.token);
          onAuth(data.token, data.user);
        } catch (err) {
          setError(err.message);
        }
        setLoading(false);
      };

      return React.createElement('div', { 
        style: { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '1rem', backgroundColor: '#f9fafb' }
      },
        React.createElement('div', { 
          style: { background: 'white', borderRadius: '0.75rem', boxShadow: '0 10px 25px -3px rgba(0,0,0,0.1)', padding: '2rem', width: '100%', maxWidth: '400px' }
        },
          React.createElement('div', { style: { textAlign: 'center', marginBottom: '2rem' }},
            React.createElement('h1', { style: { fontSize: '1.875rem', fontWeight: 700, color: '#111827', marginBottom: '0.5rem' }}, 'Expense Tracker'),
            React.createElement('p', { style: { color: '#6b7280' }}, isLogin ? 'Sign in to your account' : 'Create a new account')
          ),
          React.createElement('form', { onSubmit: handleSubmit },
            React.createElement('div', { style: { marginBottom: '1rem' }},
              React.createElement('label', { style: { display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.25rem' }},
                React.createElement(User, { style: { width: '1rem', height: '1rem', display: 'inline', marginRight: '0.5rem' }}),
                'Username'
              ),
              React.createElement('input', {
                type: 'text',
                value: username,
                onChange: (e) => setUsername(e.target.value),
                style: { width: '100%', padding: '0.75rem 1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '1rem' },
                required: true
              })
            ),
            React.createElement('div', { style: { marginBottom: '1.5rem' }},
              React.createElement('label', { style: { display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.25rem' }}, 'Password'),
              React.createElement('input', {
                type: 'password',
                value: password,
                onChange: (e) => setPassword(e.target.value),
                style: { width: '100%', padding: '0.75rem 1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '1rem' },
                required: true,
                minLength: 6
              })
            ),
            error && React.createElement('div', { 
              style: { backgroundColor: '#fee2e2', color: '#dc2626', padding: '0.75rem', borderRadius: '0.375rem', marginBottom: '1rem', fontSize: '0.875rem' }
            }, error),
            React.createElement('button', {
              type: 'submit',
              disabled: loading,
              style: { width: '100%', padding: '0.75rem 1.5rem', backgroundColor: loading ? '#9ca3af' : '#dc2626', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', marginBottom: '1rem' }
            }, loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'),
            React.createElement('button', {
              type: 'button',
              onClick: () => { setIsLogin(!isLogin); setError(''); setUsername(''); setPassword(''); },
              style: { width: '100%', padding: '0.5rem 1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', background: 'white', color: '#374151', cursor: 'pointer' }
            }, isLogin ? 'Need an account? Sign Up' : 'Already have an account? Sign In')
          )
        )
      );
    }

    // Transaction Form Component  
    function TransactionForm({ onSubmit, onCancel, beneficiaries, itemDescriptions, flightNumbers }) {
      const [formData, setFormData] = useState({
        dateOfReimbursement: new Date().toISOString().split('T')[0],
        beneficiary: '',
        itemDescription: '',
        invoiceNumber: '',
        dateOfPurchase: '',
        amount: '',
        observations: '',
        flightNumber: '',
        numberOfLuggage: ''
      });

      const isSkyCapSelected = formData.itemDescription.toLowerCase() === 'sky cap';

      const handleSubmit = (e) => {
        e.preventDefault();
        const transaction = {
          ...formData,
          beneficiary: formatName(formData.beneficiary),
          amount: parseFloat(formData.amount),
          numberOfLuggage: isSkyCapSelected && formData.numberOfLuggage ? parseInt(formData.numberOfLuggage) : undefined,
          flightNumber: isSkyCapSelected ? formData.flightNumber : undefined
        };
        onSubmit(transaction);
      };

      const formatName = (name) => {
        return name.trim().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
      };

      const isValid = () => {
        const required = ['beneficiary', 'itemDescription', 'invoiceNumber', 'dateOfPurchase', 'amount'];
        const basicValid = required.every(field => formData[field].trim() !== '');
        if (isSkyCapSelected) {
          return basicValid && formData.flightNumber.trim() !== '' && formData.numberOfLuggage.trim() !== '';
        }
        return basicValid;
      };

      return React.createElement('div', { 
        style: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 50 }
      },
        React.createElement('div', { 
          style: { background: 'white', borderRadius: '0.75rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', width: '100%', maxWidth: '32rem', maxHeight: '90vh', overflowY: 'auto' }
        },
          React.createElement('form', { onSubmit: handleSubmit, style: { padding: '1.5rem' }},
            React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }},
              React.createElement('h2', { style: { fontSize: '1.5rem', fontWeight: 700, color: '#111827' }}, 'New Transaction'),
              React.createElement('button', { type: 'button', onClick: onCancel, style: { background: 'none', border: 'none', fontSize: '1.25rem', color: '#9ca3af', cursor: 'pointer' }}, '×')
            ),
            React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '1rem' }},
              React.createElement('div', null,
                React.createElement('label', { style: { display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.25rem' }}, 'Date of Reimbursement'),
                React.createElement('input', { type: 'date', value: formData.dateOfReimbursement, onChange: (e) => setFormData(prev => ({...prev, dateOfReimbursement: e.target.value})), style: { width: '100%', padding: '0.75rem 1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem' }, required: true })
              ),
              React.createElement('div', null,
                React.createElement('label', { style: { display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.25rem' }}, 'Beneficiary'),
                React.createElement('input', { type: 'text', value: formData.beneficiary, onChange: (e) => setFormData(prev => ({...prev, beneficiary: e.target.value})), list: 'beneficiaries', style: { width: '100%', padding: '0.75rem 1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem' }, required: true }),
                React.createElement('datalist', { id: 'beneficiaries' }, beneficiaries.map((b, i) => React.createElement('option', { key: i, value: b })))
              ),
              React.createElement('div', null,
                React.createElement('label', { style: { display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.25rem' }}, 'Item Description'),
                React.createElement('input', { type: 'text', value: formData.itemDescription, onChange: (e) => setFormData(prev => ({...prev, itemDescription: e.target.value})), list: 'items', style: { width: '100%', padding: '0.75rem 1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem' }, required: true }),
                React.createElement('datalist', { id: 'items' }, itemDescriptions.map((item, i) => React.createElement('option', { key: i, value: item })))
              ),
              React.createElement('div', null,
                React.createElement('label', { style: { display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.25rem' }}, 'Invoice Number'),
                React.createElement('input', { type: 'text', value: formData.invoiceNumber, onChange: (e) => setFormData(prev => ({...prev, invoiceNumber: e.target.value})), style: { width: '100%', padding: '0.75rem 1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem' }, required: true })
              ),
              React.createElement('div', null,
                React.createElement('label', { style: { display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.25rem' }}, 'Date of Purchase'),
                React.createElement('input', { type: 'date', value: formData.dateOfPurchase, onChange: (e) => setFormData(prev => ({...prev, dateOfPurchase: e.target.value})), style: { width: '100%', padding: '0.75rem 1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem' }, required: true })
              ),
              React.createElement('div', null,
                React.createElement('label', { style: { display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.25rem' }}, 'Amount'),
                React.createElement('div', { style: { position: 'relative' }},
                  React.createElement('span', { style: { position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }}, '$'),
                  React.createElement('input', { type: 'number', step: '0.01', value: formData.amount, onChange: (e) => setFormData(prev => ({...prev, amount: e.target.value})), style: { width: '100%', paddingLeft: '2rem', paddingRight: '1rem', paddingTop: '0.75rem', paddingBottom: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem' }, required: true })
                )
              ),
              isSkyCapSelected && [
                React.createElement('div', { key: 'flight' },
                  React.createElement('label', { style: { display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.25rem' }}, 'Flight Number'),
                  React.createElement('input', { type: 'text', value: formData.flightNumber, onChange: (e) => setFormData(prev => ({...prev, flightNumber: e.target.value})), list: 'flights', style: { width: '100%', padding: '0.75rem 1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem' }, required: true }),
                  React.createElement('datalist', { id: 'flights' }, flightNumbers.map((f, i) => React.createElement('option', { key: i, value: f })))
                ),
                React.createElement('div', { key: 'luggage' },
                  React.createElement('label', { style: { display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.25rem' }}, 'Number of Luggage'),
                  React.createElement('input', { type: 'number', min: '1', value: formData.numberOfLuggage, onChange: (e) => setFormData(prev => ({...prev, numberOfLuggage: e.target.value})), style: { width: '100%', padding: '0.75rem 1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem' }, required: true })
                )
              ],
              React.createElement('div', null,
                React.createElement('label', { style: { display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.25rem' }}, 'Observations (Optional)'),
                React.createElement('textarea', { value: formData.observations, onChange: (e) => setFormData(prev => ({...prev, observations: e.target.value})), rows: 4, style: { width: '100%', padding: '0.75rem 1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', resize: 'none' } })
              )
            ),
            React.createElement('div', { style: { display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }},
              React.createElement('button', { type: 'button', onClick: onCancel, style: { flex: 1, padding: '0.5rem 1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', background: 'white', color: '#374151', cursor: 'pointer' }}, 'Cancel'),
              React.createElement('button', { type: 'submit', disabled: !isValid(), style: { flex: 1, padding: '0.5rem 1rem', border: 'none', borderRadius: '0.5rem', backgroundColor: isValid() ? '#dc2626' : '#d1d5db', color: 'white', cursor: isValid() ? 'pointer' : 'not-allowed' }}, 'Add Transaction')
            )
          )
        )
      );
    }

    // Main App Component
    function App() {
      const [isAuthenticated, setIsAuthenticated] = useState(false);
      const [currentUser, setCurrentUser] = useState(null);
      const [data, setData] = useState({ budget: 0, transactions: [], beneficiaries: [], itemDescriptions: ['Sky Cap'], flightNumbers: ['AT200', 'AT201'] });
      const [loading, setLoading] = useState(true);
      const [connectionStatus, setConnectionStatus] = useState('disconnected');
      const [showTransactionForm, setShowTransactionForm] = useState(false);
      const [selectedTransaction, setSelectedTransaction] = useState(null);
      const [showAddFunds, setShowAddFunds] = useState(false);
      const [fundsAmount, setFundsAmount] = useState('');
      const [socket, setSocket] = useState(null);

      // Initialize auth and socket
      useEffect(() => {
        const token = localStorage.getItem('authToken');
        if (token) {
          setIsAuthenticated(true);
          initSocket(token);
        } else {
          setLoading(false);
        }
      }, []);

      const initSocket = (token) => {
        const newSocket = io(API_URL, { auth: { token } });
        
        newSocket.on('connect', () => {
          setConnectionStatus('connected');
          loadData();
        });
        
        newSocket.on('disconnect', () => setConnectionStatus('disconnected'));
        newSocket.on('connect_error', () => setConnectionStatus('disconnected'));
        
        newSocket.on('data-sync', (syncData) => {
          setData(syncData);
          setLoading(false);
        });
        
        newSocket.on('request-sync', () => loadData());
        
        setSocket(newSocket);
        
        return () => newSocket.disconnect();
      };

      const loadData = async () => {
        try {
          const token = localStorage.getItem('authToken');
          const response = await fetch(\`\${API_URL}/api/user-data\`, {
            headers: { 'Authorization': \`Bearer \${token}\` },
          });
          const userData = await response.json();
          setData(userData);
          setLoading(false);
        } catch (err) {
          console.error('Load data error:', err);
          setLoading(false);
        }
      };

      const handleAuth = (token, user) => {
        setIsAuthenticated(true);
        setCurrentUser(user);
        initSocket(token);
      };

      const handleLogout = () => {
        localStorage.removeItem('authToken');
        if (socket) socket.disconnect();
        setIsAuthenticated(false);
        setCurrentUser(null);
      };

      const handleAddFunds = async () => {
        const amount = parseFloat(fundsAmount);
        if (!isNaN(amount) && amount > 0) {
          try {
            const token = localStorage.getItem('authToken');
            await fetch(\`\${API_URL}/api/update-budget\`, {
              method: 'POST',
              headers: { 'Authorization': \`Bearer \${token}\`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ budget: data.budget + amount }),
            });
            setFundsAmount('');
            setShowAddFunds(false);
          } catch (err) {
            alert('Failed to add funds');
          }
        }
      };

      const handleAddTransaction = async (transaction) => {
        try {
          const token = localStorage.getItem('authToken');
          await fetch(\`\${API_URL}/api/add-transaction\`, {
            method: 'POST',
            headers: { 'Authorization': \`Bearer \${token}\`, 'Content-Type': 'application/json' },
            body: JSON.stringify(transaction),
          });
          setShowTransactionForm(false);
        } catch (err) {
          alert('Failed to add transaction');
        }
      };

      const exportToExcel = () => {
        const worksheetData = [
          ['Date of Reimbursement', 'Beneficiary', 'Item Description', 'Invoice Number', 'Date of Purchase', 'Amount', 'Amount Left', 'Flight Number', 'Number of Luggage', 'Observations'],
          ...data.transactions.map((transaction, index) => {
            const transactionsUpToHere = data.transactions.slice(0, index + 1);
            const spentUpToHere = transactionsUpToHere.reduce((sum, t) => sum + t.amount, 0);
            const amountLeftAfterTransaction = data.budget - spentUpToHere;
            
            return [
              new Date(transaction.dateOfReimbursement).toLocaleDateString(),
              transaction.beneficiary,
              transaction.itemDescription,
              transaction.invoiceNumber,
              new Date(transaction.dateOfPurchase).toLocaleDateString(),
              transaction.amount,
              amountLeftAfterTransaction.toFixed(2),
              transaction.flightNumber || '',
              transaction.numberOfLuggage || '',
              transaction.observations
            ];
          })
        ];

        const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Transactions');
        XLSX.writeFile(workbook, \`expense-report-\${new Date().toISOString().split('T')[0]}.xlsx\`);
      };

      if (!isAuthenticated) return React.createElement(AuthForm, { onAuth: handleAuth });
      
      if (loading) {
        return React.createElement('div', { 
          style: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f9fafb' }
        },
          React.createElement('div', { style: { textAlign: 'center' }},
            React.createElement(Loader, { style: { width: '2rem', height: '2rem', animation: 'spin 1s linear infinite', color: '#dc2626', margin: '0 auto 1rem' }}),
            React.createElement('div', null, 'Loading your expense data...')
          )
        );
      }

      const totalSpent = data.transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
      const remainingBudget = data.budget - totalSpent;

      const getConnectionIcon = () => {
        switch (connectionStatus) {
          case 'connected': return React.createElement(Wifi, { style: { width: '1rem', height: '1rem', color: '#10b981' }});
          case 'connecting': return React.createElement(Loader, { style: { width: '1rem', height: '1rem', color: '#f59e0b', animation: 'spin 1s linear infinite' }});
          default: return React.createElement(WifiOff, { style: { width: '1rem', height: '1rem', color: '#ef4444' }});
        }
      };

      return React.createElement('div', { 
        style: { minHeight: '100vh', backgroundColor: '#f9fafb', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }
      },
        // Header
        React.createElement('div', { 
          style: { position: 'absolute', top: '1.5rem', left: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }
        },
          React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: '0.5rem' }},
            getConnectionIcon(),
            React.createElement('span', { style: { color: '#6b7280', fontSize: '0.75rem' }},
              connectionStatus === 'connected' ? 'Synced' : connectionStatus === 'connecting' ? 'Syncing...' : 'Offline'
            )
          ),
          currentUser && React.createElement('span', { style: { color: '#6b7280', fontSize: '0.875rem' }}, \`Welcome, \${currentUser.username}\`),
          React.createElement('button', { 
            onClick: handleLogout, 
            style: { padding: '0.5rem 1rem', fontSize: '0.875rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', background: 'white', color: '#374151', cursor: 'pointer' }
          },
            React.createElement(LogOut, { style: { width: '1rem', height: '1rem', marginRight: '0.5rem', display: 'inline' }}),
            'Logout'
          )
        ),
        
        // Export Button
        React.createElement('button', { 
          onClick: exportToExcel, 
          style: { position: 'absolute', top: '1.5rem', right: '1.5rem', padding: '0.75rem 1.5rem', backgroundColor: '#8b5cf6', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 500, cursor: 'pointer' }
        },
          React.createElement(Download, { style: { width: '1.25rem', height: '1.25rem', marginRight: '0.5rem', display: 'inline' }}),
          'Export to Excel'
        ),

        React.createElement('div', { style: { maxWidth: '72rem', margin: '0 auto', padding: '1.5rem' }},
          // Header
          React.createElement('header', { style: { textAlign: 'center', marginBottom: '2rem' }},
            React.createElement('h1', { style: { fontSize: '1.875rem', fontWeight: 700, color: '#111827', marginBottom: '0.5rem' }}, 'Expense Reimbursement Tracker'),
            React.createElement('p', { style: { color: '#6b7280' }}, 'Manage your reimbursements with ease')
          ),

          // Budget Card
          React.createElement('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }},
            React.createElement('div', { 
              style: { background: 'linear-gradient(135deg, #dc2626, #b91c1c)', color: 'white', padding: '2rem 3rem', borderRadius: '1rem', boxShadow: '0 10px 25px -3px rgba(220, 38, 38, 0.3)', textAlign: 'center', marginBottom: '1.5rem', minWidth: '300px' }
            },
              React.createElement('p', { style: { fontSize: '1.125rem', fontWeight: 500, opacity: 0.9, marginBottom: '0.5rem' }}, 'Available Budget'),
              React.createElement('p', { style: { fontSize: '3rem', fontWeight: 700, lineHeight: 1 }}, \`$\${remainingBudget.toFixed(2)}\`)
            ),
            
            React.createElement('button', { 
              onClick: () => setShowAddFunds(true), 
              style: { display: 'flex', alignItems: 'center', padding: '0.75rem 1.5rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 500, cursor: 'pointer' }
            },
              React.createElement(Plus, { style: { width: '1.25rem', height: '1.25rem', marginRight: '0.5rem' }}),
              'Add Funds'
            )
          ),

          // Transaction Table
          React.createElement('div', { 
            style: { background: 'white', borderRadius: '0.75rem', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', overflow: 'hidden' }
          },
            React.createElement('div', { style: { padding: '1.5rem', borderBottom: '1px solid #e5e7eb' }},
              React.createElement('h2', { style: { fontSize: '1.25rem', fontWeight: 700, color: '#111827' }}, 'Transaction History')
            ),
            
            React.createElement('div', { style: { overflowX: 'auto', maxHeight: '400px', overflowY: 'auto' }},
              data.transactions.length === 0 ? 
                React.createElement('div', { style: { padding: '3rem', textAlign: 'center' }},
                  React.createElement(FileText, { style: { width: '4rem', height: '4rem', color: '#d1d5db', margin: '0 auto 1rem' }}),
                  React.createElement('p', { style: { color: '#6b7280', fontSize: '1.125rem', marginBottom: '0.5rem' }}, 'No transactions yet'),
                  React.createElement('p', { style: { color: '#9ca3af', fontSize: '0.875rem' }}, 'Add your first transaction to get started')
                ) :
                React.createElement('table', { style: { width: '100%', borderCollapse: 'collapse' }},
                  React.createElement('thead', { style: { backgroundColor: '#f9fafb' }},
                    React.createElement('tr', null,
                      React.createElement('th', { style: { padding: '0.75rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 500, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}, 'Date'),
                      React.createElement('th', { style: { padding: '0.75rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 500, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}, 'Beneficiary'),
                      React.createElement('th', { style: { padding: '0.75rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 500, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}, 'Item'),
                      React.createElement('th', { style: { padding: '0.75rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 500, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}, 'Amount'),
                      React.createElement('th', { style: { padding: '0.75rem 1.5rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 500, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}, 'Amount Left')
                    )
                  ),
                  React.createElement('tbody', { style: { background: 'white' }},
                    data.transactions.map((transaction, index) => {
                      const transactionsUpToHere = data.transactions.slice(0, index + 1);
                      const spentUpToHere = transactionsUpToHere.reduce((sum, t) => sum + t.amount, 0);
                      const amountLeftAfterTransaction = data.budget - spentUpToHere;
                      
                      return React.createElement('tr', { 
                        key: transaction.id, 
                        onClick: () => setSelectedTransaction(transaction), 
                        style: { borderBottom: '1px solid #e5e7eb', cursor: 'pointer' },
                        onMouseEnter: (e) => e.target.parentNode.style.backgroundColor = '#f9fafb',
                        onMouseLeave: (e) => e.target.parentNode.style.backgroundColor = 'white'
                      },
                        React.createElement('td', { style: { padding: '1rem 1.5rem', fontSize: '0.875rem', color: '#111827' }}, new Date(transaction.dateOfReimbursement).toLocaleDateString()),
                        React.createElement('td', { style: { padding: '1rem 1.5rem' }},
                          React.createElement('div', { style: { display: 'flex', alignItems: 'center' }},
                            React.createElement(User, { style: { width: '1rem', height: '1rem', color: '#9ca3af', marginRight: '0.5rem' }}),
                            React.createElement('span', { style: { fontSize: '0.875rem', color: '#111827' }}, transaction.beneficiary)
                          )
                        ),
                        React.createElement('td', { style: { padding: '1rem 1.5rem', fontSize: '0.875rem', color: '#111827' }}, transaction.itemDescription),
                        React.createElement('td', { style: { padding: '1rem 1.5rem', fontSize: '0.875rem', fontWeight: 500, color: '#111827' }}, \`$\${transaction.amount.toFixed(2)}\`),
                        React.createElement('td', { style: { padding: '1rem 1.5rem', fontSize: '0.875rem', fontWeight: 500, color: '#111827' }}, \`$\${amountLeftAfterTransaction.toFixed(2)}\`)
                      );
                    })
                  )
                )
            )
          ),

          // New Transaction Button
          React.createElement('button', { 
            onClick: () => setShowTransactionForm(true), 
            style: { width: '120px', height: '120px', borderRadius: '50%', background: 'linear-gradient(135deg, #dc2626, #b91c1c)', color: 'white', border: 'none', fontSize: '1.5rem', fontWeight: 700, cursor: 'pointer', margin: '2rem auto', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 25px -3px rgba(220, 38, 38, 0.4)' }
          }, 'NEW')
        ),

        // Modals
        showAddFunds && React.createElement('div', { 
          style: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 50 }
        },
          React.createElement('div', { 
            style: { background: 'white', borderRadius: '0.75rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', width: '100%', maxWidth: '28rem' }
          },
            React.createElement('div', { style: { padding: '1.5rem' }},
              React.createElement('h3', { style: { fontSize: '1.25rem', fontWeight: 700, color: '#111827', marginBottom: '1rem' }}, 'Add Funds'),
              React.createElement('div', { style: { marginBottom: '1rem' }},
                React.createElement('label', { style: { display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.25rem' }}, 'Amount'),
                React.createElement('div', { style: { position: 'relative' }},
                  React.createElement('span', { style: { position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }}, '$'),
                  React.createElement('input', { 
                    type: 'number', step: '0.01', value: fundsAmount, onChange: (e) => setFundsAmount(e.target.value), placeholder: '0.00', 
                    style: { width: '100%', paddingLeft: '2rem', paddingRight: '1rem', paddingTop: '0.75rem', paddingBottom: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem' }, 
                    autoFocus: true 
                  })
                )
              ),
              React.createElement('div', { style: { display: 'flex', gap: '0.75rem' }},
                React.createElement('button', { 
                  onClick: () => setShowAddFunds(false), 
                  style: { flex: 1, padding: '0.5rem 1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', background: 'white', color: '#374151', cursor: 'pointer' }
                }, 'Cancel'),
                React.createElement('button', { 
                  onClick: handleAddFunds, 
                  disabled: !fundsAmount || parseFloat(fundsAmount) <= 0, 
                  style: { flex: 1, padding: '0.5rem 1rem', backgroundColor: fundsAmount && parseFloat(fundsAmount) > 0 ? '#3b82f6' : '#d1d5db', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: fundsAmount && parseFloat(fundsAmount) > 0 ? 'pointer' : 'not-allowed' }
                }, 'Add Funds')
              )
            )
          )
        ),

        showTransactionForm && React.createElement(TransactionForm, {
          onSubmit: handleAddTransaction,
          onCancel: () => setShowTransactionForm(false),
          beneficiaries: data.beneficiaries,
          itemDescriptions: data.itemDescriptions,
          flightNumbers: data.flightNumbers
        }),

        selectedTransaction && React.createElement('div', { 
          style: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 50 }
        },
          React.createElement('div', { 
            style: { background: 'white', borderRadius: '0.75rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', width: '100%', maxWidth: '48rem', maxHeight: '90vh', overflowY: 'auto' }
          },
            React.createElement('div', { style: { padding: '1.5rem' }},
              React.createElement('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }},
                React.createElement('h2', { style: { fontSize: '1.5rem', fontWeight: 700, color: '#111827' }}, 'Transaction Details'),
                React.createElement('button', { onClick: () => setSelectedTransaction(null), style: { background: 'none', border: 'none', fontSize: '1.25rem', color: '#9ca3af', cursor: 'pointer' }}, '×')
              ),

              React.createElement('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }},
                React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '1rem' }},
                  React.createElement('div', null,
                    React.createElement('p', { style: { fontSize: '0.875rem', fontWeight: 500, color: '#6b7280', marginBottom: '0.25rem' }}, 'Date of Reimbursement'),
                    React.createElement('p', { style: { color: '#111827' }}, new Date(selectedTransaction.dateOfReimbursement).toLocaleDateString())
                  ),
                  React.createElement('div', null,
                    React.createElement('p', { style: { fontSize: '0.875rem', fontWeight: 500, color: '#6b7280', marginBottom: '0.25rem' }}, 'Beneficiary'),
                    React.createElement('p', { style: { color: '#111827' }}, selectedTransaction.beneficiary)
                  ),
                  React.createElement('div', null,
                    React.createElement('p', { style: { fontSize: '0.875rem', fontWeight: 500, color: '#6b7280', marginBottom: '0.25rem' }}, 'Item Description'),
                    React.createElement('p', { style: { color: '#111827' }}, selectedTransaction.itemDescription)
                  ),
                  React.createElement('div', null,
                    React.createElement('p', { style: { fontSize: '0.875rem', fontWeight: 500, color: '#6b7280', marginBottom: '0.25rem' }}, 'Invoice Number'),
                    React.createElement('p', { style: { color: '#111827' }}, selectedTransaction.invoiceNumber)
                  )
                ),

                React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '1rem' }},
                  React.createElement('div', null,
                    React.createElement('p', { style: { fontSize: '0.875rem', fontWeight: 500, color: '#6b7280', marginBottom: '0.25rem' }}, 'Date of Purchase'),
                    React.createElement('p', { style: { color: '#111827' }}, new Date(selectedTransaction.dateOfPurchase).toLocaleDateString())
                  ),
                  React.createElement('div', null,
                    React.createElement('p', { style: { fontSize: '0.875rem', fontWeight: 500, color: '#6b7280', marginBottom: '0.25rem' }}, 'Amount'),
                    React.createElement('p', { style: { color: '#111827', fontSize: '1.25rem', fontWeight: 600 }}, \`$\${selectedTransaction.amount.toFixed(2)}\`)
                  ),
                  selectedTransaction.flightNumber && React.createElement('div', null,
                    React.createElement('p', { style: { fontSize: '0.875rem', fontWeight: 500, color: '#6b7280', marginBottom: '0.25rem' }}, 'Flight Number'),
                    React.createElement('p', { style: { color: '#111827' }}, selectedTransaction.flightNumber)
                  ),
                  selectedTransaction.numberOfLuggage && React.createElement('div', null,
                    React.createElement('p', { style: { fontSize: '0.875rem', fontWeight: 500, color: '#6b7280', marginBottom: '0.25rem' }}, 'Number of Luggage'),
                    React.createElement('p', { style: { color: '#111827' }}, selectedTransaction.numberOfLuggage)
                  )
                )
              ),

              selectedTransaction.observations && React.createElement('div', { style: { marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e5e7eb' }},
                React.createElement('p', { style: { fontSize: '0.875rem', fontWeight: 500, color: '#6b7280', marginBottom: '0.5rem' }}, 'Observations'),
                React.createElement('p', { style: { color: '#111827', backgroundColor: '#f9fafb', padding: '0.75rem', borderRadius: '0.5rem' }}, selectedTransaction.observations)
              ),

              React.createElement('div', { style: { marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }},
                React.createElement('button', { 
                  onClick: () => setSelectedTransaction(null), 
                  style: { padding: '0.5rem 1.5rem', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '0.5rem', fontWeight: 500, cursor: 'pointer' }
                }, 'Close')
              )
            )
          )
        )
      );
    }

    // Render the app
    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(React.createElement(App));
  </script>
</body>
</html>`);
});

const PORT = process.env.PORT || 3000;

loadData().then(() => {
  server.listen(PORT, () => {
    console.log(`🚀 Simple file-based server running on port ${PORT}`);
  });
});