const crypto = require("crypto");
const Database = require("better-sqlite3");
const path = require("path");

const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.log("Usage: npm run create-staff -- <email> <password>");
  process.exit(1);
}

const dbPath =
  process.env.SQLITE_PATH ||
  path.join(__dirname, "..", "backend", "data", "app.db");
const db = new Database(dbPath);

const salt = crypto.randomBytes(16).toString("hex");
const hash = crypto
  .pbkdf2Sync(password, salt, 120000, 32, "sha256")
  .toString("hex");
const passwordHash = `${salt}:${hash}`;

try {
  db.prepare(
    "INSERT INTO staff_users (email, password_hash, created_at) VALUES (?, ?, ?)"
  ).run(email, passwordHash, new Date().toISOString());
  console.log("Staff user created");
} catch (err) {
  console.error("Failed to create staff user", err.message);
  process.exit(1);
}
