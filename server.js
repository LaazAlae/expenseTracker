const express = require('express');
const http = require('http');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const bcrypt = require('bcrypt');
const authRoutes = require('./routes/auth');
const { loadData, getData, saveData } = require('./services/database');
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

// Add detailed request logging middleware
app.use((req, res, next) => {
  console.log(` ${new Date().toISOString()} - ${req.method} ${req.url} from ${req.ip}`);
  console.log(` Headers:`, JSON.stringify(req.headers, null, 2));
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  console.log(' Health check requested');
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    port: PORT,
    host: HOST,
    env: process.env.NODE_ENV
  });
});

// Test endpoint
app.get('/test', (req, res) => {
  console.log(' Test endpoint requested');
  res.status(200).send('<h1>Server is working!</h1><p>If you can see this, the server is responding correctly.</p>');
});

// Serve main application
app.get('/', (req, res) => {
  console.log(' Root endpoint requested');
  const indexPath = path.join(__dirname, 'public', 'index.html');
  console.log(' Serving index.html from:', indexPath);
  
  // Check if file exists
  const fs = require('fs');
  if (fs.existsSync(indexPath)) {
    console.log(' index.html found, serving file');
    res.sendFile(indexPath);
  } else {
    console.error(' index.html not found at:', indexPath);
    res.status(404).send('<h1>index.html not found</h1><p>File path: ' + indexPath + '</p>');
  }
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Auto-create admin user function
async function createAdminUserIfNeeded() {
  try {
    const data = getData();
    
    // Check if any users exist
    const existingUsers = Object.values(data.users);
    if (existingUsers.length > 0) {
      console.log(' Admin user already exists:', existingUsers[0].username);
      return;
    }
    
    // Create admin user from environment variables
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'SecureAdmin123!';
    
    console.log(' Creating admin user from environment variables...');
    console.log(' Admin Username:', adminUsername);
    console.log(' Admin Password:', adminPassword.substring(0, 3) + '***');
    
    const hashedPassword = await bcrypt.hash(adminPassword, 12);
    const userId = Date.now().toString();
    
    data.users[adminUsername] = {
      id: userId,
      username: adminUsername,
      password: hashedPassword,
      createdAt: new Date().toISOString(),
      loginAttempts: 0,
      lockUntil: null,
      isAdmin: true
    };
    
    data.userData[userId] = {
      budget: 0,
      transactions: [],
      beneficiaries: [],
      itemDescriptions: ['Sky Cap'],
      flightNumbers: ['AT200', 'AT201']
    };
    
    await saveData();
    
    console.log(' Admin user created successfully!');
    console.log(' You can now log in with:');
    console.log(`   Username: ${adminUsername}`);
    console.log(`   Password: ${adminPassword}`);
    
  } catch (error) {
    console.error(' Failed to create admin user:', error);
  }
}

const PORT = process.env.PORT || 3000;
console.log(' DEBUGGING - process.env.PORT:', process.env.PORT);
console.log(' DEBUGGING - Final PORT value:', PORT);
const HOST = process.env.HOST || '0.0.0.0'; // Railway requires binding to 0.0.0.0

// Initialize WebSocket
websocketManager.initialize(server);

// Initialize and start server
loadData().then(async () => {
  // Clean up old budget fields for consistency
  await budgetManager.cleanupOldBudgetFields();
  
  // Auto-create admin user if none exists
  await createAdminUserIfNeeded();
  
  console.log(' ATTEMPTING TO START SERVER...');
  console.log(' Will bind to HOST:', HOST);
  console.log(' Will bind to PORT:', PORT);
  console.log(' PORT type:', typeof PORT);
  
  const actualPort = parseInt(PORT, 10);
  console.log(' Parsed PORT as integer:', actualPort);
  
  server.listen(actualPort, HOST, () => {
    const address = server.address();
    console.log(` Secure expense tracker running on ${HOST}:${actualPort}`);
    console.log(` Server address object:`, address);
    console.log(` WebSocket enabled for real-time communication`);
    console.log(` Centralized budget management active`);
    console.log(` Ready for enterprise-grade consistency!`);
    console.log(` Railway URL should be: https://expensetracking.up.railway.app`);
    console.log(` Environment: NODE_ENV=${process.env.NODE_ENV}`);
    console.log(` All Environment Variables:`, Object.keys(process.env).filter(key => key.includes('RAILWAY') || key.includes('PORT') || key.includes('HOST')));
  });
  
  // Add error logging for server issues
  server.on('error', (error) => {
    console.error(' SERVER ERROR:', error);
    console.error(' Error code:', error.code);
    console.error(' Error message:', error.message);
  });
  
  server.on('listening', () => {
    const address = server.address();
    console.log(` Server successfully bound to:`, address);
    console.log(` Server is listening and ready to accept connections`);
  });
  
  server.on('connection', (socket) => {
    console.log(` New connection from:`, socket.remoteAddress);
  });
  
  server.on('close', () => {
    console.log(` Server closed`);
  });
}).catch((error) => {
  console.error(' FATAL ERROR during server startup:');
  console.error(' Error name:', error.name);
  console.error(' Error message:', error.message);
  console.error(' Error stack:', error.stack);
  console.error(' Process will exit');
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error(' UNCAUGHT EXCEPTION:');
  console.error(' Error:', error);
  console.error(' Stack:', error.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(' UNHANDLED REJECTION:');
  console.error(' Reason:', reason);
  console.error(' Promise:', promise);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log(' SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log(' Server closed successfully');
    process.exit(0);
  });
});