const bcrypt = require('bcrypt');
const { getData, saveData, loadData } = require('../services/database');

async function createAdminUser() {
  try {
    // Load existing data
    await loadData();
    const data = getData();
    
    // Check if admin already exists
    const existingUsers = Object.values(data.users);
    if (existingUsers.length > 0) {
      console.log(' Admin user already exists:', existingUsers[0].username);
      return;
    }
    
    // Create admin user
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'SecureAdmin123!';
    
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
    console.log(' Credentials:');
    console.log(`   Username: ${adminUsername}`);
    console.log(`   Password: ${adminPassword}`);
    console.log('');
    console.log('️  IMPORTANT: Please change the admin password after first login!');
    console.log(' You can now log in and create additional users from the admin panel.');
    
  } catch (error) {
    console.error(' Failed to create admin user:', error);
    process.exit(1);
  }
}

createAdminUser();