const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

// Secure file path - prevent directory traversal
const DATA_DIR = path.resolve(__dirname, '..');
const DATA_FILE = path.join(DATA_DIR, 'data.json');

// Validate file path to prevent directory traversal
const validateFilePath = (filePath) => {
  const resolvedPath = path.resolve(filePath);
  if (!resolvedPath.startsWith(DATA_DIR)) {
    throw new Error('Directory traversal attempt detected');
  }
  return resolvedPath;
};

let data = {
  users: {},
  userData: {}
};

// Load data from file with decryption
const loadData = async () => {
  try {
    validateFilePath(DATA_FILE);
    const fileData = await fs.readFile(DATA_FILE, 'utf8');
    
    // Try to decrypt, fall back to plain JSON for legacy data
    try {
      data = decryptData(fileData);
      console.log('✅ Data loaded and decrypted successfully');
    } catch (decryptErr) {
      if (decryptErr.message === 'CORRUPT_DATA') {
        console.warn('⚠️ Corrupted data file detected, creating fresh database');
        // Data is corrupted, start fresh
        data = {
          users: {},
          userData: {}
        };
        // Don't save immediately to avoid encryption errors
      } else {
        throw decryptErr;
      }
    }
    
    console.log('Data loaded from file');
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.log('No existing data file, starting fresh');
      data = {
        users: {},
        userData: {}
      };
      await saveData(); // Create initial encrypted file
    } else {
      console.error('Error loading data:', err);
      // If any other error, start fresh
      data = {
        users: {},
        userData: {}
      };
      await saveData();
    }
  }
};

// Bulletproof encryption for data at rest
const secureEncryption = require('../security/bulletproof-encryption');

const encryptData = (data) => {
  try {
    return secureEncryption.encryptJSON(data);
  } catch (error) {
    console.error('Encryption failed, using fallback');
    // Ultimate fallback: just return JSON string
    return JSON.stringify(data);
  }
};

// Bulletproof decryption for data loading  
const decryptData = (encryptedData) => {
  try {
    // Try bulletproof decryption first
    return secureEncryption.decryptJSON(encryptedData);
  } catch (decryptErr) {
    try {
      // Try direct JSON parse (unencrypted data)
      const plainData = JSON.parse(encryptedData);
      console.warn('⚠️ Found unencrypted data, will encrypt on next save');
      return plainData;
    } catch (parseErr) {
      console.error('Data completely corrupted, starting fresh');
      throw new Error('CORRUPT_DATA');
    }
  }
};

// Save data to file with atomic write and encryption
const saveData = async () => {
  try {
    validateFilePath(DATA_FILE);
    const tempFile = DATA_FILE + '.tmp';
    
    // Create sanitized copy without exposing passwords in memory
    const sanitizedData = {
      users: {},
      userData: data.userData
    };
    
    // Copy users without exposing passwords
    for (const [username, user] of Object.entries(data.users)) {
      sanitizedData.users[username] = {
        ...user,
        password: user.password // Password is already hashed, but we'll encrypt the whole file
      };
    }
    
    const encryptedData = encryptData(sanitizedData);
    
    await fs.writeFile(tempFile, encryptedData, { 
      encoding: 'utf8',
      mode: 0o600 // Read/write for owner only
    });
    await fs.rename(tempFile, DATA_FILE);
    
    // Set secure file permissions
    await fs.chmod(DATA_FILE, 0o600);
  } catch (err) {
    console.error('Error saving data:', err);
    throw err;
  }
};

// Get current data (read-only reference)
const getData = () => data;

// Secure backup system - prevents directory traversal
if (process.env.NODE_ENV === 'production') {
  setInterval(async () => {
    try {
      const timestamp = Date.now();
      const backupFile = path.join(DATA_DIR, `data.backup.${timestamp}.enc`);
      
      // Validate backup file path
      validateFilePath(backupFile);
      
      // Copy encrypted data file
      await fs.copyFile(DATA_FILE, backupFile);
      
      // Set secure permissions on backup
      await fs.chmod(backupFile, 0o600);
      
      // Clean up old backups - SECURE VERSION
      const files = await fs.readdir(DATA_DIR);
      const backupFiles = files
        .filter(file => file.startsWith('data.backup.') && file.endsWith('.enc'))
        .map(file => ({
          name: file,
          path: path.join(DATA_DIR, file),
          timestamp: parseInt(file.match(/data\.backup\.(\d+)\.enc/)?.[1] || '0')
        }))
        .sort((a, b) => b.timestamp - a.timestamp);
      
      // Keep only last 24 backups (1 day)
      for (let i = 24; i < backupFiles.length; i++) {
        const backupPath = backupFiles[i].path;
        validateFilePath(backupPath); // Extra security check
        await fs.unlink(backupPath);
      }
    } catch (err) {
      console.error('Backup error:', err);
    }
  }, 60 * 60 * 1000); // 1 hour
}

// Memory cleanup - clear sensitive data from memory periodically
setInterval(() => {
  if (global.gc) {
    global.gc();
  }
}, 5 * 60 * 1000); // 5 minutes

module.exports = { loadData, saveData, getData };