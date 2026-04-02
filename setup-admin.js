const db = require('./database');
const bcrypt = require('bcryptjs');

async function setupAdmin() {
  try {
    const adminEmail = 'admin@tetwit.org';
    const adminPassword = 'Admin@TeTWIT2024!';

    // Check if admin exists
    const existing = db.prepare('SELECT id FROM members WHERE email = ?').get(adminEmail);
    
    if (existing) {
      console.log('✅ Admin already exists - skipping creation');
      return;
    }

    // Create admin
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    
    db.prepare(`
      INSERT INTO members (
        first_name, last_name, email, college, 
        password_hash, role, membership_type, 
        declaration_accepted, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      'Admin', 'User', adminEmail, 'TeTWIT HQ',
      hashedPassword, 'admin', 'full', 1, 'active'
    );

    console.log('🎉 Admin account created!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Email:', adminEmail);
    console.log('🔑 Password:', adminPassword);
    console.log('🌐 URL: /pages/login.html');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch (error) {
    console.error('❌ Admin setup error:', error.message);
  }
}

setupAdmin();
