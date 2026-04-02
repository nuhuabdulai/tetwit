const db = require('./database');

// Check the actual state of the retained accounts
const retained = db.prepare('SELECT id, email, first_name, last_name, role, deleted_at, password_hash FROM members WHERE id IN (8, 9)').all();

console.log('🔍 Verifying Retained Accounts:');
console.log('='.repeat(70));
retained.forEach(m => {
  const status = m.deleted_at ? 'DELETED' : 'ACTIVE';
  const hasPassword = m.password_hash ? 'Yes' : 'No';
  console.log(`ID ${m.id}: ${m.email}`);
  console.log(`  Name: ${m.first_name} ${m.last_name}`);
  console.log(`  Role: ${m.role}`);
  console.log(`  Status: ${status}`);
  console.log(`  Has Password Hash: ${hasPassword}`);
  console.log('');
});

// Count active accounts
const activeCount = db.prepare('SELECT COUNT(*) as count FROM members WHERE deleted_at IS NULL').get().count;
console.log(`Total active accounts: ${activeCount}`);

process.exit(0);
