const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const dbPath =
  process.env.SQLITE_PATH ||
  path.join(__dirname, "..", "backend", "data", "app.db");

const dir = path.dirname(dbPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS passes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    serial_number TEXT NOT NULL UNIQUE,
    auth_token TEXT NOT NULL,
    visits INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS staff_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL,
    last_login_at TEXT
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    staff_user_id INTEGER NOT NULL,
    session_token TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL,
    last_seen_at TEXT NOT NULL,
    FOREIGN KEY(staff_user_id) REFERENCES staff_users(id)
  );

  CREATE TABLE IF NOT EXISTS devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_library_identifier TEXT NOT NULL,
    push_token TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE (device_library_identifier, push_token)
  );

  CREATE TABLE IF NOT EXISTS device_registrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id INTEGER NOT NULL,
    pass_id INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE (device_id, pass_id),
    FOREIGN KEY(device_id) REFERENCES devices(id),
    FOREIGN KEY(pass_id) REFERENCES passes(id)
  );

  CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,
    details TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
`);

console.log("Database initialized at", dbPath);
