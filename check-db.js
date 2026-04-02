const path = require('path');
const db = require('better-sqlite3')(path.join(__dirname, 'assets', 'db', 'tetwit.db'));

console.log('🔍 Checking Account Lockout Status in Database\n');
console.log('=' .repeat(60));

// Check admin account
const admin = db.prepare('SELECT id, email, failed_attempts, locked_until, last_login FROM members WHERE email = ?').get('admin@tetwit.org');
console.log('👤 Admin Account:');
console.log(`  Email: ${admin.email}`);
console.log(`  ID: ${admin.id}`);
console.log(`  Failed Attempts: ${admin.failed_attempts}`);
console.log(`  Locked Until: ${admin.locked_until || 'Not locked'}`);
console.log(`  Last Login: ${admin.last_login || 'Never'}`);

console.log('\n' + '-'.repeat(60));

// Check client account
const client = db.prepare('SELECT id, email, failed_attempts, locked_until, last_login FROM members WHERE email = ?').get('client1@tetwit.org');
console.log('👤 Client Account:');
console.log(`  Email: ${client.email}`);
console.log(`  ID: ${client.id}`);
console.log(`  Failed Attempts: ${client.failed_attempts}`);
console.log(`  Locked Until: ${client.locked_until || 'Not locked'}`);
console.log(`  Last Login: ${client.last_login || 'Never'}`);

console.log('\n' + '=' .repeat(60));

// Check audit log entries
console.log('\n📋 Recent Audit Log Entries (Authentication Events):');
const auditLogs = db.prepare(`
  SELECT id, action, table_name, record_id, performed_by, ip_address, created_at 
  FROM audit_log 
  WHERE action IN ('login_success', 'login_failed', 'account_locked')
  ORDER BY created_at DESC 
  LIMIT 10
`).all();

if (auditLogs.length === 0) {
  console.log('  No authentication audit logs found.');
} else {
  auditLogs.forEach(log => {
    console.log(`  [${log.created_at}] ${log.action} on ${log.table_name} (ID: ${log.record_id || 'N/A'})`);
  });
}

console.log('\n' + '=' .repeat(60));
console.log('✅ Database verification complete');

process.exit(0);
