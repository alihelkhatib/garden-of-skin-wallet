# Garden of Skin Apple Wallet Loyalty Pass

Node.js Express + SQLite implementation for an Apple Wallet loyalty pass system.

## Stack Choice
Node.js Express + SQLite. Node provides fast JSON handling, easy process execution for OpenSSL, and a minimal deployment footprint.

## Setup
1. Install Node.js LTS (20 or 22) and OpenSSL.
2. Copy `.env.example` to `.env` and update values.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Initialize the database:
   ```bash
   npm run init-db
   ```
5. Create a staff user:
   ```bash
   npm run create-staff -- staff@gardenofskin.com supersecret
   ```
6. Start the server:
   ```bash
   npm start
   ```

## Raspberry Pi 2 Model B v1.1
Node 18 is recommended for ARMv7.

```bash
sudo apt-get update
sudo apt-get install -y build-essential python3 make g++ openssl
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18
node -v
```

Then install and run:
```bash
npm install
npm run init-db
npm run create-staff -- staff@gardenofskin.com supersecret
npm start
```

## Local endpoints
- `GET /health` -> health check
- `GET /pass/test` -> signed test pass (`TEST-001`)
- `POST /passes` -> create a new pass
- `GET /passes/:serial/pkpass` -> download pass by serial
- `POST /auth/login` -> staff login
- `POST /passes/:serial/add_visit` -> add a visit
- `POST /passes/:serial/redeem` -> redeem a pass
- `GET /passes/:serial/transactions` -> recent visit history

## PassKit endpoints
- `POST /v1/devices/{deviceLibraryIdentifier}/registrations/{passTypeIdentifier}/{serialNumber}`
- `DELETE /v1/devices/{deviceLibraryIdentifier}/registrations/{passTypeIdentifier}/{serialNumber}`
- `GET /v1/devices/{deviceLibraryIdentifier}/registrations/{passTypeIdentifier}?passesUpdatedSince={tag}`
- `GET /v1/passes/{passTypeIdentifier}/{serialNumber}`

## Admin UI
- Admin dashboard: `http://localhost:3000/admin/index.html`
- POS scan view: `http://localhost:3000/admin/pos.html`

## Required environment variables
- `PASS_TYPE_ID`
- `TEAM_ID`
- `CERT_PATH` or `P12_PATH`
- `KEY_PATH` (if using `CERT_PATH`)
- `CERT_PASSWORD` (if needed)
- `WWDR_CERT_PATH`
- `PUBLIC_BASE_URL`
- `WEB_SERVICE_URL`
- `APNS_KEY_ID`
- `APNS_TEAM_ID`
- `APNS_PRIVATE_KEY_PATH`
- `APNS_HOST`
- `ENFORCE_HTTPS`
- `RATE_LIMIT_WINDOW_MS`
- `RATE_LIMIT_MAX`
- `LOG_DIR`
- `BACKUP_DIR`

See `docs/signing-restoration.md` for certificate restoration steps.

## Production hardening
See `docs/production-hardening.md` for reverse proxy setup, backups, logging, and health checks.

## TODOs
- Monitoring and alerting.
\n## Operations\nSee docs/operational-runbook.md for deployment and runbook guidance.\n
