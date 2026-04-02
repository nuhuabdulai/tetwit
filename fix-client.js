const db = require('./database');

// Restore the client account (clear deleted_at)
const result = db.prepare('UPDATE members SET deleted_at = NULL, updated_at = ? WHERE id = 9')
  .run(new Date().toISOString());

console.log('🔧 Restoring Client Account (ID 9):');
console.log('='.repeat(70));
if (result.changes > 0) {
  console.log('✅ Client account restored successfully');
} else {
  console.log('⚠️  No changes made - client account may already be active');
}

// Verify final state
const retained = db.prepare('SELECT id, email, first_name, last_name, role, deleted_at FROM members WHERE id IN (8, 9)').all();
console.log('\n📋 Final Account Status:');
retained.forEach(m => {
  const status = m.deleted_at ? 'DELETED' : 'ACTIVE';
  console.log(`  ID ${m.id}: ${m.email} - ${m.role} [${status}]`);
});

// Count all accounts
const allCount = db.prepare('SELECT COUNT(*) as total FROM members').get().total;
const activeCount = db.prepare('SELECT COUNT(*) as active FROM members WHERE deleted_at IS NULL').get().active;
const deletedCount = db.prepare('SELECT COUNT(*) as deleted FROM members WHERE deleted_at IS NOT NULL').get().deleted;

console.log(`\n📊 Summary:`);
console.log(`  Total accounts in database: ${allCount}`);
console.log(`  Active accounts: ${activeCount}`);
console.log(`  Soft-deleted accounts: ${deletedCount}`);

process.exit(0);
