# Production Hardening Guide

## Reverse Proxy (Nginx)
Use an HTTPS reverse proxy and forward to Node on localhost.

Example `/etc/nginx/sites-available/garden-of-skin-wallet`:
```
server {
  listen 80;
  server_name gardenofskinmedspa.com;
  return 301 https://$host$request_uri;
}

server {
  listen 443 ssl http2;
  server_name gardenofskinmedspa.com;

  ssl_certificate /etc/letsencrypt/live/gardenofskinmedspa.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/gardenofskinmedspa.com/privkey.pem;

  add_header Strict-Transport-Security "max-age=31536000" always;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

## Process Manager (systemd)
Create `/etc/systemd/system/garden-of-skin-wallet.service`:
```
[Unit]
Description=Garden of Skin Wallet
After=network.target

[Service]
WorkingDirectory=/opt/garden-of-skin-wallet
EnvironmentFile=/opt/garden-of-skin-wallet/.env
ExecStart=/usr/bin/node backend/src/server.js
Restart=always
User=www-data
Group=www-data

[Install]
WantedBy=multi-user.target
```

Enable:
```
sudo systemctl daemon-reload
sudo systemctl enable garden-of-skin-wallet
sudo systemctl start garden-of-skin-wallet
```

## Backups
Use the provided script:
```
npm run backup-db
```

Example cron:
```
0 3 * * * /usr/bin/npm --prefix /opt/garden-of-skin-wallet run backup-db
```

## Logging
- Access logs: `logs/access.log`
- Error logs: `logs/error.log`
- Use OS log rotation for the `logs/` directory.

## Health Checks
- `GET /health` should return `{ ok: true }`.
- Configure uptime monitoring to check this endpoint.

## APNs
- Use `APNS_HOST=api.push.apple.com` for production.
- Use sandbox host only during development.

