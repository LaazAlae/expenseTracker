const crypto = require('crypto');

// Government-grade AES-256-GCM encryption implementation
class MilitaryGradeEncryption {
  constructor() {
    // Use environment variable or generate secure random key
    this.encryptionKey = process.env.MASTER_ENCRYPTION_KEY || this.generateMasterKey();
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32; // 256 bits
    this.ivLength = 16;  // 128 bits
    this.tagLength = 16; // 128 bits
    this.saltLength = 32; // 256 bits
  }

  generateMasterKey() {
    const key = crypto.randomBytes(this.keyLength).toString('hex');
    console.warn(' CRITICAL: Generated new master encryption key. Set MASTER_ENCRYPTION_KEY environment variable!');
    console.warn(`MASTER_ENCRYPTION_KEY=${key}`);
    return key;
  }

  // Derive key from master key using PBKDF2
  deriveKey(salt, purpose = 'data') {
    const masterKey = Buffer.from(this.encryptionKey, 'hex');
    const purposeBuffer = Buffer.from(purpose, 'utf8');
    const combinedSalt = Buffer.concat([salt, purposeBuffer]);
    
    return crypto.pbkdf2Sync(masterKey, combinedSalt, 100000, this.keyLength, 'sha256');
  }

  // Military-grade encryption for sensitive data
  encrypt(plaintext, purpose = 'data') {
    try {
      const salt = crypto.randomBytes(this.saltLength);
      const iv = crypto.randomBytes(this.ivLength);
      const key = this.deriveKey(salt, purpose);
      
      const cipher = crypto.createCipher(this.algorithm, key, iv);
      
      let encrypted = cipher.update(plaintext, 'utf8');
      encrypted = Buffer.concat([encrypted, cipher.final()]);
      
      const authTag = cipher.getAuthTag();
      
      // Combine salt + iv + authTag + encrypted data
      const result = Buffer.concat([
        salt,
        iv,
        authTag,
        encrypted
      ]);
      
      return result.toString('base64');
    } catch (error) {
      console.error('Encryption failed:', error.message);
      throw new Error('Encryption failed');
    }
  }

  // Military-grade decryption
  decrypt(encryptedData, purpose = 'data') {
    try {
      const buffer = Buffer.from(encryptedData, 'base64');
      
      // Extract components
      const salt = buffer.slice(0, this.saltLength);
      const iv = buffer.slice(this.saltLength, this.saltLength + this.ivLength);
      const authTag = buffer.slice(this.saltLength + this.ivLength, this.saltLength + this.ivLength + this.tagLength);
      const encrypted = buffer.slice(this.saltLength + this.ivLength + this.tagLength);
      
      const key = this.deriveKey(salt, purpose);
      
      const decipher = crypto.createDecipher(this.algorithm, key, iv);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      
      return decrypted.toString('utf8');
    } catch (error) {
      console.error('Decryption failed:', error.message);
      throw new Error('Decryption failed or data corrupted');
    }
  }

  // Hash sensitive data with salt (one-way)
  hashData(data, purpose = 'hash') {
    const salt = crypto.randomBytes(this.saltLength);
    const hash = crypto.pbkdf2Sync(data, salt, 100000, 64, 'sha256');
    
    // Store salt + hash
    return {
      hash: Buffer.concat([salt, hash]).toString('base64'),
      verify: (inputData) => {
        const stored = Buffer.from(this.hash, 'base64');
        const storedSalt = stored.slice(0, this.saltLength);
        const storedHash = stored.slice(this.saltLength);
        
        const inputHash = crypto.pbkdf2Sync(inputData, storedSalt, 100000, 64, 'sha256');
        return crypto.timingSafeEqual(storedHash, inputHash);
      }
    };
  }

  // Encrypt JSON data
  encryptJSON(jsonData, purpose = 'json') {
    const jsonString = JSON.stringify(jsonData);
    return this.encrypt(jsonString, purpose);
  }

  // Decrypt JSON data
  decryptJSON(encryptedData, purpose = 'json') {
    const jsonString = this.decrypt(encryptedData, purpose);
    return JSON.parse(jsonString);
  }

  // Generate secure random tokens
  generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  // Zero out sensitive data from memory
  secureWipe(...variables) {
    variables.forEach(variable => {
      if (typeof variable === 'string') {
        // Overwrite string memory (best effort in JavaScript)
        for (let i = 0; i < variable.length; i++) {
          variable = variable.substring(0, i) + '0' + variable.substring(i + 1);
        }
      } else if (Buffer.isBuffer(variable)) {
        variable.fill(0);
      } else if (variable && typeof variable === 'object') {
        Object.keys(variable).forEach(key => {
          if (typeof variable[key] === 'string') {
            variable[key] = '0'.repeat(variable[key].length);
          }
        });
      }
    });
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  }
}

module.exports = new MilitaryGradeEncryption();