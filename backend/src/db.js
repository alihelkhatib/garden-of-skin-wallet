const Database = require("better-sqlite3");
const { getConfig } = require("./config");

function getDb() {
  const config = getConfig();
  return new Database(config.sqlitePath);
}

module.exports = {
  getDb
};
