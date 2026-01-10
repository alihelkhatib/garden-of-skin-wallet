const crypto = require("crypto");

function nowIso() {
  return new Date().toISOString();
}

function randomToken(bytes = 16) {
  return crypto.randomBytes(bytes).toString("hex");
}

function sha1File(filePath) {
  const data = require("fs").readFileSync(filePath);
  const hash = crypto.createHash("sha1");
  hash.update(data);
  return hash.digest("hex");
}

module.exports = {
  nowIso,
  randomToken,
  sha1File
};
