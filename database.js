const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Ensure database directory exists
const dbDir = path.join(__dirname, 'assets', 'db');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Create/connect to SQLite database
const dbPath = path.join(dbDir, 'tetwit.db');
const db = new Database(dbPath);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// Enable foreign key constraints for data integrity
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  -- Members table
  CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    whatsapp TEXT,
    gender TEXT,
    date_of_birth TEXT,
    college TEXT NOT NULL,
    program TEXT,
    year_of_study TEXT,
    academic_level TEXT,
    student_id TEXT,
    membership_type TEXT DEFAULT 'full',
    skills TEXT,
    interests TEXT,
    motivation TEXT,
    declaration_accepted INTEGER DEFAULT 0,
    signature_name TEXT,
    declaration_date TEXT,
    status TEXT DEFAULT 'active',
    deleted_at DATETIME,
    failed_attempts INTEGER DEFAULT 0,
    locked_until DATETIME,
    last_login DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Partnership inquiries table
  CREATE TABLE IF NOT EXISTS partnerships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organization_name TEXT NOT NULL,
    contact_person TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    partnership_type TEXT NOT NULL,
    message TEXT,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Events table
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    event_type TEXT NOT NULL,
    location TEXT,
    event_date DATETIME,
    registration_deadline DATETIME,
    max_participants INTEGER,
    status TEXT DEFAULT 'upcoming',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Event registrations table
  CREATE TABLE IF NOT EXISTS event_registrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    member_id INTEGER NOT NULL,
    registration_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    attendance_status TEXT DEFAULT 'registered',
    FOREIGN KEY (event_id) REFERENCES events(id),
    FOREIGN KEY (member_id) REFERENCES members(id)
  );

  -- Elections table
  CREATE TABLE IF NOT EXISTS elections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    position TEXT NOT NULL,
    college TEXT,
    zone TEXT,
    level TEXT NOT NULL,
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    status TEXT DEFAULT 'upcoming',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Candidates table
  CREATE TABLE IF NOT EXISTS candidates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    election_id INTEGER NOT NULL,
    member_id INTEGER NOT NULL,
    manifesto TEXT,
    votes INTEGER DEFAULT 0,
    FOREIGN KEY (election_id) REFERENCES elections(id),
    FOREIGN KEY (member_id) REFERENCES members(id)
  );

  -- Votes table (for secret ballot)
  CREATE TABLE IF NOT EXISTS votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    election_id INTEGER NOT NULL,
    candidate_id INTEGER NOT NULL,
    voter_id INTEGER NOT NULL,
    voted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (election_id) REFERENCES elections(id),
    FOREIGN KEY (candidate_id) REFERENCES candidates(id),
    FOREIGN KEY (voter_id) REFERENCES members(id),
    UNIQUE(election_id, voter_id)
  );

  -- Financial transactions table
  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    category TEXT NOT NULL,
    amount REAL NOT NULL,
    description TEXT,
    member_id INTEGER,
    approved_by_1 INTEGER,
    approved_by_2 INTEGER,
    transaction_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (member_id) REFERENCES members(id)
  );

  -- Mentorship matches table
  CREATE TABLE IF NOT EXISTS mentorships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mentor_name TEXT NOT NULL,
    mentor_email TEXT NOT NULL,
    mentor_organization TEXT,
    mentee_id INTEGER NOT NULL,
    focus_area TEXT,
    status TEXT DEFAULT 'active',
    start_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    end_date DATETIME,
    FOREIGN KEY (mentee_id) REFERENCES members(id)
  );

  -- Contact messages table
  CREATE TABLE IF NOT EXISTS contact_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'unread',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Resources table (for file sharing)
  CREATE TABLE IF NOT EXISTS resources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size INTEGER,
    file_type TEXT,
    uploaded_by INTEGER,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (uploaded_by) REFERENCES members(id)
  );

  -- Indexes for better query performance
  CREATE INDEX IF NOT EXISTS idx_members_email ON members(email);
  CREATE INDEX IF NOT EXISTS idx_members_status ON members(status);
  CREATE INDEX IF NOT EXISTS idx_members_role ON members(role);
  CREATE INDEX IF NOT EXISTS idx_members_college ON members(college);
  CREATE INDEX IF NOT EXISTS idx_event_registrations_event_id ON event_registrations(event_id);
  CREATE INDEX IF NOT EXISTS idx_event_registrations_member_id ON event_registrations(member_id);
  CREATE INDEX IF NOT EXISTS idx_candidates_election_id ON candidates(election_id);
  CREATE INDEX IF NOT EXISTS idx_candidates_member_id ON candidates(member_id);
  CREATE INDEX IF NOT EXISTS idx_votes_election_id ON votes(election_id);
  CREATE INDEX IF NOT EXISTS idx_votes_voter_id ON votes(voter_id);
  CREATE INDEX IF NOT EXISTS idx_transactions_member_id ON transactions(member_id);
  CREATE INDEX IF NOT EXISTS idx_resources_uploaded_by ON resources(uploaded_by);

  -- Audit log table for tracking important actions
  CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id INTEGER,
    old_values TEXT,
    new_values TEXT,
    performed_by INTEGER,
    ip_address TEXT,
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (performed_by) REFERENCES members(id)
  );

  CREATE INDEX IF NOT EXISTS idx_audit_log_table_record ON audit_log(table_name, record_id);
  CREATE INDEX IF NOT EXISTS idx_audit_log_performed_by ON audit_log(performed_by);
`);

// Migration: Add new columns if they don't exist
const migrateDb = () => {
  const columns = db.prepare("PRAGMA table_info(members)").all();
  const existingColumns = new Set(columns.map(col => col.name));
  const requiredColumns = [
    { name: 'password_hash', sql: "ALTER TABLE members ADD COLUMN password_hash TEXT" },
    { name: 'role', sql: "ALTER TABLE members ADD COLUMN role TEXT DEFAULT 'member'" },
    { name: 'last_login', sql: "ALTER TABLE members ADD COLUMN last_login DATETIME" },
    { name: 'whatsapp', sql: "ALTER TABLE members ADD COLUMN whatsapp TEXT" },
    { name: 'gender', sql: "ALTER TABLE members ADD COLUMN gender TEXT" },
    { name: 'date_of_birth', sql: "ALTER TABLE members ADD COLUMN date_of_birth TEXT" },
    { name: 'academic_level', sql: "ALTER TABLE members ADD COLUMN academic_level TEXT" },
    { name: 'student_id', sql: "ALTER TABLE members ADD COLUMN student_id TEXT" },
    { name: 'motivation', sql: "ALTER TABLE members ADD COLUMN motivation TEXT" },
    { name: 'declaration_accepted', sql: "ALTER TABLE members ADD COLUMN declaration_accepted INTEGER DEFAULT 0" },
    { name: 'signature_name', sql: "ALTER TABLE members ADD COLUMN signature_name TEXT" },
    { name: 'declaration_date', sql: "ALTER TABLE members ADD COLUMN declaration_date TEXT" },
    { name: 'deleted_at', sql: "ALTER TABLE members ADD COLUMN deleted_at DATETIME" },
    { name: 'failed_attempts', sql: "ALTER TABLE members ADD COLUMN failed_attempts INTEGER DEFAULT 0" },
    { name: 'locked_until', sql: "ALTER TABLE members ADD COLUMN locked_until DATETIME" }
  ];

  for (const column of requiredColumns) {
    if (!existingColumns.has(column.name)) {
      db.exec(column.sql);
      console.log(`✅ Added ${column.name} column to members table`);
    }
  }
  
  // Set default role for existing members
  db.prepare("UPDATE members SET role = 'member' WHERE role IS NULL").run();
};

migrateDb();

console.log('✅ Database tables created successfully');

module.exports = db;
