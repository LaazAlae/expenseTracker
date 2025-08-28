const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

// Enhanced security measures for government-level protection
class EnhancedSecurity {
  constructor() {
    this.auditLogs = [];
    this.securityEvents = [];
    this.suspiciousActivity = new Map();
    this.rateLimiters = new Map();
    this.encryptionKey = this.generateEncryptionKey();
    this.integrityHashes = new Map();
    
    // Initialize security monitoring
    this.setupSecurityMonitoring();
    this.setupIntegrityChecking();
  }

  // Generate a secure encryption key for sensitive data
  generateEncryptionKey() {
    const key = process.env.SECURITY_KEY || crypto.randomBytes(32).toString('hex');
    return crypto.createHash('sha256').update(key).digest();
  }

  // Encrypt sensitive data using AES-256-GCM
  encryptSensitiveData(data) {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher('aes-256-gcm', this.encryptionKey);
      cipher.setAAD(Buffer.from('expense-tracker-aad'));
      
      let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      return {
        encrypted,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex')
      };
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Data encryption failed');
    }
  }

  // Decrypt sensitive data
  decryptSensitiveData(encryptedData) {
    try {
      const { encrypted, iv, authTag } = encryptedData;
      const decipher = crypto.createDecipher('aes-256-gcm', this.encryptionKey);
      decipher.setAAD(Buffer.from('expense-tracker-aad'));
      decipher.setAuthTag(Buffer.from(authTag, 'hex'));
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Data decryption failed');
    }
  }

  // Advanced rate limiting with progressive delays
  checkRateLimit(identifier, action, maxAttempts = 10, windowMs = 300000) {
    const key = `${identifier}:${action}`;
    const now = Date.now();
    
    if (!this.rateLimiters.has(key)) {
      this.rateLimiters.set(key, { attempts: 0, resetTime: now + windowMs, penalties: 0 });
    }
    
    const limiter = this.rateLimiters.get(key);
    
    // Reset if window has passed
    if (now > limiter.resetTime) {
      limiter.attempts = 0;
      limiter.resetTime = now + windowMs;
    }
    
    limiter.attempts++;
    
    if (limiter.attempts > maxAttempts) {
      // Progressive penalties for repeated violations
      limiter.penalties++;
      const penaltyDelay = Math.min(limiter.penalties * 30000, 300000); // Max 5 min delay
      limiter.resetTime = now + penaltyDelay;
      
      this.logSecurityEvent('RATE_LIMIT_EXCEEDED', {
        identifier,
        action,
        attempts: limiter.attempts,
        penalties: limiter.penalties
      });
      
      return { allowed: false, retryAfter: penaltyDelay };
    }
    
    return { allowed: true };
  }

  // Log security events with detailed context
  logSecurityEvent(eventType, details) {
    const event = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      type: eventType,
      details,
      severity: this.getEventSeverity(eventType),
      userAgent: details.userAgent || 'Unknown',
      ip: details.ip || 'Unknown'
    };
    
    this.securityEvents.push(event);
    
    // Keep only last 10000 events to prevent memory issues
    if (this.securityEvents.length > 10000) {
      this.securityEvents = this.securityEvents.slice(-5000);
    }
    
    // Log high-severity events immediately
    if (event.severity === 'HIGH' || event.severity === 'CRITICAL') {
      console.warn(`🚨 SECURITY ALERT [${event.severity}]: ${eventType}`, details);
      this.writeSecurityLogToFile(event);
    }
    
    return event.id;
  }

  // Determine event severity
  getEventSeverity(eventType) {
    const severityMap = {
      'RATE_LIMIT_EXCEEDED': 'MEDIUM',
      'FAILED_LOGIN_ATTEMPT': 'LOW',
      'ACCOUNT_LOCKED': 'MEDIUM',
      'UNAUTHORIZED_ACCESS': 'HIGH',
      'DATA_INTEGRITY_VIOLATION': 'CRITICAL',
      'SUSPICIOUS_PATTERN': 'MEDIUM',
      'BRUTE_FORCE_DETECTED': 'HIGH',
      'ADMIN_ACTION': 'MEDIUM',
      'DATA_EXPORT': 'LOW',
      'WEBSOCKET_ABUSE': 'MEDIUM',
      'INVALID_TOKEN': 'MEDIUM'
    };
    
    return severityMap[eventType] || 'LOW';
  }

  // Write critical security events to file
  async writeSecurityLogToFile(event) {
    try {
      const logDir = path.join(__dirname, '..', 'logs');
      await fs.mkdir(logDir, { recursive: true });
      
      const logFile = path.join(logDir, `security-${new Date().toISOString().split('T')[0]}.log`);
      const logEntry = `${event.timestamp} [${event.severity}] ${event.type}: ${JSON.stringify(event.details)}\n`;
      
      await fs.appendFile(logFile, logEntry, { mode: 0o600 });
    } catch (error) {
      console.error('Failed to write security log:', error);
    }
  }

  // Advanced suspicious activity detection
  detectSuspiciousActivity(identifier, activity) {
    const key = identifier;
    const now = Date.now();
    
    if (!this.suspiciousActivity.has(key)) {
      this.suspiciousActivity.set(key, {
        activities: [],
        riskScore: 0,
        lastActivity: now
      });
    }
    
    const userActivity = this.suspiciousActivity.get(key);
    userActivity.activities.push({ activity, timestamp: now });
    userActivity.lastActivity = now;
    
    // Keep only recent activities (last hour)
    const oneHourAgo = now - 3600000;
    userActivity.activities = userActivity.activities.filter(a => a.timestamp > oneHourAgo);
    
    // Calculate risk score based on patterns
    let riskScore = 0;
    
    // Multiple failed logins
    const failedLogins = userActivity.activities.filter(a => a.activity === 'FAILED_LOGIN').length;
    if (failedLogins > 3) riskScore += failedLogins * 10;
    
    // Rapid succession of requests
    const rapidRequests = userActivity.activities.filter(a => a.timestamp > now - 60000).length;
    if (rapidRequests > 20) riskScore += 30;
    
    // Off-hours activity (assuming business hours 9-17)
    const currentHour = new Date().getHours();
    if (currentHour < 9 || currentHour > 17) riskScore += 5;
    
    // Multiple IP addresses (would need IP tracking)
    // Geographic anomalies (would need geo-IP)
    
    userActivity.riskScore = riskScore;
    
    // Trigger alerts for high risk scores
    if (riskScore > 50) {
      this.logSecurityEvent('SUSPICIOUS_PATTERN', {
        identifier,
        riskScore,
        recentActivities: userActivity.activities.slice(-5)
      });
    }
    
    return { riskScore, activities: userActivity.activities };
  }

  // Data integrity verification
  verifyDataIntegrity(data, expectedHash) {
    const actualHash = crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
    return actualHash === expectedHash;
  }

  // Generate integrity hash for data
  generateIntegrityHash(data) {
    return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
  }

  // Setup continuous security monitoring
  setupSecurityMonitoring() {
    // Monitor for suspicious patterns every 5 minutes
    setInterval(() => {
      this.analyzeSuspiciousPatterns();
    }, 5 * 60 * 1000);

    // Clean up old rate limiters every hour
    setInterval(() => {
      this.cleanupRateLimiters();
    }, 60 * 60 * 1000);

    // Rotate logs daily
    setInterval(() => {
      this.rotateSecurityLogs();
    }, 24 * 60 * 60 * 1000);
  }

  // Setup data integrity checking
  setupIntegrityChecking() {
    // Check data integrity every 30 minutes
    setInterval(() => {
      this.performIntegrityCheck();
    }, 30 * 60 * 1000);
  }

  // Analyze patterns across all users
  analyzeSuspiciousPatterns() {
    // Look for coordinated attacks, unusual traffic patterns, etc.
    for (const [identifier, activity] of this.suspiciousActivity) {
      if (activity.riskScore > 30 && activity.activities.length > 5) {
        // Pattern detected - could be automated attack
        const recentActivities = activity.activities.slice(-10);
        const uniqueActivities = new Set(recentActivities.map(a => a.activity));
        
        if (uniqueActivities.size < 3 && recentActivities.length > 5) {
          this.logSecurityEvent('BRUTE_FORCE_DETECTED', {
            identifier,
            pattern: Array.from(uniqueActivities),
            attempts: recentActivities.length
          });
        }
      }
    }
  }

  // Clean up old rate limiter entries
  cleanupRateLimiters() {
    const now = Date.now();
    for (const [key, limiter] of this.rateLimiters) {
      if (now > limiter.resetTime && limiter.attempts === 0) {
        this.rateLimiters.delete(key);
      }
    }
  }

  // Rotate security logs to prevent them from growing too large
  async rotateSecurityLogs() {
    try {
      const logDir = path.join(__dirname, '..', 'logs');
      const files = await fs.readdir(logDir);
      
      // Keep only last 30 days of logs
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      for (const file of files) {
        if (file.startsWith('security-')) {
          const dateStr = file.match(/security-(\d{4}-\d{2}-\d{2})\.log/)?.[1];
          if (dateStr) {
            const fileDate = new Date(dateStr);
            if (fileDate < thirtyDaysAgo) {
              await fs.unlink(path.join(logDir, file));
            }
          }
        }
      }
    } catch (error) {
      console.error('Log rotation failed:', error);
    }
  }

  // Perform periodic integrity checks
  async performIntegrityCheck() {
    try {
      // Check critical system files
      const criticalFiles = [
        path.join(__dirname, '..', 'server.js'),
        path.join(__dirname, '..', 'services', 'database.js'),
        path.join(__dirname, '..', 'services', 'websocket.js')
      ];
      
      for (const filePath of criticalFiles) {
        const content = await fs.readFile(filePath, 'utf8');
        const hash = crypto.createHash('sha256').update(content).digest('hex');
        const storedHash = this.integrityHashes.get(filePath);
        
        if (storedHash && storedHash !== hash) {
          this.logSecurityEvent('DATA_INTEGRITY_VIOLATION', {
            file: filePath,
            expectedHash: storedHash,
            actualHash: hash
          });
        } else if (!storedHash) {
          this.integrityHashes.set(filePath, hash);
        }
      }
    } catch (error) {
      console.error('Integrity check failed:', error);
    }
  }

  // Secure session token generation
  generateSecureToken() {
    return crypto.randomBytes(64).toString('base64url');
  }

  // Validate token format and structure (relaxed for JWT tokens)
  validateTokenFormat(token) {
    if (!token || typeof token !== 'string') return false;
    if (token.length < 10) return false;
    // Allow JWT format with dots and standard base64 characters
    if (!/^[A-Za-z0-9_\-\.]+$/.test(token)) return false;
    return true;
  }

  // Get security metrics for monitoring
  getSecurityMetrics() {
    const now = Date.now();
    const lastHour = now - 3600000;
    
    const recentEvents = this.securityEvents.filter(e => new Date(e.timestamp).getTime() > lastHour);
    const eventsByType = {};
    const eventsBySeverity = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 };
    
    recentEvents.forEach(event => {
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
      eventsBySeverity[event.severity]++;
    });
    
    return {
      totalEvents: this.securityEvents.length,
      recentEvents: recentEvents.length,
      eventsByType,
      eventsBySeverity,
      activeRateLimiters: this.rateLimiters.size,
      suspiciousUsers: Array.from(this.suspiciousActivity.entries())
        .filter(([_, activity]) => activity.riskScore > 20)
        .length,
      lastIntegrityCheck: this.lastIntegrityCheck || 'Never'
    };
  }
}

// Create singleton instance
const enhancedSecurity = new EnhancedSecurity();

module.exports = enhancedSecurity;