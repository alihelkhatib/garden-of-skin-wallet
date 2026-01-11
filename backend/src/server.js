const crypto = require("crypto");
const express = require("express");
const dotenv = require("dotenv");
const cookie = require("cookie");
const path = require("path");
const { getConfig } = require("./config");
const { getDb } = require("./db");
const { nowIso, randomToken } = require("./utils");
const { createPkpass } = require("./passkit");
const { sendPassUpdate } = require("./apns");

dotenv.config();

const app = express();
const config = getConfig();
const db = getDb();

if (config.enforceHttps) {
  app.set("trust proxy", 1);
  app.use((req, res, next) => {
    const forwarded = req.headers["x-forwarded-proto"];
    if (req.secure || forwarded === "https") {
      return next();
    }
    return res.status(400).json({ error: "HTTPS required" });
  });
}

app.use(express.json({ limit: "1mb" }));
app.use("/admin", express.static(path.join(__dirname, "..", "..", "admin-ui")));

function assertSigningConfig() {
  if (!config.passTypeId || !config.teamId) {
    throw new Error("Missing PASS_TYPE_ID or TEAM_ID");
  }
  if (!config.certPath && !config.p12Path) {
    throw new Error("Missing CERT_PATH/KEY_PATH or P12_PATH");
  }
  if (!config.wwdrCertPath) {
    throw new Error("Missing WWDR_CERT_PATH");
  }
}

function getPublicBaseUrl(req) {
  if (config.publicBaseUrl) {
    return config.publicBaseUrl.replace(/\/$/, "");
  }
  return `${req.protocol}://${req.get("host")}`;
}

function generateSerial() {
  return `GOS-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
}

function getSessionToken(req) {
  if (!req.headers.cookie) {
    return null;
  }
  const parsed = cookie.parse(req.headers.cookie);
  return parsed.session_token || null;
}

function getAuthToken(req) {
  const header = req.headers.authorization || "";
  const parts = header.split(" ");
  if (parts.length === 2 && parts[0] === "ApplePass") {
    return parts[1];
  }
  return null;
}

function requireStaff(req, res, next) {
  const sessionToken = getSessionToken(req);
  if (!sessionToken) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const session = db
    .prepare("SELECT staff_user_id FROM sessions WHERE session_token = ?")
    .get(sessionToken);
  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  db.prepare("UPDATE sessions SET last_seen_at = ? WHERE session_token = ?").run(
    nowIso(),
    sessionToken
  );
  req.staffUserId = session.staff_user_id;
  return next();
}

function verifyPassword(password, stored) {
  if (!stored || !stored.includes(":")) {
    return false;
  }
  const [salt, hash] = stored.split(":");
  const candidate = crypto
    .pbkdf2Sync(password, salt, 120000, 32, "sha256")
    .toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(candidate, "hex"));
}

function recordAudit(action, details) {
  db.prepare("INSERT INTO audit_log (action, details, created_at) VALUES (?, ?, ?)")
    .run(action, details, nowIso());
}

function fetchPassBySerial(serialNumber) {
  return db
    .prepare("SELECT * FROM passes WHERE serial_number = ?")
    .get(serialNumber);
}

async function triggerPassUpdate(passId) {
  const tokens = db
    .prepare(
      "SELECT devices.push_token FROM devices JOIN device_registrations ON devices.id = device_registrations.device_id WHERE device_registrations.pass_id = ?"
    )
    .all(passId);

  for (const row of tokens) {
    try {
      await sendPassUpdate(row.push_token, config);
    } catch (err) {
      console.error("APNs push failed", err.message);
    }
  }
}

app.get("/pass/test", async (req, res) => {
  try {
    assertSigningConfig();
    const pass = {
      serialNumber: "TEST-001",
      visits: 0,
      authToken: "TEST-AUTH"
    };
    const { outputPath, cleanup } = await createPkpass(pass, config);
    res.setHeader("Content-Type", "application/vnd.apple.pkpass");
    res.setHeader("Content-Disposition", "attachment; filename=test.pkpass");
    res.sendFile(outputPath, (err) => {
      cleanup();
      if (err) {
        console.error(err);
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/passes", (req, res) => {
  const now = nowIso();
  let serialNumber = generateSerial();

  const insert = db.prepare(
    "INSERT INTO passes (serial_number, auth_token, visits, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
  );

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      insert.run(serialNumber, randomToken(16), 0, "active", now, now);
      recordAudit("pass_created", `serial=${serialNumber}`);
      break;
    } catch (err) {
      serialNumber = generateSerial();
      if (attempt === 4) {
        return res.status(500).json({ error: "Unable to generate serial" });
      }
    }
  }

  const baseUrl = getPublicBaseUrl(req);
  const downloadUrl = `${baseUrl}/passes/${serialNumber}/pkpass`;
  return res.json({ serialNumber, downloadUrl });
});

app.get("/passes/:serial/pkpass", async (req, res) => {
  const pass = fetchPassBySerial(req.params.serial);

  if (!pass) {
    return res.status(404).json({ error: "Pass not found" });
  }

  try {
    assertSigningConfig();
    const { outputPath, cleanup } = await createPkpass(
      {
        serialNumber: pass.serial_number,
        visits: pass.visits,
        authToken: pass.auth_token
      },
      config
    );
    res.setHeader("Content-Type", "application/vnd.apple.pkpass");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${pass.serial_number}.pkpass`
    );
    res.sendFile(outputPath, (err) => {
      cleanup();
      if (err) {
        console.error(err);
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

app.post("/auth/login", (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password required" });
  }

  const staff = db.prepare("SELECT * FROM staff_users WHERE email = ?").get(email);
  if (!staff || !verifyPassword(password, staff.password_hash)) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const sessionToken = randomToken(24);
  const now = nowIso();
  db.prepare(
    "INSERT INTO sessions (staff_user_id, session_token, created_at, last_seen_at) VALUES (?, ?, ?, ?)"
  ).run(staff.id, sessionToken, now, now);
  db.prepare("UPDATE staff_users SET last_login_at = ? WHERE id = ?").run(now, staff.id);

  res.setHeader(
    "Set-Cookie",
    cookie.serialize("session_token", sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      maxAge: 60 * 60 * 8
    })
  );

  return res.json({ ok: true });
});

app.post("/auth/logout", (req, res) => {
  const token = getSessionToken(req);
  if (token) {
    db.prepare("DELETE FROM sessions WHERE session_token = ?").run(token);
  }
  res.setHeader(
    "Set-Cookie",
    cookie.serialize("session_token", "", {
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      maxAge: 0
    })
  );
  return res.json({ ok: true });
});

app.get("/passes/:serial", requireStaff, (req, res) => {
  const pass = db
    .prepare("SELECT serial_number, visits, status, updated_at FROM passes WHERE serial_number = ?")
    .get(req.params.serial);
  if (!pass) {
    return res.status(404).json({ error: "Pass not found" });
  }
  return res.json({
    serialNumber: pass.serial_number,
    visits: pass.visits,
    status: pass.status,
    updatedAt: pass.updated_at
  });
});

app.post("/passes/:serial/add_visit", requireStaff, async (req, res) => {
  const pass = db
    .prepare("SELECT id, visits FROM passes WHERE serial_number = ?")
    .get(req.params.serial);
  if (!pass) {
    return res.status(404).json({ error: "Pass not found" });
  }

  const updatedVisits = pass.visits + 1;
  db.prepare("UPDATE passes SET visits = ?, updated_at = ? WHERE id = ?")
    .run(updatedVisits, nowIso(), pass.id);

  recordAudit("visit_added", `serial=${req.params.serial}, visits=${updatedVisits}`);
  await triggerPassUpdate(pass.id);

  return res.json({ ok: true, visits: updatedVisits });
});

app.post("/passes/:serial/redeem", requireStaff, async (req, res) => {
  const pass = db
    .prepare("SELECT id FROM passes WHERE serial_number = ?")
    .get(req.params.serial);
  if (!pass) {
    return res.status(404).json({ error: "Pass not found" });
  }

  db.prepare("UPDATE passes SET status = ?, updated_at = ? WHERE id = ?")
    .run("redeemed", nowIso(), pass.id);

  recordAudit("pass_redeemed", `serial=${req.params.serial}`);
  await triggerPassUpdate(pass.id);

  return res.json({ ok: true });
});

app.post(
  "/v1/devices/:deviceLibraryIdentifier/registrations/:passTypeIdentifier/:serialNumber",
  (req, res) => {
    const { deviceLibraryIdentifier, passTypeIdentifier, serialNumber } = req.params;
    const authToken = getAuthToken(req);

    if (passTypeIdentifier !== config.passTypeId) {
      return res.status(404).send("Unknown pass type");
    }

    const pass = fetchPassBySerial(serialNumber);
    if (!pass || pass.auth_token !== authToken) {
      return res.status(401).send("Unauthorized");
    }

    const pushToken = req.body?.pushToken;
    if (!pushToken) {
      return res.status(400).send("Missing pushToken");
    }

    const now = nowIso();
    db.prepare(
      "INSERT OR IGNORE INTO devices (device_library_identifier, push_token, created_at) VALUES (?, ?, ?)"
    ).run(deviceLibraryIdentifier, pushToken, now);

    const device = db
      .prepare("SELECT id FROM devices WHERE device_library_identifier = ? AND push_token = ?")
      .get(deviceLibraryIdentifier, pushToken);

    const result = db
      .prepare(
        "INSERT OR IGNORE INTO device_registrations (device_id, pass_id, created_at) VALUES (?, ?, ?)"
      )
      .run(device.id, pass.id, now);

    return res.status(result.changes > 0 ? 201 : 200).send("");
  }
);

app.delete(
  "/v1/devices/:deviceLibraryIdentifier/registrations/:passTypeIdentifier/:serialNumber",
  (req, res) => {
    const { deviceLibraryIdentifier, passTypeIdentifier, serialNumber } = req.params;
    const authToken = getAuthToken(req);

    if (passTypeIdentifier !== config.passTypeId) {
      return res.status(404).send("Unknown pass type");
    }

    const pass = fetchPassBySerial(serialNumber);
    if (!pass || pass.auth_token !== authToken) {
      return res.status(401).send("Unauthorized");
    }

    const device = db
      .prepare("SELECT id FROM devices WHERE device_library_identifier = ?")
      .get(deviceLibraryIdentifier);
    if (!device) {
      return res.status(200).send("");
    }

    db.prepare("DELETE FROM device_registrations WHERE device_id = ? AND pass_id = ?")
      .run(device.id, pass.id);

    return res.status(200).send("");
  }
);

app.get(
  "/v1/devices/:deviceLibraryIdentifier/registrations/:passTypeIdentifier",
  (req, res) => {
    const { deviceLibraryIdentifier, passTypeIdentifier } = req.params;
    const authToken = getAuthToken(req);

    if (passTypeIdentifier !== config.passTypeId) {
      return res.status(404).send("Unknown pass type");
    }

    const pass = db.prepare("SELECT * FROM passes WHERE auth_token = ?").get(authToken);
    if (!pass) {
      return res.status(401).send("Unauthorized");
    }

    const device = db
      .prepare("SELECT id FROM devices WHERE device_library_identifier = ?")
      .get(deviceLibraryIdentifier);
    if (!device) {
      return res.json({ lastUpdated: nowIso(), serialNumbers: [] });
    }

    const registration = db
      .prepare("SELECT id FROM device_registrations WHERE device_id = ? AND pass_id = ?")
      .get(device.id, pass.id);
    if (!registration) {
      return res.status(401).send("Unauthorized");
    }

    const updatedSince = req.query.passesUpdatedSince;
    const rows = db
      .prepare(
        "SELECT passes.serial_number, passes.updated_at FROM passes JOIN device_registrations ON passes.id = device_registrations.pass_id WHERE device_registrations.device_id = ?"
      )
      .all(device.id);

    const serialNumbers = rows
      .filter((row) => !updatedSince || row.updated_at > updatedSince)
      .map((row) => row.serial_number);

    const lastUpdated = rows.reduce(
      (latest, row) => (row.updated_at > latest ? row.updated_at : latest),
      updatedSince || "1970-01-01T00:00:00Z"
    );

    return res.json({ lastUpdated, serialNumbers });
  }
);

app.get("/v1/passes/:passTypeIdentifier/:serialNumber", async (req, res) => {
  const { passTypeIdentifier, serialNumber } = req.params;
  const authToken = getAuthToken(req);

  if (passTypeIdentifier !== config.passTypeId) {
    return res.status(404).send("Unknown pass type");
  }

  const pass = fetchPassBySerial(serialNumber);
  if (!pass || pass.auth_token !== authToken) {
    return res.status(401).send("Unauthorized");
  }

  const modifiedSince = req.headers["if-modified-since"];
  if (modifiedSince && new Date(pass.updated_at) <= new Date(modifiedSince)) {
    return res.status(304).send("");
  }

  try {
    assertSigningConfig();
    const { outputPath, cleanup } = await createPkpass(
      {
        serialNumber: pass.serial_number,
        visits: pass.visits,
        authToken: pass.auth_token
      },
      config
    );
    res.setHeader("Content-Type", "application/vnd.apple.pkpass");
    res.setHeader("Last-Modified", new Date(pass.updated_at).toUTCString());
    res.sendFile(outputPath, (err) => {
      cleanup();
      if (err) {
        console.error(err);
      }
    });
  } catch (err) {
    return res.status(500).send("Pass generation failed");
  }
});

app.listen(config.port, () => {
  console.log(`Garden of Skin Wallet backend running on ${config.port}`);
});
