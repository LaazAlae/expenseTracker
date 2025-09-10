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

// Enhanced Security Headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com", "https://cdnjs.cloudflare.com"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'"],
      imgSrc: ["'self'", "data:"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  frameguard: { action: 'deny' },
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'same-site' }
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

// Enhanced Security Middleware
app.use(compression());

// CSRF Protection Headers
app.use((req, res, next) => {
  // Set secure headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  
  // CSRF Token Generation (for forms if needed)
  const csrfToken = require('crypto').randomBytes(32).toString('hex');
  res.locals.csrfToken = csrfToken;
  
  // Security logging
  const clientIP = req.ip || req.connection.remoteAddress;
  if (req.url.includes('..') || req.url.includes('%2e%2e')) {
    console.warn(`Directory traversal attempt from ${clientIP}: ${req.url}`);
    return res.status(400).json({ error: 'Invalid request' });
  }
  
  next();
});

// Enhanced JSON parsing with strict limits
app.use(express.json({ 
  limit: '1mb', // Reduced from 10mb for security
  strict: true,
  type: 'application/json',
  verify: (req, res, buf) => {
    // Additional JSON validation
    if (buf.length > 1024 * 1024) { // 1MB limit
      throw new Error('Request entity too large');
    }
  }
}));

// URL encoded data with strict limits
app.use(express.urlencoded({ 
  extended: false, 
  limit: '100kb',
  parameterLimit: 20
}));

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
const HOST = process.env.HOST || '0.0.0.0'; // Railway requires binding to 0.0.0.0

// Initialize WebSocket
websocketManager.initialize(server);

// Initialize and start server
loadData().then(async () => {
  // Clean up old budget fields for consistency
  await budgetManager.cleanupOldBudgetFields();
  
  server.listen(PORT, HOST, () => {
    console.log(`🔒 Secure expense tracker running on ${HOST}:${PORT}`);
    console.log(`📡 WebSocket enabled for real-time communication`);
    console.log(`💰 Centralized budget management active`);
    console.log(`🚀 Ready for enterprise-grade consistency!`);
  });
}).catch(console.error);