const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
const yazl = require("yazl");
const { sha1File } = require("./utils");

function buildPassJson(pass, config) {
  const payload = {
    formatVersion: 1,
    passTypeIdentifier: config.passTypeId,
    teamIdentifier: config.teamId,
    organizationName: config.organizationName,
    description: config.description,
    serialNumber: pass.serialNumber,
    storeCard: {
      primaryFields: [
        {
          key: "visits",
          label: "Visits",
          value: String(pass.visits)
        }
      ]
    },
    barcode: {
      format: "PKBarcodeFormatQR",
      message: pass.serialNumber,
      messageEncoding: "iso-8859-1"
    },
    barcodes: [
      {
        format: "PKBarcodeFormatQR",
        message: pass.serialNumber,
        messageEncoding: "iso-8859-1"
      }
    ],
    backgroundColor: "rgb(34, 114, 168)",
    foregroundColor: "rgb(255, 255, 255)",
    labelColor: "rgb(255, 255, 255)"
  };

  if (config.webServiceUrl) {
    payload.webServiceURL = config.webServiceUrl;
  }

  if (pass.authToken) {
    payload.authenticationToken = pass.authToken;
  }

  return payload;
}

function ensureSigningMaterial(config) {
  if (config.certPath && config.keyPath) {
    return {
      certPath: config.certPath,
      keyPath: config.keyPath,
      tempDir: null
    };
  }

  if (!config.p12Path) {
    throw new Error("Missing CERT_PATH/KEY_PATH or P12_PATH");
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "passkit-"));
  const certPath = path.join(tempDir, "pass-cert.pem");
  const keyPath = path.join(tempDir, "pass-key.pem");

  const baseArgs = ["pkcs12", "-in", config.p12Path];
  if (config.certPassword) {
    baseArgs.push("-passin", `pass:${config.certPassword}`);
  }

  execFileSync("openssl", [...baseArgs, "-out", certPath, "-clcerts", "-nokeys"], {
    stdio: "inherit"
  });
  execFileSync("openssl", [...baseArgs, "-out", keyPath, "-nocerts", "-nodes"], {
    stdio: "inherit"
  });

  return { certPath, keyPath, tempDir };
}

function writeManifest(files, manifestPath) {
  const manifest = {};
  for (const file of files) {
    manifest[file.name] = sha1File(file.path);
  }
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
}

function signManifest(manifestPath, signaturePath, config, signingMaterial) {
  const args = [
    "smime",
    "-binary",
    "-sign",
    "-signer",
    signingMaterial.certPath,
    "-inkey",
    signingMaterial.keyPath,
    "-in",
    manifestPath,
    "-out",
    signaturePath,
    "-outform",
    "DER"
  ];

  if (config.wwdrCertPath) {
    args.push("-certfile", config.wwdrCertPath);
  }

  if (config.certPassword) {
    args.push("-passin", `pass:${config.certPassword}`);
  }

  execFileSync("openssl", args, { stdio: "inherit" });
}

function zipPass(bundleDir, outputPath) {
  return new Promise((resolve, reject) => {
    const zipfile = new yazl.ZipFile();
    const output = fs.createWriteStream(outputPath);

    fs.readdirSync(bundleDir).forEach((filename) => {
      zipfile.addFile(path.join(bundleDir, filename), filename);
    });

    zipfile.outputStream.pipe(output).on("close", resolve).on("error", reject);
    zipfile.end();
  });
}

async function createPkpass(pass, config) {
  const signingMaterial = ensureSigningMaterial(config);
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "pkpass-"));

  const passJsonPath = path.join(workDir, "pass.json");
  const manifestPath = path.join(workDir, "manifest.json");
  const signaturePath = path.join(workDir, "signature");

  const passJson = buildPassJson(pass, config);
  fs.writeFileSync(passJsonPath, JSON.stringify(passJson, null, 2));

  const assetDir = path.join(__dirname, "..", "assets");
  const assets = ["icon.png", "icon@2x.png", "icon@3x.png"];

  const files = [{ name: "pass.json", path: passJsonPath }];

  for (const asset of assets) {
    const source = path.join(assetDir, asset);
    if (!fs.existsSync(source)) {
      throw new Error(`Missing asset ${asset}`);
    }
    const dest = path.join(workDir, asset);
    fs.copyFileSync(source, dest);
    files.push({ name: asset, path: dest });
  }

  writeManifest(files, manifestPath);
  files.push({ name: "manifest.json", path: manifestPath });

  signManifest(manifestPath, signaturePath, config, signingMaterial);
  files.push({ name: "signature", path: signaturePath });

  const outputPath = path.join(
    os.tmpdir(),
    `${pass.serialNumber}-${crypto.randomBytes(4).toString("hex")}.pkpass`
  );
  await zipPass(workDir, outputPath);

  const cleanup = () => {
    try {
      fs.rmSync(workDir, { recursive: true, force: true });
    } catch (err) {
      // ignore cleanup errors
    }
    if (signingMaterial.tempDir) {
      try {
        fs.rmSync(signingMaterial.tempDir, { recursive: true, force: true });
      } catch (err) {
        // ignore cleanup errors
      }
    }
  };

  return { outputPath, cleanup };
}

module.exports = {
  buildPassJson,
  createPkpass
};
