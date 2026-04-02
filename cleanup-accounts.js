const db = require('./database');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Generate a cryptographically secure random password
function generateSecurePassword(length = 16) {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
  let password = '';
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    password += charset[bytes[i] % charset.length];
  }
  // Ensure at least one of each: lowercase, uppercase, number, special
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password);
  if (!hasLower || !hasUpper || !hasNumber || !hasSpecial) {
    return generateSecurePassword(length); // Regenerate if missing any category
  }
  return password;
}

// Main cleanup and password reset
async function cleanupAndReset() {
  console.log('🧹 Starting User Account Cleanup and Password Reset\n');
  console.log('='.repeat(70));

  // Step 1: Show current accounts
  console.log('\n📋 CURRENT ACCOUNTS:');
  const allMembers = db.prepare('SELECT id, email, first_name, last_name, role FROM members ORDER BY id').all();
  allMembers.forEach(m => {
    console.log(`  ID ${m.id}: ${m.email} (${m.first_name} ${m.last_name}) - ${m.role}`);
  });

  // Step 2: Identify accounts to keep and delete
  const accountsToKeep = new Set([8, 9]); // Admin and Client accounts
  const accountsToDelete = allMembers.filter(m => !accountsToKeep.has(m.id));

  console.log(`\n🗑️  ACCOUNTS TO DELETE (${accountsToDelete.length}):`);
  accountsToDelete.forEach(m => {
    console.log(`  ID ${m.id}: ${m.email} - ${m.first_name} ${m.last_name}`);
  });

  // Step 3: Generate new secure passwords for retained accounts
  console.log('\n🔐 GENERATING NEW SECURE PASSWORDS:');
  const newPasswords = {};

  for (const id of accountsToKeep) {
    const member = allMembers.find(m => m.id === id);
    const newPassword = generateSecurePassword(16);
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    
    // Update password in database
    db.prepare('UPDATE members SET password_hash = ?, updated_at = ? WHERE id = ?')
      .run(hashedPassword, new Date().toISOString(), id);
    
    newPasswords[id] = {
      email: member.email,
      first_name: member.first_name,
      last_name: member.last_name,
      role: member.role,
      password: newPassword
    };
    
    console.log(`  ✅ ${member.email}: New password generated (length: ${newPassword.length})`);
  }

  // Step 4: Delete unwanted accounts
  console.log('\n🗑️  DELETING UNWANTED ACCOUNTS:');
  for (const member of accountsToDelete) {
    // Soft delete by setting deleted_at timestamp
    db.prepare('UPDATE members SET deleted_at = ?, updated_at = ? WHERE id = ?')
      .run(new Date().toISOString(), new Date().toISOString(), member.id);
    console.log(`  ✅ Deleted ID ${member.id}: ${member.email}`);
  }

  // Step 5: Verify final state
  console.log('\n✅ CLEANUP COMPLETE');
  console.log('='.repeat(70));
  console.log('\n📋 REMAINING ACTIVE ACCOUNTS:');
  const remaining = db.prepare('SELECT id, email, first_name, last_name, role, deleted_at FROM members ORDER BY id').all();
  remaining.forEach(m => {
    const status = m.deleted_at ? 'DELETED' : 'ACTIVE';
    console.log(`  ID ${m.id}: ${m.email} (${m.first_name} ${m.last_name}) - ${m.role} [${status}]`);
  });

  // Step 6: Display credentials in secure format
  console.log('\n' + '='.repeat(70));
  console.log('🔑 LOGIN CREDENTIALS FOR RETAINED ACCOUNTS');
  console.log('='.repeat(70));
  console.log('\n⚠️  IMPORTANT: Save these credentials in a secure password manager.');
  console.log('   These passwords will not be shown again.\n');

  for (const [id, creds] of Object.entries(newPasswords)) {
    console.log(`\n📧 ${creds.role.toUpperCase()} ACCOUNT:`);
    console.log(`   Email: ${creds.email}`);
    console.log(`   Name: ${creds.first_name} ${creds.last_name}`);
    console.log(`   Password: ${creds.password}`);
    console.log(`   Role: ${creds.role}`);
  }

  console.log('\n' + '='.repeat(70));
  console.log('✅ All unwanted accounts have been removed.');
  console.log('✅ New secure passwords have been generated and saved.');
  console.log('='.repeat(70));

  process.exit(0);
}

// Run the cleanup
cleanupAndReset().catch(error => {
  console.error('❌ Error during cleanup:', error);
  process.exit(1);
});
