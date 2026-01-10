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

## Local endpoints
- `GET /pass/test` -> signed test pass (`TEST-001`)
- `POST /passes` -> create a new pass
- `GET /passes/:serial/pkpass` -> download pass by serial
- `POST /auth/login` -> staff login
- `POST /passes/:serial/add_visit` -> add a visit
- `POST /passes/:serial/redeem` -> redeem a pass

## PassKit endpoints
- `POST /v1/devices/{deviceLibraryIdentifier}/registrations/{passTypeIdentifier}/{serialNumber}`
- `DELETE /v1/devices/{deviceLibraryIdentifier}/registrations/{passTypeIdentifier}/{serialNumber}`
- `GET /v1/devices/{deviceLibraryIdentifier}/registrations/{passTypeIdentifier}?passesUpdatedSince={tag}`
- `GET /v1/passes/{passTypeIdentifier}/{serialNumber}`

## Admin UI
Open `http://localhost:3000/admin/index.html` on a phone. Use the camera to scan the QR code or manually enter a serial.

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

See `docs/signing-restoration.md` for certificate restoration steps.

## TODOs (Phase 5)
1. Production hardening: HTTPS proxy, backups, logging, rate limiting.
