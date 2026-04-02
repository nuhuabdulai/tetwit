const db = require('./database');
const bcrypt = require('bcryptjs');

async function testLogin() {
  const email = 'admin@tetwit.org';
  const password = 'Admin@TeTWIT2024!';

  try {
    console.log('🔍 Testing login...\n');

    // Find user
    const member = db.prepare('SELECT * FROM members WHERE email = ?').get(email);
    
    if (!member) {
      console.log('❌ User not found');
      console.log('\n📋 All users in database:');
      const users = db.prepare('SELECT id, email, role FROM members').all();
      users.forEach(u => console.log(`   - ${u.email} (${u.role})`));
      return;
    }

    console.log('✅ User found:', member.email);
    console.log('   Name:', member.first_name, member.last_name);
    console.log('   Role:', member.role);
    console.log('   Status:', member.status);
    
    // Check password field exists
    if (member.password_hash) {
      console.log('   Password field: password_hash ✅');
    } else if (member.password) {
      console.log('   Password field: password ✅');
    } else {
      console.log('   Password field: NOT FOUND ❌');
      console.log('   Available fields:', Object.keys(member));
    }

    // Test password
    try {
      const validPassword = await bcrypt.compare(password, member.password_hash || member.password);
      if (validPassword) {
        console.log('\n✅ Password validation: PASSED!');
      } else {
        console.log('\n❌ Password validation: FAILED');
        console.log('   Stored hash:', (member.password_hash || member.password).substring(0, 30) + '...');
      }
    } catch (err) {
      console.log('\n❌ Password comparison error:', err.message);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testLogin();
