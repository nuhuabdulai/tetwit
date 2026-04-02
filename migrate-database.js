const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Database migration script for Render deployment
console.log('🚀 Starting database migration...');

// Ensure database directory exists
const dbDir = path.join(__dirname, 'assets', 'db');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Connect to database
const dbPath = path.join(dbDir, 'tetwit.db');
const db = new Database(dbPath);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// Enable foreign key constraints for data integrity
db.pragma('foreign_keys = ON');

try {
  // Check if role column exists in members table (compatible SQLite syntax)
  const tableInfo = db.prepare(`PRAGMA table_info(members)`).all();
  const roleColumnExists = tableInfo.some(column => column.name === 'role');
  
  if (!roleColumnExists) {
    console.log('🔧 Adding missing role column to members table...');
    
    // Add role column to members table
    db.exec(`ALTER TABLE members ADD COLUMN role TEXT DEFAULT 'member'`);
    
    console.log('✅ Role column added successfully');
    
    // Update existing records to have default role
    db.exec(`UPDATE members SET role = 'member' WHERE role IS NULL`);
    
    console.log('✅ Default roles assigned to existing members');
  } else {
    console.log('✅ Role column already exists in members table');
  }
  
  console.log('🎉 Database migration completed successfully!');
  
} catch (error) {
  console.error('❌ Database migration failed:', error.message);
  process.exit(1);
} finally {
  db.close();
}