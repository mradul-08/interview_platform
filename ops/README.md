# Production operations

These files are templates for the EC2 host. They are intentionally not enabled
by the application process itself.

## Install the backup and health-check jobs on EC2

From the repository root on EC2:

```bash
sudo mkdir -p /opt/codeverse/ops /etc/codeverse /var/backups/codeverse/mongodb
sudo cp ops/mongodb-backup.sh ops/codeverse-healthcheck.sh /opt/codeverse/ops/
sudo chmod 750 /opt/codeverse/ops/*.sh
sudo cp ops/codeverse-mongodb-backup.service ops/codeverse-mongodb-backup.timer \
  ops/codeverse-healthcheck.service ops/codeverse-healthcheck.timer /etc/systemd/system/
```

Create `/etc/codeverse/backup.env` with the MongoDB URI. Do not commit this file:

```bash
sudo nano /etc/codeverse/backup.env
```

```env
MONGO_URI=your_existing_mongodb_uri
BACKUP_DIR=/var/backups/codeverse/mongodb
RETENTION_DAYS=14
```

Protect it and enable the jobs:

```bash
sudo chmod 600 /etc/codeverse/backup.env
sudo systemctl daemon-reload
sudo systemctl enable --now codeverse-mongodb-backup.timer codeverse-healthcheck.timer
```

Verify schedules:

```bash
systemctl list-timers --all | grep codeverse
```

Run one backup and health check immediately before relying on the timers:

```bash
sudo systemctl start codeverse-mongodb-backup.service
sudo systemctl start codeverse-healthcheck.service
ls -lh /var/backups/codeverse/mongodb
sudo journalctl -u codeverse-mongodb-backup.service -n 20 --no-pager
sudo journalctl -u codeverse-healthcheck.service -n 20 --no-pager
```

The local backup protects against application mistakes, but not loss of the EC2
instance. Copy the archive to S3 or another host for disaster recovery.

## Monitoring

The health timer records failures in systemd. For an external alert when the
whole VM or network is unavailable, monitor:

```text
https://interviewlattice.duckdns.org/api/health
```

with an uptime monitor and alert on non-2xx responses or a JSON response where
`success` is not `true`.
