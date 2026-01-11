# Implementation Plan

## Phase 0: Lock down signing assets
1. Store certs and keys outside repo.
2. Load signing config from env vars.
3. Add .gitignore rules for secrets.
4. Document restoration procedure.

## Phase 1: Automated pkpass generation
1. `GET /pass/test` generates a signed pass.
2. Generate `pass.json`, manifest, signature, and zip.
3. Return `application/vnd.apple.pkpass` with download header.

## Phase 2: Serial numbers and database
1. SQLite schema for passes.
2. `POST /passes` to create pass + serial.
3. `GET /passes/:serial/pkpass` to download.

## Phase 3: Staff admin UI
1. Staff auth endpoints.
2. Mobile UI with QR scan and manual entry.
3. `POST /passes/:serial/add_visit` and `POST /passes/:serial/redeem`.
4. Audit log entries.

## Phase 4: PassKit updates
1. Add `webServiceURL` and `authenticationToken` to `pass.json`.
2. Implement PassKit endpoints.
3. Store device registrations.
4. Send APNs updates on visit changes.

## Phase 5: Production readiness
TODO:
1. HTTPS reverse proxy.
2. Backups.
3. Logging and rate limiting.
4. Health checks.
5. Environment separation.
6. Deployment docs.
