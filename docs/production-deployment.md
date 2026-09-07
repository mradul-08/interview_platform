# CodeVerse production deployment

This runbook describes the production shape of the live CodeVerse deployment.
It is intentionally written without credentials, private keys, or host-specific
secret values.

## Production endpoints

- Application: <https://interviewlattice.duckdns.org>
- Health check: <https://interviewlattice.duckdns.org/api/health>

The health endpoint should return HTTP 200 with `success: true` and
`database: "connected"`.

## Runtime services

| Component | Production responsibility |
| --- | --- |
| Nginx | HTTPS, static frontend files, and `/api` reverse proxy |
| `codeverse-backend.service` | Express API, Socket.IO, authentication, and jobs |
| MongoDB Atlas | Application data and persistent session records |
| Docker | Isolated C++, Java, Python, and JavaScript execution |
| `codeverse-mongodb-backup.timer` | Daily compressed MongoDB backup |
| `codeverse-healthcheck.timer` | Five-minute application and dependency check |

## Deploying a new version

On the EC2 host:

```bash
cd ~/apps/interview_platform
git pull --ff-only origin main

cd backend
npm ci --omit=dev
sudo systemctl restart codeverse-backend

sudo systemctl is-active codeverse-backend
curl --fail https://interviewlattice.duckdns.org/api/health
```

If frontend source or dependencies changed, build and publish the frontend
using the host's existing Nginx document root procedure. Never copy `.env`
files into the repository or expose them through the web server.

## Backups

The backup timer writes compressed archives to:

```text
/var/backups/codeverse/mongodb
```

Useful checks:

```bash
systemctl list-timers --all | grep codeverse
sudo systemctl start codeverse-mongodb-backup.service
ls -lh /var/backups/codeverse/mongodb
sudo journalctl -u codeverse-mongodb-backup.service -n 30 --no-pager
```

The local archive protects against application mistakes, but not loss of the
EC2 instance. Production disaster recovery should copy completed archives to
S3 or another independent storage provider.

## Monitoring

The local health timer checks the public API, backend service, Nginx, and Docker
and records the result in systemd journal logs:

```bash
sudo systemctl start codeverse-healthcheck.service
sudo journalctl -u codeverse-healthcheck.service -n 30 --no-pager
```

For email alerts when the VM, network, or Nginx is unavailable, configure an
external uptime monitor against:

```text
https://interviewlattice.duckdns.org/api/health
```

Alert on non-2xx responses, timeouts, or a JSON response where `success` is not
`true`.

## Required production safeguards

- Keep `backend/.env`, `frontend/.env`, `/etc/codeverse/backup.env`, OAuth secrets,
  SMTP credentials, database URIs, and signing keys out of Git.
- Use the production domain for `CLIENT_URL`, OAuth callback URLs, and frontend
  `VITE_API_URL`.
- Keep MongoDB access restricted to the application host or approved network.
- Keep Docker execution images current and do not expose the Docker socket to
  the public internet.
- Review `git diff` and GitHub Actions status before each production restart.
