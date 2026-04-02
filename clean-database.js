const db = require('./database');

console.log('🧹 Starting database cleanup...\n');

// Clean up test/unwanted data
const cleanupActions = [];

// 1. Delete test accounts
const testEmails = [
  'test@test.com',
  'admin@test.com',
  'testuser@test.com',
  'john.doe@test.com',
  'jane.smith@test.com'
];

console.log('1️⃣ Removing test accounts...');
testEmails.forEach(email => {
  const result = db.prepare('DELETE FROM members WHERE email = ?').run(email);
  if (result.changes > 0) {
    cleanupActions.push(`Deleted test account: ${email}`);
  }
});

// 2. Delete members with empty names
console.log('2️⃣ Removing members with missing names...');
const emptyNameResult = db.prepare(`
  DELETE FROM members 
  WHERE (first_name IS NULL OR first_name = '') 
  AND (last_name IS NULL OR last_name = '')
`).run();
if (emptyNameResult.changes > 0) {
  cleanupActions.push(`Deleted ${emptyNameResult.changes} members with missing names`);
}

// 3. Delete members with placeholder colleges
console.log('3️⃣ Removing members with placeholder colleges...');
const placeholderColleges = [
  'Test College',
  'N/A',
  'None',
  'Unknown'
];
placeholderColleges.forEach(college => {
  const result = db.prepare('DELETE FROM members WHERE college = ?').run(college);
  if (result.changes > 0) {
    cleanupActions.push(`Deleted members from: ${college}`);
  }
});

// 4. Get current stats
const memberCount = db.prepare('SELECT COUNT(*) as count FROM members').get().count;
const adminCount = db.prepare("SELECT COUNT(*) as count FROM members WHERE role = 'admin'").get().count;
const activeCount = db.prepare("SELECT COUNT(*) as count FROM members WHERE status = 'active'").get().count;

console.log('\n✅ Database cleanup completed!');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📊 Current Database Stats:');
console.log(`   Total Members: ${memberCount}`);
console.log(`   Admins: ${adminCount}`);
console.log(`   Active Members: ${activeCount}`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

if (cleanupActions.length > 0) {
  console.log('\n🗑️  Cleanup Actions:');
  cleanupActions.forEach(action => console.log(`   • ${action}`));
} else {
  console.log('\n✨ No cleanup needed - database is clean!');
}

console.log('\n💡 Tip: Keep your admin account safe!');
console.log(`   Email: admin@tetwit.org`);
console.log(`   Password: Admin@TeTWIT2024!`);
