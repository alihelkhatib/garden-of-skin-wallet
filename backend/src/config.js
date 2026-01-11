const path = require("path");

function getConfig() {
  return {
    port: Number(process.env.PORT || 3000),
    passTypeId: process.env.PASS_TYPE_ID,
    teamId: process.env.TEAM_ID,
    organizationName: process.env.ORGANIZATION_NAME || "Garden of Skin",
    description: process.env.PASS_DESCRIPTION || "Garden of Skin Rewards",
    publicBaseUrl: process.env.PUBLIC_BASE_URL || "",
    webServiceUrl: process.env.WEB_SERVICE_URL || "",
    enforceHttps: process.env.ENFORCE_HTTPS === "true",
    certPath: process.env.CERT_PATH || "",
    keyPath: process.env.KEY_PATH || "",
    p12Path: process.env.P12_PATH || "",
    certPassword: process.env.CERT_PASSWORD || "",
    wwdrCertPath: process.env.WWDR_CERT_PATH || "",
    sqlitePath:
      process.env.SQLITE_PATH ||
      path.join(__dirname, "..", "data", "app.db"),
    apnsKeyId: process.env.APNS_KEY_ID || "",
    apnsTeamId: process.env.APNS_TEAM_ID || "",
    apnsPrivateKeyPath: process.env.APNS_PRIVATE_KEY_PATH || "",
    apnsHost: process.env.APNS_HOST || ""
  };
}

module.exports = {
  getConfig
};
