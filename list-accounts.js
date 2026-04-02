const db = require('./database');

// Query all members
const allMembers = db.prepare('SELECT id, email, first_name, last_name, role, status, created_at FROM members ORDER BY id').all();

console.log('📋 Current User Accounts in System:');
console.log('='.repeat(80));
console.log(`Total accounts: ${allMembers.length}`);
console.log('');

if (allMembers.length === 0) {
  console.log('No accounts found in database.');
} else {
  console.log('ID  | Email                 | Name           | Role    | Status    | Created');
  console.log('-'.repeat(80));
  allMembers.forEach(member => {
    console.log(`${String(member.id).padStart(3)} | ${member.email.padEnd(20)} | ${(member.first_name + ' ' + member.last_name).padEnd(14)} | ${member.role.padEnd(7)} | ${member.status.padEnd(8)} | ${member.created_at}`);
  });
}

console.log('');
console.log('='.repeat(80));
process.exit(0);
