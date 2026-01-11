# Operational Runbook

## Overview
This runbook covers how to run the Garden of Skin Wallet service in production: hardware sizing, OS/runtime, deployment, backups, monitoring, and recovery.

## Recommended Hardware
### Small business (single location, <1k active passes)
- 1 vCPU
- 1-2 GB RAM
- 10 GB disk

### Medium (multi-location, <10k active passes)
- 2 vCPU
- 2-4 GB RAM
- 20+ GB disk

### Raspberry Pi 2 Model B v1.1
- Works for light usage and testing
- Use Node 18 on ARMv7
- Expect slower pass signing and slower IO

## Operating System
- Ubuntu 22.04 LTS or Debian 12 recommended
- Keep OS patched regularly

## Network and DNS
- Public HTTPS domain (Apple Wallet requires HTTPS)
- Port 443 open to the internet
- Port 80 open only for HTTP->HTTPS redirect

## Dependencies
- Node.js LTS (20 or 22 on x64; 18 on ARMv7)
- OpenSSL
- Nginx or Caddy for HTTPS reverse proxy

## Deployment Paths
Suggested layout on server:
```
/opt/garden-of-skin-wallet
  backend/
  admin-ui/
  scripts/
  docs/
  .env
  package.json
```

## Environment Configuration
- Copy `.env.example` to `.env`
- Set:
  - `PASS_TYPE_ID`, `TEAM_ID`
  - `CERT_PATH` and `KEY_PATH` (or `P12_PATH`)
  - `WWDR_CERT_PATH`
  - `PUBLIC_BASE_URL`
  - `WEB_SERVICE_URL`
  - `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_PRIVATE_KEY_PATH`
  - `APNS_HOST=api.push.apple.com` in production

## Install and Start
```
npm install
npm run init-db
npm run create-staff -- staff@gardenofskin.com strongpass
npm start
```

## Reverse Proxy (HTTPS)
Use `docs/production-hardening.md` for nginx config. Ensure:
- HSTS enabled
- `X-Forwarded-Proto` set

## Process Management
Use systemd:
```
sudo systemctl enable garden-of-skin-wallet
sudo systemctl start garden-of-skin-wallet
```

## Backups
Daily backup:
```
npm run backup-db
```
Cron example:
```
0 3 * * * /usr/bin/npm --prefix /opt/garden-of-skin-wallet run backup-db
```

## Restore
1. Stop service
2. Replace `backend/data/app.db` with most recent backup
3. Start service

## Monitoring
- Health check endpoint: `GET /health`
- Monitor disk usage (SQLite + backups)
- Watch `logs/access.log` and `logs/error.log`

## APNs Validation
- Ensure JWT signing works
- Confirm `apns-topic` equals Pass Type ID
- Use sandbox host for dev; production host for live

## Pass Signing Validation
- Verify WWDR certificate on server
- Confirm `pass.json` includes `webServiceURL` and `authenticationToken`
- Confirm `manifest.json` contains all files

## Operational Checklist
- HTTPS configured and tested
- APNs keys installed
- Pass signing certs in secure path
- Backups scheduled
- Logs rotating
- Staff user created
- Test pass installs on iPhone over HTTPS

## Scaling Notes
- SQLite is fine for small to medium usage
- For high concurrency or multi-region, migrate to Postgres
- Stateless app allows horizontal scaling if DB is centralized
