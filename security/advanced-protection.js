const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Advanced security protection system
class AdvancedSecurityProtection {
  constructor() {
    this.suspiciousIPs = new Map();
    this.rateLimits = new Map();
    this.sessionIntegrity = new Map();
    this.securityEvents = [];
    this.maxSecurityEvents = 10000;
    
    // Initialize security monitoring
    this.initializeSecurityMonitoring();
  }

  initializeSecurityMonitoring() {
    // Monitor for suspicious patterns every minute
    setInterval(() => {
      this.analyzeSecurityPatterns();
      this.cleanupOldData();
    }, 60000);

    // Enhanced memory protection
    setInterval(() => {
      if (global.gc) {
        global.gc();
      }
      this.secureMemoryCleanup();
    }, 30000);
  }

  // Rate limiting with progressive penalties
  checkAdvancedRateLimit(ip, action, maxAttempts = 10, windowMs = 60000) {
    const key = `${ip}:${action}`;
    const now = Date.now();
    
    if (!this.rateLimits.has(key)) {
      this.rateLimits.set(key, {
        attempts: 1,
        firstAttempt: now,
        lastAttempt: now,
        penalty: 0
      });
      return { allowed: true, remaining: maxAttempts - 1 };
    }
    
    const limit = this.rateLimits.get(key);
    
    // Reset window if expired
    if (now - limit.firstAttempt > windowMs + limit.penalty) {
      limit.attempts = 1;
      limit.firstAttempt = now;
      limit.penalty = Math.max(0, limit.penalty - windowMs);
      return { allowed: true, remaining: maxAttempts - 1 };
    }
    
    limit.attempts++;
    limit.lastAttempt = now;
    
    if (limit.attempts > maxAttempts) {
      // Progressive penalty: each violation doubles the penalty time
      limit.penalty = Math.min(limit.penalty * 2 || windowMs, 24 * 60 * 60 * 1000); // Max 24 hours
      
      this.logSecurityEvent('RATE_LIMIT_VIOLATION', {
        ip,
        action,
        attempts: limit.attempts,
        penalty: limit.penalty
      });
      
      return {
        allowed: false,
        remaining: 0,
        retryAfter: Math.floor((windowMs + limit.penalty - (now - limit.firstAttempt)) / 1000)
      };
    }
    
    return { allowed: true, remaining: maxAttempts - limit.attempts };
  }

  // Advanced suspicious activity detection
  detectAdvancedThreats(ip, userAgent, request) {
    const suspiciousScore = this.calculateThreatScore(ip, userAgent, request);
    
    if (suspiciousScore > 70) {
      this.logSecurityEvent('HIGH_THREAT_DETECTED', {
        ip,
        userAgent,
        score: suspiciousScore,
        request: {
          url: request.url,
          method: request.method,
          headers: this.sanitizeHeaders(request.headers)
        }
      });
      
      // Immediate rate limit penalty for high-threat IPs
      const key = `${ip}:THREAT_PENALTY`;
      this.rateLimits.set(key, {
        attempts: 1000,
        firstAttempt: Date.now(),
        penalty: 60 * 60 * 1000 // 1 hour penalty
      });
      
      return { threat: 'HIGH', action: 'BLOCK' };
    }
    
    if (suspiciousScore > 40) {
      this.logSecurityEvent('MEDIUM_THREAT_DETECTED', {
        ip,
        userAgent,
        score: suspiciousScore
      });
      
      return { threat: 'MEDIUM', action: 'MONITOR' };
    }
    
    return { threat: 'LOW', action: 'ALLOW' };
  }

  calculateThreatScore(ip, userAgent, request) {
    let score = 0;
    
    // Check for common attack patterns
    const url = request.url.toLowerCase();
    const attackPatterns = [
      '../', '..\\\\', '%2e%2e', 'etc/passwd', 'boot.ini',
      '<script', 'javascript:', 'vbscript:', 'onload=', 'onerror=',
      'union select', 'drop table', 'insert into', '1=1',
      'cmd.exe', 'powershell', '/bin/sh', 'wget ', 'curl '
    ];
    
    attackPatterns.forEach(pattern => {
      if (url.includes(pattern)) {
        score += 25;
      }
    });
    
    // Check user agent
    if (!userAgent || userAgent.length < 10) score += 20;
    if (userAgent && userAgent.toLowerCase().includes('bot')) score += 15;
    if (userAgent && userAgent.toLowerCase().includes('scanner')) score += 30;
    if (userAgent && userAgent.toLowerCase().includes('sqlmap')) score += 50;
    
    // Check for suspicious request patterns
    if (request.method === 'POST' && !request.headers['content-type']) score += 10;
    if (request.headers['x-forwarded-for'] && request.headers['x-forwarded-for'].split(',').length > 5) score += 15;
    
    // Check IP reputation (simplified - in production, use threat intelligence feeds)
    if (this.isKnownThreatIP(ip)) score += 40;
    
    return Math.min(score, 100);
  }

  isKnownThreatIP(ip) {
    // Simplified threat IP detection
    const threatPatterns = [
      /^10\.0\.0\./, // Private networks shouldn't be external threats in most cases
      /^192\.168\./, // Private networks
      /^172\.(1[6-9]|2[0-9]|3[01])\./, // Private networks
      /^127\./ // Localhost
    ];
    
    // In production, integrate with threat intelligence feeds
    return false;
  }

  // Session integrity protection
  createSessionIntegrity(sessionId, userData) {
    const integrity = {
      hash: this.hashSessionData(userData),
      created: Date.now(),
      lastAccess: Date.now(),
      accessCount: 1
    };
    
    this.sessionIntegrity.set(sessionId, integrity);
    return integrity;
  }

  validateSessionIntegrity(sessionId, userData) {
    const integrity = this.sessionIntegrity.get(sessionId);
    if (!integrity) {
      return { valid: false, reason: 'NO_INTEGRITY_DATA' };
    }
    
    const currentHash = this.hashSessionData(userData);
    if (currentHash !== integrity.hash) {
      this.logSecurityEvent('SESSION_INTEGRITY_VIOLATION', {
        sessionId: sessionId.substring(0, 8) + '...',
        expected: integrity.hash.substring(0, 16) + '...',
        actual: currentHash.substring(0, 16) + '...'
      });
      
      return { valid: false, reason: 'INTEGRITY_MISMATCH' };
    }
    
    integrity.lastAccess = Date.now();
    integrity.accessCount++;
    
    return { valid: true };
  }

  hashSessionData(userData) {
    const dataString = JSON.stringify({
      userId: userData.userId,
      username: userData.username,
      isAdmin: userData.isAdmin
    });
    
    return crypto.createHash('sha256').update(dataString).digest('hex');
  }

  // Anti-tampering protection for critical files
  async createFileIntegrity(filePath) {
    try {
      const content = await fs.promises.readFile(filePath);
      const hash = crypto.createHash('sha256').update(content).digest('hex');
      
      const integrityFile = filePath + '.integrity';
      await fs.promises.writeFile(integrityFile, JSON.stringify({
        hash,
        size: content.length,
        created: Date.now(),
        path: path.basename(filePath)
      }), { mode: 0o600 });
      
      return hash;
    } catch (error) {
      console.error('Failed to create file integrity:', error);
      return null;
    }
  }

  async verifyFileIntegrity(filePath) {
    try {
      const integrityFile = filePath + '.integrity';
      const integrityData = JSON.parse(await fs.promises.readFile(integrityFile, 'utf8'));
      
      const content = await fs.promises.readFile(filePath);
      const currentHash = crypto.createHash('sha256').update(content).digest('hex');
      
      if (currentHash !== integrityData.hash || content.length !== integrityData.size) {
        this.logSecurityEvent('FILE_INTEGRITY_VIOLATION', {
          file: path.basename(filePath),
          expected: integrityData.hash.substring(0, 16) + '...',
          actual: currentHash.substring(0, 16) + '...',
          expectedSize: integrityData.size,
          actualSize: content.length
        });
        
        return { valid: false, reason: 'INTEGRITY_VIOLATION' };
      }
      
      return { valid: true };
    } catch (error) {
      return { valid: false, reason: 'NO_INTEGRITY_FILE' };
    }
  }

  // Security event logging with structured data
  logSecurityEvent(type, data) {
    const event = {
      type,
      timestamp: Date.now(),
      iso: new Date().toISOString(),
      data: this.sanitizeLogData(data),
      severity: this.getEventSeverity(type)
    };
    
    this.securityEvents.push(event);
    
    // Keep only recent events
    if (this.securityEvents.length > this.maxSecurityEvents) {
      this.securityEvents.splice(0, this.securityEvents.length - this.maxSecurityEvents);
    }
    
    // Log to console for immediate visibility
    console.log(` SECURITY [${event.severity}] ${type}:`, JSON.stringify(data, null, 2));
    
    // In production, send to SIEM/logging system
    this.sendToSecurityMonitoring(event);
  }

  getEventSeverity(type) {
    const severityMap = {
      'HIGH_THREAT_DETECTED': 'CRITICAL',
      'FILE_INTEGRITY_VIOLATION': 'CRITICAL',
      'SESSION_INTEGRITY_VIOLATION': 'HIGH',
      'RATE_LIMIT_VIOLATION': 'MEDIUM',
      'MEDIUM_THREAT_DETECTED': 'MEDIUM',
      'WEBSOCKET_AUTHENTICATED': 'INFO',
      'FUNDS_ADDED': 'INFO',
      'TRANSACTION_ADDED': 'INFO'
    };
    
    return severityMap[type] || 'LOW';
  }

  sanitizeLogData(data) {
    if (!data) return data;
    
    const sanitized = { ...data };
    
    // Remove sensitive information from logs
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'hash'];
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }

  sanitizeHeaders(headers) {
    const sanitized = { ...headers };
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
    
    sensitiveHeaders.forEach(header => {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }

  analyzeSecurityPatterns() {
    // Analyze recent events for patterns
    const recentEvents = this.securityEvents.filter(
      event => Date.now() - event.timestamp < 60 * 60 * 1000 // Last hour
    );
    
    // Detect brute force patterns
    const authFailures = recentEvents.filter(
      event => event.type === 'RATE_LIMIT_VIOLATION' && 
               event.data.action && 
               event.data.action.includes('auth')
    );
    
    if (authFailures.length > 10) {
      this.logSecurityEvent('BRUTE_FORCE_DETECTED', {
        failures: authFailures.length,
        timeWindow: '1hour',
        action: 'ENHANCED_MONITORING'
      });
    }
  }

  cleanupOldData() {
    const now = Date.now();
    const oldDataThreshold = 24 * 60 * 60 * 1000; // 24 hours
    
    // Cleanup rate limits
    for (const [key, data] of this.rateLimits.entries()) {
      if (now - data.lastAttempt > oldDataThreshold) {
        this.rateLimits.delete(key);
      }
    }
    
    // Cleanup session integrity data
    for (const [key, data] of this.sessionIntegrity.entries()) {
      if (now - data.lastAccess > oldDataThreshold) {
        this.sessionIntegrity.delete(key);
      }
    }
    
    // Cleanup old security events
    this.securityEvents = this.securityEvents.filter(
      event => now - event.timestamp < 7 * 24 * 60 * 60 * 1000 // Keep 7 days
    );
  }

  secureMemoryCleanup() {
    // Clear sensitive data from memory
    if (global.gc) {
      global.gc();
    }
    
    // Additional memory security measures could be implemented here
  }

  sendToSecurityMonitoring(event) {
    // In production, send to external SIEM/monitoring system
    // For now, just ensure it's logged
    if (event.severity === 'CRITICAL') {
      console.error(' CRITICAL SECURITY EVENT:', event);
    }
  }

  // Generate security report
  generateSecurityReport() {
    const now = Date.now();
    const last24h = now - (24 * 60 * 60 * 1000);
    
    const recentEvents = this.securityEvents.filter(
      event => event.timestamp > last24h
    );
    
    const eventsByType = recentEvents.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {});
    
    const eventsBySeverity = recentEvents.reduce((acc, event) => {
      acc[event.severity] = (acc[event.severity] || 0) + 1;
      return acc;
    }, {});
    
    return {
      timeRange: { from: new Date(last24h).toISOString(), to: new Date(now).toISOString() },
      totalEvents: recentEvents.length,
      eventsByType,
      eventsBySeverity,
      activeRateLimits: this.rateLimits.size,
      activeSessions: this.sessionIntegrity.size,
      threatLevel: this.calculateOverallThreatLevel(recentEvents)
    };
  }

  calculateOverallThreatLevel(events) {
    const criticalCount = events.filter(e => e.severity === 'CRITICAL').length;
    const highCount = events.filter(e => e.severity === 'HIGH').length;
    
    if (criticalCount > 0) return 'CRITICAL';
    if (highCount > 5) return 'HIGH';
    if (highCount > 0 || events.length > 100) return 'MEDIUM';
    return 'LOW';
  }
}

module.exports = new AdvancedSecurityProtection();