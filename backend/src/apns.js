const crypto = require("crypto");
const fs = require("fs");
const http2 = require("http2");

function base64Url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function createApnsJwt(config) {
  const header = {
    alg: "ES256",
    kid: config.apnsKeyId
  };
  const payload = {
    iss: config.apnsTeamId,
    iat: Math.floor(Date.now() / 1000)
  };

  const encodedHeader = base64Url(JSON.stringify(header));
  const encodedPayload = base64Url(JSON.stringify(payload));
  const unsigned = `${encodedHeader}.${encodedPayload}`;

  const privateKey = fs.readFileSync(config.apnsPrivateKeyPath);
  const signer = crypto.createSign("sha256");
  signer.update(unsigned);
  signer.end();
  const signature = signer.sign(privateKey);

  return `${unsigned}.${base64Url(signature)}`;
}

async function sendPassUpdate(pushToken, config) {
  if (!config.apnsKeyId || !config.apnsTeamId || !config.apnsPrivateKeyPath) {
    return { status: "skipped" };
  }

  const jwt = createApnsJwt(config);
  const host = config.apnsHost || "api.push.apple.com";
  const client = http2.connect(`https://${host}`);

  return new Promise((resolve, reject) => {
    const req = client.request({
      ":method": "POST",
      ":path": `/3/device/${pushToken}`,
      "apns-topic": config.passTypeId,
      "apns-push-type": "background",
      authorization: `bearer ${jwt}`
    });

    let responseBody = "";
    req.on("response", (headers) => {
      req.on("data", (chunk) => {
        responseBody += chunk;
      });
      req.on("end", () => {
        client.close();
        resolve({ status: headers[":status"], body: responseBody });
      });
    });

    req.on("error", (err) => {
      client.close();
      reject(err);
    });

    req.end(JSON.stringify({ aps: { "content-available": 1 } }));
  });
}

module.exports = {
  sendPassUpdate
};
