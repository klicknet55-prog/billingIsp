# Panduan Setup Sudo untuk tunnelhost-netmanage

## Masalah
User `tunnelhost-netmanage` tidak punya akses sudo, sehingga tidak bisa menjalankan `setup-systemd.sh`.

```bash
sudo: I'm sorry tunnelhost-netmanage. I'm afraid I can't do that
```

## Solusi

### Opsi 1: Minta Admin Server untuk Grant Sudo (RECOMMENDED)

Minta admin server (yang punya akses root) untuk menjalankan:

```bash
# Login sebagai root atau user dengan sudo
sudo visudo

# Tambahkan baris berikut di akhir file:
tunnelhost-netmanage ALL=(ALL) NOPASSWD: ALL

# Atau jika ingin lebih restrictive (hanya systemctl untuk billisp):
tunnelhost-netmanage ALL=(ALL) NOPASSWD: /bin/systemctl start billisp*, /bin/systemctl stop billisp*, /bin/systemctl restart billisp*, /bin/systemctl status billisp*, /bin/systemctl enable billisp*, /bin/systemctl disable billisp*, /bin/systemctl daemon-reload
```

**Setelah setup sudo**, jalankan lagi:
```bash
sudo bash scripts/setup-systemd.sh
```

---

### Opsi 2: Admin Jalankan Script untuk User

Jika tidak bisa grant sudo, minta admin untuk menjalankan script:

```bash
# Admin login sebagai root
sudo bash /home/tunnelhost-netmanage/htdocs/netmanage.tunnelhost.my.id/scripts/setup-systemd.sh

# Script akan auto-detect user tunnelhost-netmanage dari SUDO_USER
```

---

### Opsi 3: Manual Setup (Tanpa Script)

Jika tidak ada akses sudo sama sekali, setup manual oleh admin:

#### 1. Install Redis

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y redis-server

# CentOS/RHEL
sudo yum install -y redis

# Enable & start
sudo systemctl enable redis-server
sudo systemctl start redis-server
```

#### 2. Create Systemd Service Files

**File: `/etc/systemd/system/billisp.service`**

```ini
[Unit]
Description=NetManage ISP Billing - Web App (PostgreSQL)
After=network.target postgresql.service redis-server.service
Wants=postgresql.service redis-server.service

[Service]
Type=simple
User=tunnelhost-netmanage
WorkingDirectory=/home/tunnelhost-netmanage/htdocs/netmanage.tunnelhost.my.id
EnvironmentFile=/home/tunnelhost-netmanage/htdocs/netmanage.tunnelhost.my.id/.env
ExecStart=/usr/bin/node /home/tunnelhost-netmanage/htdocs/netmanage.tunnelhost.my.id/node_modules/.bin/next start -p 3000
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=billisp

[Install]
WantedBy=multi-user.target
```

**File: `/etc/systemd/system/billisp-worker.service`**

```ini
[Unit]
Description=NetManage ISP Billing - Worker (PostgreSQL)
After=network.target postgresql.service redis-server.service billisp.service
Requires=redis-server.service

[Service]
Type=simple
User=tunnelhost-netmanage
WorkingDirectory=/home/tunnelhost-netmanage/htdocs/netmanage.tunnelhost.my.id
EnvironmentFile=/home/tunnelhost-netmanage/htdocs/netmanage.tunnelhost.my.id/.env
ExecStart=/usr/bin/node /home/tunnelhost-netmanage/htdocs/netmanage.tunnelhost.my.id/scripts/queue-worker.ts
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=billisp-worker

[Install]
WantedBy=multi-user.target
```

**File: `/etc/systemd/system/billisp-cron.service`**

```ini
[Unit]
Description=NetManage ISP Billing - Daily Cron (PostgreSQL)
After=network.target postgresql.service billisp.service

[Service]
Type=oneshot
User=tunnelhost-netmanage
WorkingDirectory=/home/tunnelhost-netmanage/htdocs/netmanage.tunnelhost.my.id
EnvironmentFile=/home/tunnelhost-netmanage/htdocs/netmanage.tunnelhost.my.id/.env
ExecStart=/usr/bin/curl -X POST http://localhost:3000/api/jobs/cron -H "Content-Type: application/json" -H "x-cron-secret: ${CRON_SECRET}"
StandardOutput=journal
StandardError=journal
SyslogIdentifier=billisp-cron
```

**File: `/etc/systemd/system/billisp-cron.timer`**

```ini
[Unit]
Description=NetManage ISP Billing - Daily Cron Timer (PostgreSQL)
Requires=billisp-cron.service

[Timer]
OnCalendar=daily
OnCalendar=*-*-* 06:00:00
Persistent=true

[Install]
WantedBy=timers.target
```

**File: `/etc/systemd/system/billisp-backup.service`**

```ini
[Unit]
Description=NetManage ISP Billing - Daily Backup (PostgreSQL)
After=network.target postgresql.service

[Service]
Type=oneshot
User=tunnelhost-netmanage
ExecStart=/usr/local/bin/backup-billisp.sh
StandardOutput=journal
StandardError=journal
SyslogIdentifier=billisp-backup
```

**File: `/etc/systemd/system/billisp-backup.timer`**

```ini
[Unit]
Description=NetManage ISP Billing - Daily Backup Timer (PostgreSQL)
Requires=billisp-backup.service

[Timer]
OnCalendar=daily
OnCalendar=*-*-* 02:00:00
Persistent=true

[Install]
WantedBy=timers.target
```

#### 3. Create Backup Script

**File: `/usr/local/bin/backup-billisp.sh`**

```bash
#!/bin/bash
set -e

PROJECT_ROOT="/home/tunnelhost-netmanage/htdocs/netmanage.tunnelhost.my.id"
BACKUP_DIR="${PROJECT_ROOT}/data/backups/platform"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/backup_${TIMESTAMP}.sql.gz"

# Load .env
source "${PROJECT_ROOT}/.env"

# Create backup dir
mkdir -p "${BACKUP_DIR}"

# PostgreSQL backup
PGPASSWORD="${DATABASE_PASSWORD}" pg_dump \
  -h "${DATABASE_HOST:-localhost}" \
  -p "${DATABASE_PORT:-5432}" \
  -U "${DATABASE_USER}" \
  -d "${DATABASE_NAME}" \
  | gzip > "${BACKUP_FILE}"

echo "Backup berhasil: ${BACKUP_FILE}"

# Retention: hapus backup > 30 hari
find "${BACKUP_DIR}" -name "backup_*.sql.gz" -type f -mtime +30 -delete

# Retention: keep max 10 backups
ls -t "${BACKUP_DIR}"/backup_*.sql.gz | tail -n +11 | xargs -r rm

echo "Cleanup retention selesai"
```

```bash
sudo chmod +x /usr/local/bin/backup-billisp.sh
```

#### 4. Setup Sudoers untuk Deploy

**File: `/etc/sudoers.d/billisp`**

```bash
tunnelhost-netmanage ALL=(ALL) NOPASSWD: /bin/systemctl start billisp, /bin/systemctl stop billisp, /bin/systemctl restart billisp, /bin/systemctl status billisp, /bin/systemctl enable billisp, /bin/systemctl disable billisp, /bin/systemctl start billisp-worker, /bin/systemctl stop billisp-worker, /bin/systemctl restart billisp-worker, /bin/systemctl status billisp-worker, /bin/systemctl enable billisp-worker, /bin/systemctl disable billisp-worker, /bin/systemctl daemon-reload
```

```bash
sudo chmod 0440 /etc/sudoers.d/billisp
sudo visudo -c  # Validate
```

#### 5. Update .env

Edit `.env` di project:

```bash
DEPLOY_USE_SYSTEMD=true
DEPLOY_ENABLED=true
DEPLOY_PM2_APP=billisp
DEPLOY_PM2_WORKER_APP=billisp-worker
```

#### 6. Enable & Start Services

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable services
sudo systemctl enable billisp billisp-worker
sudo systemctl enable billisp-cron.timer billisp-backup.timer

# Start services
sudo systemctl start billisp billisp-worker
sudo systemctl start billisp-cron.timer billisp-backup.timer

# Check status
sudo systemctl status billisp billisp-worker
sudo systemctl status billisp-cron.timer billisp-backup.timer
```

---

### Opsi 4: Tetap Pakai PM2 (Fallback)

Jika tidak bisa setup systemd sama sekali, tetap pakai PM2:

```bash
# Di .env, jangan set DEPLOY_USE_SYSTEMD (atau set false)
DEPLOY_USE_SYSTEMD=false
DEPLOY_ENABLED=true
DEPLOY_PM2_APP=billingisp
DEPLOY_PM2_WORKER_APP=billingisp-worker

# Start dengan PM2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup  # Follow instruksi untuk auto-start on boot
```

---

## Verifikasi Setelah Setup

### 1. Check Service Status

```bash
sudo systemctl status billisp
sudo systemctl status billisp-worker
sudo systemctl status billisp-cron.timer
sudo systemctl status billisp-backup.timer
```

### 2. Check Logs

```bash
sudo journalctl -u billisp -f
sudo journalctl -u billisp-worker -f
```

### 3. Test HTTP

```bash
curl http://localhost:3000
curl https://netmanage.tunnelhost.my.id
```

### 4. Test Sudoers (Deploy)

```bash
# Harus berhasil tanpa password prompt
sudo systemctl restart billisp
sudo systemctl restart billisp-worker
```

### 5. Test Deploy dari Dashboard

1. Login sebagai superadmin
2. Buka menu "Update Aplikasi"
3. Klik "Deploy Now"
4. Monitor progress, harus sukses semua step

---

## Troubleshooting

### Service Gagal Start

```bash
# Check error detail
sudo journalctl -u billisp -n 50 --no-pager

# Check file permissions
ls -la /home/tunnelhost-netmanage/htdocs/netmanage.tunnelhost.my.id

# Check .env
cat /home/tunnelhost-netmanage/htdocs/netmanage.tunnelhost.my.id/.env
```

### Redis Connection Error

```bash
# Check Redis status
sudo systemctl status redis-server

# Test connection
redis-cli ping  # Harus return PONG

# Check Redis config
sudo nano /etc/redis/redis.conf
# Pastikan: bind 127.0.0.1
```

### PostgreSQL Connection Error

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Test connection
psql -h localhost -U netmanage_user -d netmanage_db -c "SELECT 1;"
```

### Sudoers Masih Prompt Password

```bash
# Check syntax
sudo visudo -c

# Check file
sudo cat /etc/sudoers.d/billisp

# Check permissions
ls -la /etc/sudoers.d/billisp  # Harus 0440
```

---

## Rekomendasi

**RECOMMENDED: Opsi 1** - Minta admin grant sudo untuk tunnelhost-netmanage, kemudian jalankan script otomatis.

Systemd lebih stabil dan native untuk production Linux dibanding PM2.
