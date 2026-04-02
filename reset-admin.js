const db = require('./database');
const bcrypt = require('bcryptjs');

const adminEmail = 'admin@tetwit.org';
const adminPassword = 'Admin@TeTWIT2024!';

async function resetAdmin() {
  try {
    // Check if admin exists
    const admin = db.prepare('SELECT * FROM members WHERE email = ?').get(adminEmail);
    
    if (!admin) {
      console.log('❌ Admin not found! Creating new admin...');
      await createAdmin();
      return;
    }

    console.log('✅ Admin found:', admin.email);
    console.log('   Name:', admin.first_name, admin.last_name);
    console.log('   Role:', admin.role);

    // Reset password
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    
    db.prepare('UPDATE members SET password_hash = ? WHERE email = ?')
      .run(hashedPassword, adminEmail);

    console.log('\n✅ Password reset successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Email:', adminEmail);
    console.log('🔑 Password:', adminPassword);
    console.log('🌐 Login at: http://localhost:3000/pages/login.html');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function createAdmin() {
  try {
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

    console.log('✅ Admin created!');
    console.log('📧 Email:', adminEmail);
    console.log('🔑 Password:', adminPassword);

  } catch (error) {
    console.error('❌ Error creating admin:', error.message);
  }
}

resetAdmin();
