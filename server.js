const express = require('express');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const authRoutes = require('./routes/auth');
const dataRoutes = require('./routes/data');
const { loadData } = require('./services/database');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { setupProcessSecurity } = require('./security/process');

// Initialize process security
setupProcessSecurity();

const app = express();

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
  max: 5, // limit login/register attempts
  message: { error: 'Too many authentication attempts, please try again later' }
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

// Routes
app.use('/api', authRoutes);
app.use('/api', dataRoutes);

// Serve main application
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

// Initialize and start server
loadData().then(() => {
  app.listen(PORT, () => {
    console.log(` Secure expense tracker running on port ${PORT}`);
  });
}).catch(console.error);