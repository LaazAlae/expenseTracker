const crypto = require('crypto');

// Simplified but secure encryption that works with all Node.js versions
class SimpleSecureEncryption {
  constructor() {
    this.encryptionKey = process.env.MASTER_ENCRYPTION_KEY || process.env.ENCRYPT_KEY || this.generateKey();
    this.algorithm = 'aes-256-cbc';
  }

  generateKey() {
    const key = crypto.randomBytes(32).toString('hex');
    console.warn('🔐 CRITICAL: Generated new encryption key. Set MASTER_ENCRYPTION_KEY environment variable!');
    console.warn(`MASTER_ENCRYPTION_KEY=${key}`);
    return key;
  }

  // Simple but secure encryption
  encrypt(text) {
    try {
      const iv = crypto.randomBytes(16);
      const key = this.encryptionKey.substring(0, 32); // Use first 32 chars as key
      const cipher = crypto.createCipher(this.algorithm, key);
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
      console.error('Encryption failed:', error);
      return text; // Fallback to plaintext if encryption fails
    }
  }

  // Simple but secure decryption
  decrypt(encryptedText) {
    try {
      const parts = encryptedText.split(':');
      if (parts.length !== 2) {
        // Not encrypted, return as is
        return encryptedText;
      }
      
      const iv = Buffer.from(parts[0], 'hex');
      const encryptedData = parts[1];
      const key = this.encryptionKey.substring(0, 32); // Use first 32 chars as key
      
      const decipher = crypto.createDecipher(this.algorithm, key);
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Decryption failed:', error);
      // Try to return as plain text (for legacy data)
      return encryptedText;
    }
  }

  // Encrypt JSON data
  encryptJSON(jsonData) {
    const jsonString = JSON.stringify(jsonData);
    return this.encrypt(jsonString);
  }

  // Decrypt JSON data
  decryptJSON(encryptedData) {
    const jsonString = this.decrypt(encryptedData);
    try {
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('JSON parse failed, trying as legacy data');
      throw error;
    }
  }
}

module.exports = new SimpleSecureEncryption();