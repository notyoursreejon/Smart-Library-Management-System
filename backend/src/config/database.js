const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', '..', 'database.sqlite');

let db = null;
let dbReady = null;

function initDatabase() {
  if (dbReady) return dbReady;

  dbReady = initSqlJs().then(SQL => {
    try {
      if (fs.existsSync(DB_PATH)) {
        const fileBuffer = fs.readFileSync(DB_PATH);
        db = new SQL.Database(fileBuffer);
      } else {
        db = new SQL.Database();
      }
    } catch (e) {
      db = new SQL.Database();
    }

    db.run('PRAGMA journal_mode = WAL');
    db.run('PRAGMA foreign_keys = ON');
    initSchema();
    saveDb();
    return db;
  });

  return dbReady;
}

function getDb() {
  if (!db) throw new Error('Database not initialized. Call initDatabase() first.');
  return db;
}

function saveDb() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

// Helper to mimic better-sqlite3 API
function runQuery(sql, params = []) {
  db.run(sql, params);
  saveDb();
}

function getOne(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  let result = null;
  if (stmt.step()) {
    const columns = stmt.getColumnNames();
    const values = stmt.get();
    result = {};
    columns.forEach((col, i) => { result[col] = values[i]; });
  }
  stmt.free();
  return result;
}

function getAll(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results = [];
  const columns = stmt.getColumnNames();
  while (stmt.step()) {
    const values = stmt.get();
    const row = {};
    columns.forEach((col, i) => { row[col] = values[i]; });
    results.push(row);
  }
  stmt.free();
  return results;
}

function initSchema() {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'student' CHECK(role IN ('admin', 'librarian', 'student')),
      avatar_color TEXT DEFAULT '#6C63FF',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS books (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      isbn TEXT UNIQUE NOT NULL,
      category TEXT NOT NULL DEFAULT 'General',
      description TEXT DEFAULT '',
      cover_url TEXT DEFAULT '',
      pdf_path TEXT DEFAULT '',
      total_copies INTEGER NOT NULL DEFAULT 1,
      available_copies INTEGER NOT NULL DEFAULT 1,
      published_year INTEGER DEFAULT NULL,
      publisher TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS issues (
      id TEXT PRIMARY KEY,
      book_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      issued_by TEXT DEFAULT NULL,
      issue_date TEXT DEFAULT (datetime('now')),
      due_date TEXT NOT NULL,
      return_date TEXT DEFAULT NULL,
      status TEXT NOT NULL DEFAULT 'issued' CHECK(status IN ('issued', 'returned', 'overdue')),
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (book_id) REFERENCES books(id),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (issued_by) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS reservations (
      id TEXT PRIMARY KEY,
      book_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      reserved_at TEXT DEFAULT (datetime('now')),
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'fulfilled', 'cancelled')),
      queue_position INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (book_id) REFERENCES books(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS fines (
      id TEXT PRIMARY KEY,
      issue_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      amount REAL NOT NULL DEFAULT 0,
      paid INTEGER NOT NULL DEFAULT 0,
      paid_at TEXT DEFAULT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (issue_id) REFERENCES issues(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Create indexes (ignore if already exist)
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_books_isbn ON books(isbn)',
    'CREATE INDEX IF NOT EXISTS idx_books_title ON books(title)',
    'CREATE INDEX IF NOT EXISTS idx_books_author ON books(author)',
    'CREATE INDEX IF NOT EXISTS idx_issues_user ON issues(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_issues_book ON issues(book_id)',
    'CREATE INDEX IF NOT EXISTS idx_issues_status ON issues(status)',
    'CREATE INDEX IF NOT EXISTS idx_reservations_book ON reservations(book_id)',
    'CREATE INDEX IF NOT EXISTS idx_reservations_user ON reservations(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_fines_user ON fines(user_id)',
  ];
  indexes.forEach(sql => db.run(sql));
}

module.exports = { initDatabase, getDb, saveDb, runQuery, getOne, getAll };
