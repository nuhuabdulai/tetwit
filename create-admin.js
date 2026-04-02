const db = require('./database');
const bcrypt = require('bcryptjs');

// Admin credentials
const adminEmail = 'admin@tetwit.org';
const adminPassword = 'Admin@TeTWIT2024!';
const adminFirstName = 'Admin';
const adminLastName = 'User';
const adminCollege = 'TeTWIT HQ';

async function createAdmin() {
  try {
    // Check if admin already exists
    const existing = db.prepare('SELECT id FROM members WHERE email = ?').get(adminEmail);
    
    if (existing) {
      console.log('✅ Admin already exists!');
      console.log('📧 Email:', adminEmail);
      console.log('🔑 Password: Admin@TeTWIT2024!');
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    // Create admin user
    const stmt = db.prepare(`
      INSERT INTO members (
        first_name, last_name, email, college, 
        password_hash, role, membership_type, 
        declaration_accepted, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    stmt.run(
      adminFirstName,
      adminLastName,
      adminEmail,
      adminCollege,
      hashedPassword,
      'admin',
      'full',
      1,
      'active'
    );

    console.log('✅ Admin account created successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Email:', adminEmail);
    console.log('🔑 Password: Admin@TeTWIT2024!');
    console.log('🌐 Login at: /pages/login.html');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch (error) {
    console.error('❌ Error creating admin:', error.message);
  }
}

createAdmin();
