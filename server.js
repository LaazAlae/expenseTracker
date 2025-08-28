const express = require('express');
const http = require('http');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const authRoutes = require('./routes/auth');
const { loadData } = require('./services/database');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { setupProcessSecurity } = require('./security/process');
const websocketManager = require('./services/websocket');
const budgetManager = require('./services/budget-manager');

// Initialize process security
setupProcessSecurity();

const app = express();
const server = http.createServer(app);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com", "https://cdnjs.cloudflare.com"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'"]
    }
  }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit per device - increased from 5 to 20
  message: { error: 'Too many authentication attempts from this device, please try again later' },
  keyGenerator: (req) => {
    // Use IP + User-Agent for better device identification
    return req.ip + ':' + (req.get('User-Agent') || '');
  }
});

app.use(limiter);
app.use('/api/login', authLimiter);
app.use('/api/register', authLimiter);

// Basic middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));

// Secure static file serving - prevent directory traversal
app.use(express.static('public', {
  dotfiles: 'deny', // Deny access to dotfiles
  index: false,      // Don't serve directory indexes
  setHeaders: (res, path) => {
    // Security headers for static files
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
  }
}));

// Routes (only auth routes now, data handled by WebSocket)
app.use('/api', authRoutes);

// Serve main application
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

// Initialize WebSocket
websocketManager.initialize(server);

// Initialize and start server
loadData().then(async () => {
  // Clean up old budget fields for consistency
  await budgetManager.cleanupOldBudgetFields();
  
  server.listen(PORT, () => {
    console.log(`🚀 Secure expense tracker running on port ${PORT}`);
    console.log(`🔒 WebSocket enabled for real-time communication`);
    console.log(`💰 Centralized budget management active`);
    console.log(`🔧 Ready for enterprise-grade consistency!`);
  });
}).catch(console.error);