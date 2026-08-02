#!/bin/bash
# NetManage ISP Billing - Systemd Setup Script
# Usage: sudo bash scripts/setup-systemd.sh
# Fungsi: Install/migrasi dari PM2 ke systemd, setup sudoers, backup automation

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Banner
echo -e "${BLUE}"
echo "==========================================="
echo "  NetManage ISP - Systemd Setup Script"
echo "==========================================="
echo -e "${NC}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Error: Script harus dijalankan sebagai root (sudo)${NC}"
    exit 1
fi

# Detect project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo -e "${BLUE}Project root: ${PROJECT_ROOT}${NC}"

# Detect current user (yang menjalankan sudo)
ACTUAL_USER="${SUDO_USER:-$USER}"
if [ "$ACTUAL_USER" = "root" ]; then
    echo -e "${YELLOW}Warning: Running as root. Masukkan username yang menjalankan aplikasi:${NC}"
    read -p "Username: " ACTUAL_USER
fi

echo -e "${BLUE}User aplikasi: ${ACTUAL_USER}${NC}"

# Load .env file
ENV_FILE="${PROJECT_ROOT}/.env"
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}Error: File .env tidak ditemukan di ${ENV_FILE}${NC}"
    echo -e "${YELLOW}Salin dari .env.example dan isi konfigurasi terlebih dahulu${NC}"
    exit 1
fi

# Function to read .env variable
get_env() {
    local key=$1
    local value=$(grep "^${key}=" "$ENV_FILE" | cut -d '=' -f2- | tr -d '"' | tr -d "'")
    echo "$value"
}

# Detect database driver
DB_DRIVER=$(get_env "DATABASE_DRIVER")
if [ -z "$DB_DRIVER" ]; then
    DB_DRIVER="sqlite"
    echo -e "${YELLOW}DATABASE_DRIVER tidak ditemukan di .env, default: sqlite${NC}"
fi

# Set service names based on database driver
if [ "$DB_DRIVER" = "postgres" ]; then
    SERVICE_NAME="billisp"
    SERVICE_WORKER="billisp-worker"
    SERVICE_CRON="billisp-cron"
    SERVICE_BACKUP="billisp-backup"
    echo -e "${GREEN}Database: PostgreSQL${NC}"
else
    SERVICE_NAME="billingisp"
    SERVICE_WORKER="billingisp-worker"
    SERVICE_CRON="billingisp-cron"
    SERVICE_BACKUP="billingisp-backup"
    echo -e "${GREEN}Database: SQLite${NC}"
fi

# Detect PORT
PORT=$(get_env "PORT")
if [ -z "$PORT" ]; then
    PORT="3000"
    echo -e "${YELLOW}PORT tidak ditemukan di .env, default: 3000${NC}"
fi

echo ""
echo -e "${BLUE}=== Konfigurasi ===${NC}"
echo "Service web   : ${SERVICE_NAME}"
echo "Service worker: ${SERVICE_WORKER}"
echo "Service cron  : ${SERVICE_CRON}"
echo "Service backup: ${SERVICE_BACKUP}"
echo "Port          : ${PORT}"
echo "User          : ${ACTUAL_USER}"
echo ""

# Confirm
read -p "Lanjutkan setup? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Setup dibatalkan${NC}"
    exit 0
fi

# Step 1: Check PM2
echo ""
echo -e "${BLUE}=== Step 1: Deteksi PM2 ===${NC}"
PM2_INSTALLED=false
PM2_RUNNING=false

if command -v pm2 &> /dev/null; then
    PM2_INSTALLED=true
    echo -e "${GREEN}✓ PM2 terinstall${NC}"
    
    # Check if PM2 apps are running
    if sudo -u "$ACTUAL_USER" pm2 list 2>/dev/null | grep -q "online"; then
        PM2_RUNNING=true
        echo -e "${YELLOW}⚠ PM2 sedang menjalankan aplikasi${NC}"
        sudo -u "$ACTUAL_USER" pm2 list
        echo ""
        read -p "Stop dan hapus PM2 apps? (y/n): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo -e "${YELLOW}Stopping PM2 apps...${NC}"
            sudo -u "$ACTUAL_USER" pm2 stop all || true
            sudo -u "$ACTUAL_USER" pm2 delete all || true
            sudo -u "$ACTUAL_USER" pm2 kill || true
            echo -e "${GREEN}✓ PM2 apps stopped${NC}"
        fi
    fi
else
    echo -e "${GREEN}✓ PM2 tidak terinstall (fresh install)${NC}"
fi

# Step 2: Install Redis
echo ""
echo -e "${BLUE}=== Step 2: Setup Redis ===${NC}"
if systemctl is-active --quiet redis-server 2>/dev/null; then
    echo -e "${GREEN}✓ Redis sudah berjalan${NC}"
elif systemctl is-active --quiet redis 2>/dev/null; then
    echo -e "${GREEN}✓ Redis sudah berjalan (redis.service)${NC}"
else
    echo -e "${YELLOW}Installing Redis...${NC}"
    if command -v apt &> /dev/null; then
        apt update
        apt install -y redis-server
        systemctl enable redis-server
        systemctl start redis-server
    elif command -v yum &> /dev/null; then
        yum install -y redis
        systemctl enable redis
        systemctl start redis
    else
        echo -e "${RED}Error: Package manager tidak dikenali (bukan apt/yum)${NC}"
        echo -e "${YELLOW}Install Redis secara manual, lalu jalankan script ini lagi${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Redis installed dan running${NC}"
fi

# Test Redis
if redis-cli ping > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Redis connection OK${NC}"
else
    echo -e "${RED}✗ Redis tidak merespons, cek konfigurasi${NC}"
fi

# Step 3: Create systemd service files
echo ""
echo -e "${BLUE}=== Step 3: Generate Systemd Service Files ===${NC}"

# Main web service
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
echo -e "${YELLOW}Creating ${SERVICE_FILE}${NC}"

if [ "$DB_DRIVER" = "postgres" ]; then
    AFTER_DEPS="network.target postgresql.service redis-server.service"
    REQUIRES_DEPS="postgresql.service redis-server.service"
else
    AFTER_DEPS="network.target redis-server.service"
    REQUIRES_DEPS="redis-server.service"
fi

cat > "$SERVICE_FILE" <<EOF
[Unit]
Description=NetManage ISP Billing Web App (${DB_DRIVER})
After=${AFTER_DEPS}
Requires=${REQUIRES_DEPS}

[Service]
Type=simple
User=${ACTUAL_USER}
Group=${ACTUAL_USER}
WorkingDirectory=${PROJECT_ROOT}
Environment="NODE_ENV=production"
Environment="PORT=${PORT}"
EnvironmentFile=${PROJECT_ROOT}/.env
ExecStart=/usr/bin/node ${PROJECT_ROOT}/node_modules/.bin/next start
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=${SERVICE_NAME}

# Security hardening
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF

echo -e "${GREEN}✓ ${SERVICE_FILE} created${NC}"

# Worker service
WORKER_FILE="/etc/systemd/system/${SERVICE_WORKER}.service"
echo -e "${YELLOW}Creating ${WORKER_FILE}${NC}"

cat > "$WORKER_FILE" <<EOF
[Unit]
Description=NetManage ISP Billing Worker (${DB_DRIVER})
After=${AFTER_DEPS} ${SERVICE_NAME}.service
Requires=${REQUIRES_DEPS}

[Service]
Type=simple
User=${ACTUAL_USER}
Group=${ACTUAL_USER}
WorkingDirectory=${PROJECT_ROOT}
Environment="NODE_ENV=production"
EnvironmentFile=${PROJECT_ROOT}/.env
ExecStart=/usr/bin/npm run queue:worker
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=${SERVICE_WORKER}

NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF

echo -e "${GREEN}✓ ${WORKER_FILE} created${NC}"

# Cron service
CRON_SERVICE="/etc/systemd/system/${SERVICE_CRON}.service"
echo -e "${YELLOW}Creating ${CRON_SERVICE}${NC}"

CRON_SECRET=$(get_env "CRON_SECRET")
if [ -z "$CRON_SECRET" ]; then
    echo -e "${RED}Warning: CRON_SECRET tidak ditemukan di .env${NC}"
    CRON_SECRET="CHANGE_ME"
fi

APP_URL=$(get_env "NEXT_PUBLIC_APP_URL")
if [ -z "$APP_URL" ]; then
    APP_URL="http://127.0.0.1:${PORT}"
    echo -e "${YELLOW}NEXT_PUBLIC_APP_URL tidak ditemukan, menggunakan localhost${NC}"
fi

cat > "$CRON_SERVICE" <<EOF
[Unit]
Description=NetManage ISP Billing Cron Job
After=network.target ${SERVICE_NAME}.service

[Service]
Type=oneshot
User=${ACTUAL_USER}
Group=${ACTUAL_USER}
Environment="CRON_SECRET=${CRON_SECRET}"
ExecStart=/usr/bin/curl -fsS -m 120 -H "Authorization: Bearer \${CRON_SECRET}" ${APP_URL}/api/cron
StandardOutput=journal
StandardError=journal
SyslogIdentifier=${SERVICE_CRON}
EOF

echo -e "${GREEN}✓ ${CRON_SERVICE} created${NC}"

# Cron timer
CRON_TIMER="/etc/systemd/system/${SERVICE_CRON}.timer"
echo -e "${YELLOW}Creating ${CRON_TIMER}${NC}"

cat > "$CRON_TIMER" <<EOF
[Unit]
Description=NetManage ISP Billing Cron Timer (Daily at 6 AM)
Requires=${SERVICE_CRON}.service

[Timer]
# Setiap hari jam 06:00
OnCalendar=*-*-* 06:00:00
Persistent=true

[Install]
WantedBy=timers.target
EOF

echo -e "${GREEN}✓ ${CRON_TIMER} created${NC}"

# Step 4: Create backup script and service
echo ""
echo -e "${BLUE}=== Step 4: Setup Backup Automation ===${NC}"

BACKUP_SCRIPT="/usr/local/bin/backup-${SERVICE_NAME}.sh"
echo -e "${YELLOW}Creating ${BACKUP_SCRIPT}${NC}"

if [ "$DB_DRIVER" = "postgres" ]; then
    # PostgreSQL backup script
    DB_URL=$(get_env "DATABASE_URL")
    DB_NAME=$(echo "$DB_URL" | sed -n 's|.*postgresql://[^/]*/\([^?]*\).*|\1|p')
    if [ -z "$DB_NAME" ]; then
        DB_NAME="netmanage"
    fi
    
    cat > "$BACKUP_SCRIPT" <<'EOFBACKUP'
#!/bin/bash
# NetManage ISP - PostgreSQL Backup Script

set -e

PROJECT_ROOT="PROJECT_ROOT_PLACEHOLDER"
BACKUP_DIR="${PROJECT_ROOT}/data/backups/platform"
DB_NAME="DB_NAME_PLACEHOLDER"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/netmanage_full_${TIMESTAMP}.sql"
RETENTION_DAYS=30
MAX_BACKUPS=10

mkdir -p "$BACKUP_DIR"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting PostgreSQL backup..."

# Backup PostgreSQL database
pg_dump -U netmanage "$DB_NAME" > "$BACKUP_FILE"

# Compress
gzip "$BACKUP_FILE"
BACKUP_FILE="${BACKUP_FILE}.gz"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup created: $BACKUP_FILE ($(du -h "$BACKUP_FILE" | cut -f1))"

# Retention: delete backups older than RETENTION_DAYS
find "$BACKUP_DIR" -name "netmanage_full_*.sql.gz" -type f -mtime +${RETENTION_DAYS} -delete
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Deleted backups older than ${RETENTION_DAYS} days"

# Retention: keep only MAX_BACKUPS newest backups
BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/netmanage_full_*.sql.gz 2>/dev/null | wc -l)
if [ "$BACKUP_COUNT" -gt "$MAX_BACKUPS" ]; then
    DELETE_COUNT=$((BACKUP_COUNT - MAX_BACKUPS))
    ls -1t "$BACKUP_DIR"/netmanage_full_*.sql.gz | tail -n "$DELETE_COUNT" | xargs rm -f
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Deleted $DELETE_COUNT old backups (keeping max $MAX_BACKUPS)"
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup completed successfully"
EOFBACKUP

    sed -i "s|PROJECT_ROOT_PLACEHOLDER|${PROJECT_ROOT}|g" "$BACKUP_SCRIPT"
    sed -i "s|DB_NAME_PLACEHOLDER|${DB_NAME}|g" "$BACKUP_SCRIPT"
else
    # SQLite backup script
    cat > "$BACKUP_SCRIPT" <<'EOFBACKUP'
#!/bin/bash
# NetManage ISP - SQLite Backup Script

set -e

PROJECT_ROOT="PROJECT_ROOT_PLACEHOLDER"
BACKUP_DIR="${PROJECT_ROOT}/data/backups/platform"
DB_FILE="${PROJECT_ROOT}/netmanage.db"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/netmanage_full_${TIMESTAMP}.db"
RETENTION_DAYS=30
MAX_BACKUPS=10

mkdir -p "$BACKUP_DIR"

if [ ! -f "$DB_FILE" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Error: Database file not found: $DB_FILE"
    exit 1
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting SQLite backup..."

# SQLite backup menggunakan .backup command (online backup)
sqlite3 "$DB_FILE" ".backup '$BACKUP_FILE'"

# Compress
gzip "$BACKUP_FILE"
BACKUP_FILE="${BACKUP_FILE}.gz"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup created: $BACKUP_FILE ($(du -h "$BACKUP_FILE" | cut -f1))"

# Retention: delete backups older than RETENTION_DAYS
find "$BACKUP_DIR" -name "netmanage_full_*.db.gz" -type f -mtime +${RETENTION_DAYS} -delete
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Deleted backups older than ${RETENTION_DAYS} days"

# Retention: keep only MAX_BACKUPS newest backups
BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/netmanage_full_*.db.gz 2>/dev/null | wc -l)
if [ "$BACKUP_COUNT" -gt "$MAX_BACKUPS" ]; then
    DELETE_COUNT=$((BACKUP_COUNT - MAX_BACKUPS))
    ls -1t "$BACKUP_DIR"/netmanage_full_*.db.gz | tail -n "$DELETE_COUNT" | xargs rm -f
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Deleted $DELETE_COUNT old backups (keeping max $MAX_BACKUPS)"
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup completed successfully"
EOFBACKUP

    sed -i "s|PROJECT_ROOT_PLACEHOLDER|${PROJECT_ROOT}|g" "$BACKUP_SCRIPT"
fi

chmod +x "$BACKUP_SCRIPT"
chown root:root "$BACKUP_SCRIPT"
echo -e "${GREEN}✓ ${BACKUP_SCRIPT} created${NC}"

# Backup service
BACKUP_SERVICE="/etc/systemd/system/${SERVICE_BACKUP}.service"
echo -e "${YELLOW}Creating ${BACKUP_SERVICE}${NC}"

cat > "$BACKUP_SERVICE" <<EOF
[Unit]
Description=NetManage ISP Daily Full Backup

[Service]
Type=oneshot
User=${ACTUAL_USER}
Group=${ACTUAL_USER}
ExecStart=${BACKUP_SCRIPT}
StandardOutput=journal
StandardError=journal
SyslogIdentifier=${SERVICE_BACKUP}
EOF

echo -e "${GREEN}✓ ${BACKUP_SERVICE} created${NC}"

# Backup timer
BACKUP_TIMER="/etc/systemd/system/${SERVICE_BACKUP}.timer"
echo -e "${YELLOW}Creating ${BACKUP_TIMER}${NC}"

cat > "$BACKUP_TIMER" <<EOF
[Unit]
Description=NetManage ISP Daily Full Backup Timer
Requires=${SERVICE_BACKUP}.service

[Timer]
# Backup setiap hari jam 02:00
OnCalendar=*-*-* 02:00:00
Persistent=true
RandomizedDelaySec=600

[Install]
WantedBy=timers.target
EOF

echo -e "${GREEN}✓ ${BACKUP_TIMER} created${NC}"

# Step 5: Setup sudoers
echo ""
echo -e "${BLUE}=== Step 5: Setup Sudoers (NOPASSWD) ===${NC}"

SUDOERS_FILE="/etc/sudoers.d/${SERVICE_NAME}"
echo -e "${YELLOW}Creating ${SUDOERS_FILE}${NC}"

cat > "$SUDOERS_FILE" <<EOF
# NetManage ISP - Allow ${ACTUAL_USER} to restart services without password
${ACTUAL_USER} ALL=(ALL) NOPASSWD: /bin/systemctl restart ${SERVICE_NAME}
${ACTUAL_USER} ALL=(ALL) NOPASSWD: /bin/systemctl restart ${SERVICE_WORKER}
${ACTUAL_USER} ALL=(ALL) NOPASSWD: /bin/systemctl status ${SERVICE_NAME}
${ACTUAL_USER} ALL=(ALL) NOPASSWD: /bin/systemctl status ${SERVICE_WORKER}
${ACTUAL_USER} ALL=(ALL) NOPASSWD: /bin/systemctl start ${SERVICE_NAME}
${ACTUAL_USER} ALL=(ALL) NOPASSWD: /bin/systemctl start ${SERVICE_WORKER}
${ACTUAL_USER} ALL=(ALL) NOPASSWD: /bin/systemctl stop ${SERVICE_NAME}
${ACTUAL_USER} ALL=(ALL) NOPASSWD: /bin/systemctl stop ${SERVICE_WORKER}
EOF

chmod 0440 "$SUDOERS_FILE"
visudo -c -f "$SUDOERS_FILE"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Sudoers configured successfully${NC}"
else
    echo -e "${RED}✗ Sudoers syntax error, removing file${NC}"
    rm -f "$SUDOERS_FILE"
    exit 1
fi

# Step 6: Update .env for systemd mode
echo ""
echo -e "${BLUE}=== Step 6: Update .env ===${NC}"

# Backup .env
cp "$ENV_FILE" "${ENV_FILE}.backup-$(date +%s)"
echo -e "${GREEN}✓ .env backed up${NC}"

if grep -q "DEPLOY_USE_SYSTEMD" "$ENV_FILE"; then
    sed -i 's/^DEPLOY_USE_SYSTEMD=.*/DEPLOY_USE_SYSTEMD=true/' "$ENV_FILE"
    echo -e "${GREEN}✓ DEPLOY_USE_SYSTEMD=true updated${NC}"
else
    echo "" >> "$ENV_FILE"
    echo "# Deploy mode: systemd" >> "$ENV_FILE"
    echo "DEPLOY_USE_SYSTEMD=true" >> "$ENV_FILE"
    echo -e "${GREEN}✓ DEPLOY_USE_SYSTEMD=true ditambahkan ke .env${NC}"
fi

if grep -q "^DEPLOY_ENABLED=" "$ENV_FILE"; then
    sed -i 's/^DEPLOY_ENABLED=.*/DEPLOY_ENABLED=true/' "$ENV_FILE"
    echo -e "${GREEN}✓ DEPLOY_ENABLED=true updated${NC}"
else
    echo "DEPLOY_ENABLED=true" >> "$ENV_FILE"
    echo -e "${GREEN}✓ DEPLOY_ENABLED=true ditambahkan ke .env${NC}"
fi

# Ensure DEPLOY_PM2_APP matches service name
if grep -q "^DEPLOY_PM2_APP=" "$ENV_FILE"; then
    sed -i "s/^DEPLOY_PM2_APP=.*/DEPLOY_PM2_APP=${SERVICE_NAME}/" "$ENV_FILE"
else
    echo "DEPLOY_PM2_APP=${SERVICE_NAME}" >> "$ENV_FILE"
fi

if grep -q "^DEPLOY_PM2_WORKER_APP=" "$ENV_FILE"; then
    sed -i "s/^DEPLOY_PM2_WORKER_APP=.*/DEPLOY_PM2_WORKER_APP=${SERVICE_WORKER}/" "$ENV_FILE"
else
    echo "DEPLOY_PM2_WORKER_APP=${SERVICE_WORKER}" >> "$ENV_FILE"
fi

echo -e "${GREEN}✓ .env updated untuk systemd mode${NC}"

# Step 7: Reload systemd and enable services
echo ""
echo -e "${BLUE}=== Step 7: Enable & Start Services ===${NC}"

systemctl daemon-reload
echo -e "${GREEN}✓ Systemd daemon reloaded${NC}"

# Enable services
systemctl enable "${SERVICE_NAME}" "${SERVICE_WORKER}" "${SERVICE_CRON}.timer" "${SERVICE_BACKUP}.timer"
echo -e "${GREEN}✓ Services enabled (auto-start on boot)${NC}"

# Start services
echo -e "${YELLOW}Starting services...${NC}"
systemctl start "${SERVICE_NAME}"
sleep 2
systemctl start "${SERVICE_WORKER}"
sleep 1
systemctl start "${SERVICE_CRON}.timer"
systemctl start "${SERVICE_BACKUP}.timer"

echo -e "${GREEN}✓ All services started${NC}"

# Step 8: Verify
echo ""
echo -e "${BLUE}=== Step 8: Verification ===${NC}"

# Check service status
echo ""
echo -e "${YELLOW}Service Status:${NC}"
systemctl status "${SERVICE_NAME}" --no-pager -l | head -n 15
echo ""
systemctl status "${SERVICE_WORKER}" --no-pager -l | head -n 15
echo ""

# Check timers
echo -e "${YELLOW}Timer Status:${NC}"
systemctl list-timers "${SERVICE_CRON}.timer" "${SERVICE_BACKUP}.timer" --no-pager

# Test web app
echo ""
echo -e "${YELLOW}Testing web app...${NC}"
sleep 3
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:${PORT}" || echo "000")
if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ Web app responding on port ${PORT}${NC}"
else
    echo -e "${RED}✗ Web app tidak merespons (HTTP ${HTTP_CODE}), cek logs:${NC}"
    echo -e "${YELLOW}  sudo journalctl -u ${SERVICE_NAME} -n 30${NC}"
fi

# Test sudoers
echo ""
echo -e "${YELLOW}Testing sudoers (restart as ${ACTUAL_USER})...${NC}"
if sudo -u "$ACTUAL_USER" sudo systemctl status "${SERVICE_NAME}" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Sudoers OK (no password required)${NC}"
else
    echo -e "${RED}✗ Sudoers gagal, user tidak bisa systemctl tanpa password${NC}"
fi

# Summary
echo ""
echo -e "${GREEN}==========================================="
echo "  Setup Systemd Completed! 🎉"
echo "==========================================${NC}"
echo ""
echo -e "${BLUE}Services:${NC}"
echo "  • Web app   : ${SERVICE_NAME}"
echo "  • Worker    : ${SERVICE_WORKER}"
echo "  • Cron      : ${SERVICE_CRON}.timer"
echo "  • Backup    : ${SERVICE_BACKUP}.timer"
echo ""
echo -e "${BLUE}Useful Commands:${NC}"
echo "  • Status     : sudo systemctl status ${SERVICE_NAME}"
echo "  • Logs       : sudo journalctl -u ${SERVICE_NAME} -f"
echo "  • Restart    : sudo systemctl restart ${SERVICE_NAME} ${SERVICE_WORKER}"
echo "  • Stop       : sudo systemctl stop ${SERVICE_NAME} ${SERVICE_WORKER}"
echo "  • List timers: sudo systemctl list-timers"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "  1. Cek logs: sudo journalctl -u ${SERVICE_NAME} -f"
echo "  2. Test app di browser: ${APP_URL}"
echo "  3. Test deploy dari dashboard: Superadmin → Update Aplikasi"
echo "  4. Test manual backup: sudo systemctl start ${SERVICE_BACKUP}.service"
echo ""
echo -e "${YELLOW}Jika ada masalah, cek troubleshooting di README.md${NC}"
echo ""
