const fs = require("fs");
const path = require("path");
const { getConfig } = require("../backend/src/config");

const config = getConfig();
const source = config.sqlitePath;

if (!fs.existsSync(source)) {
  console.error("Database not found:", source);
  process.exit(1);
}

if (!fs.existsSync(config.backupDir)) {
  fs.mkdirSync(config.backupDir, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const dest = path.join(config.backupDir, `app-${timestamp}.db`);

fs.copyFileSync(source, dest);
console.log("Backup created:", dest);
