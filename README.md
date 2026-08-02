# BILLING RT-RW NET

Platform SaaS billing & manajemen jaringan untuk ISP dan RT-RW Net (proyek internal: **NetManage**). Dibangun dengan Next.js (App Router), Drizzle ORM, dan Tailwind CSS. Multi-tenant, modular, dan bertema warna yang bisa diganti.

## Fitur (Fondasi & Modul Inti)

- Multi-tenant dengan isolasi data per ISP (`tenant_id` di semua tabel).
- 4 area peran: Super Admin, Owner/Admin ISP, Kolektor (PWA), Portal Pelanggan.
- Auth: email/password untuk staf, OTP passwordless (WhatsApp) untuk pelanggan.
- Modul ISP: pelanggan (+koordinat, ODP), paket internet, router Mikrotik, **peta ODP** (Leaflet/OSM), invoice, helpdesk tiket, laporan keuangan (ekspor CSV).
- **Paket internet**: mapping ke router Mikrotik + profile PPPoE/Hotspot (load dari router).
- **Pelanggan**: pilih paket sesuai router; sinkron user ke Mikrotik saat create/edit; hapus dengan modal multi-tahap (Mikrotik + invoice + tiket).
- **Router Mikrotik**: CRUD per tenant, cek status, mode REST (RouterOS v7+) atau Legacy API (8728).
- Kolektor: daftar tugas diurutkan jarak, terima tunai + aktivasi otomatis, cetak struk thermal (Web Bluetooth).
- Portal pelanggan: ringkasan langganan, bayar mandiri (Duitku), diagnostik koneksi, lapor gangguan.
- Tema warna dinamis (6 preset) + mode terang/gelap, tersimpan per perangkat & default per tenant.
- Integrasi via pola adapter + mock (Mikrotik, Duitku, WhatsApp, Maps) — berjalan penuh tanpa kredensial.
- Background worker (cron): generate invoice bulanan, reminder jatuh tempo + link bayar, isolasi otomatis.
- **Peta ISP** (`/isp/peta`): marker ODP & pelanggan, status modem Mikrotik, jalur fiber router→ODP→pelanggan.
- **Platform (Super Admin)**: brand/logo, pemilik, alamat, link Telegram, halaman statis (Tentang, Kontak, T&C).

## Teknologi

| Lapisan | Teknologi |
|--------|-----------|
| Framework | Next.js (App Router) + TypeScript |
| Styling | Tailwind CSS + komponen ala shadcn/ui |
| Database | SQLite (dev/single-server) atau PostgreSQL (production skala besar) via Drizzle ORM |
| Auth | Modul internal (session cookie + scrypt + OTP) |
| Mikrotik | REST API + Legacy API (`node-routeros`) |

## Menjalankan (Development)

```bash
npm install
cp .env.example .env          # sesuaikan bila perlu
npm run db:push               # buat / update skema database (dev)
npm run db:ensure-schema      # patch kolom/tabel idempotent (dev & production)
npm run db:seed               # isi data demo (opsional; hapus data tenant demo lama)
npm run db:backfill-integrations  # copy credential env global -> config tenant (idempotent)
npm run dev                   # http://localhost:3000
```

### Variabel `.env` penting (dev)

```env
MIKROTIK_DRIVER=real          # mock | real
MIKROTIK_TLS_INSECURE=true    # wajib jika akses router via IP + sertifikat self-signed
DATABASE_URL=./netmanage.db
AUTH_SECRET=...               # ganti di production
NEXT_PUBLIC_MAP_TILE_URL=https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
MAP_MODEM_CACHE_SECONDS=180
```

**Kredensial router Mikrotik** disimpan per tenant di menu **ISP → Router**, bukan di `.env`.

### Akun demo (setelah `npm run db:seed`)

| Peran | Login | Sandi | Catatan |
|-------|-------|-------|---------|
| Super Admin | super@netmanage.app | password123 | Menu Pengaturan platform |
| Owner ISP | owner@demo.net | password123 | Akses penuh tenant demo |
| Admin ISP | admin@demo.net | password123 | |
| Kolektor | kolektor@demo.net | password123 | Tugas penagihan |
| Kolektor 2 | kolektor2@demo.net | password123 | Area kolektor terpisah |
| **Teknisi** | **teknisi@demo.net** | **password123** | Tiket, peta, pelanggan (2 tiket demo) |
| Pelanggan | nomor `081200000001` | OTP di console server | Portal pelanggan |

> **Production:** jangan jalankan `db:seed` jika sudah ada data live — seed **menghapus semua tenant & user** lalu mengisi ulang data demo. Backup `netmanage.db` dulu: `cp netmanage.db netmanage.db.bak.$(date +%F)`

## Backup & Restore (Fase 1)

### Owner / Admin ISP — menu **Pengaturan → Backup & Restore**

- **Export:** unduh file `.netmanage.json` (gzip otomatis jika lebih dari 500 pelanggan).
- **Restore (owner saja):** upload → pratinjau → **Gabungkan** (skip ID duplikat) atau **Ganti semua data** (wajib ketik nama usaha; snapshot otomatis di server).
- **Admin** hanya bisa export, tidak restore.
- Batas: 3 restore per tenant per 24 jam.

### Super Admin — menu **Backup**

Unduh snapshot SQLite penuh (`.db`) via `better-sqlite3` `.backup()`.

### CLI (SSH / cron)

```bash
# Backup satu tenant (tenant ID dari DB atau URL superadmin)
npm run backup:tenant -- --tenant-id=ten_demo --gzip

# Backup database penuh
npm run backup:full
```

File disimpan di `data/backups/` (di-gitignore). Restore tenant via UI, bukan CLI.

## Deploy ke Server (Production)

Aplikasi berjalan sebagai **Node.js** (bukan Apache/PHP). Pilih **satu** jalur instalasi sesuai database production Anda:

| Opsi | Database | Contoh server | PM2 web | PM2 worker |
|------|----------|---------------|---------|------------|
| **A** | SQLite | `isp.tunnelhost.my.id` | `billingisp` | `billingisp-worker` |
| **B** | PostgreSQL | `billisp.tunnelhost.my.id` | `billisp` | `billisp-worker` |

Kedua opsi mendukung **Redis + worker PM2** (BullMQ) untuk batch WhatsApp, webhook, dan job antrian.

> **Dua app di VPS yang sama?** Satu instance Redis (`127.0.0.1:6379`) boleh dipakai bersama, tetapi **wajib** beda **database index** di `REDIS_URL` (mis. `/0` untuk SQLite, `/1` untuk PostgreSQL) agar antrian BullMQ tidak saling mengambil job. Lihat [Redis — dua app di satu VPS](#redis--dua-app-di-satu-vps).

---

### Opsi A — SQLite (step-by-step)

Contoh path: `/home/tunnelhost-isp/htdocs/isp.tunnelhost.my.id` · domain `https://isp.tunnelhost.my.id` · port **3000**.

#### A1. Clone / pull kode

```bash
cd /home/tunnelhost-isp/htdocs/isp.tunnelhost.my.id
git fetch origin
git checkout netmanage-implementation   # atau branch production Anda
git pull origin netmanage-implementation
```

#### A2. Install dependensi

```bash
npm ci --include=dev
npm run uploads:ensure-dirs
```

#### A3. Konfigurasi `.env` (SQLite)

Salin dari `.env.example` lalu sesuaikan:

```env
NEXT_PUBLIC_APP_URL=https://isp.tunnelhost.my.id
DATABASE_URL=./netmanage.db
# DATABASE_DRIVER kosong atau sqlite — jangan set postgres
AUTH_SECRET=...random-panjang...
CRON_SECRET=...
APP_TIMEZONE=Asia/Jakarta
NEXT_PUBLIC_APP_TIMEZONE=Asia/Jakarta
PORT=3000

MIKROTIK_DRIVER=real
MIKROTIK_TLS_INSECURE=true
DUITKU_DRIVER=real
DUITKU_CALLBACK_URL=https://isp.tunnelhost.my.id/api/webhook/duitku
DUITKU_RETURN_URL=https://isp.tunnelhost.my.id/bayar/selesai

# Deploy dari dashboard superadmin (opsional)
DEPLOY_ENABLED=true
DEPLOY_PM2_APP=billingisp
DEPLOY_PM2_WORKER_APP=billingisp-worker
```

> Router Mikrotik dikonfigurasi di **ISP → Router** per tenant, bukan di `.env`.

#### A4. Schema database (SQLite)

```bash
npm run db:ensure-schema
```

Patch idempotent — aman dijalankan setiap deploy. **Jangan** `npm run db:seed` jika sudah ada data live.

Opsional **hanya server baru / staging kosong**:

```bash
npm run db:seed
```

#### A5. Build production

```bash
npm run build
```

#### A6. PM2 — aplikasi web (SQLite)

Jalankan sebagai **user pemilik folder app** (bukan root):

```bash
npm install -g pm2
cd /home/tunnelhost-isp/htdocs/isp.tunnelhost.my.id

pm2 start ecosystem.config.cjs --only billingisp
# atau: pm2 start npm --name billingisp -- start
pm2 save
```

#### A7. PM2 — auto-start saat reboot (wajib, sekali)

```bash
pm2 startup
# Salin & jalankan perintah sudo yang ditampilkan PM2, lalu:
pm2 save
```

Verifikasi: `pm2 list` → `billingisp` **online**. Simulasi: `pm2 kill && pm2 resurrect`.

#### A8. Redis + worker PM2 (SQLite)

Job berat (batch WhatsApp, webhook) memakai **BullMQ + Redis**. Tanpa Redis, job dijalankan inline di proses web.

**A8.1 Pasang Redis (Ubuntu/Debian):**

```bash
sudo apt update && sudo apt install -y redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server
redis-cli ping   # harus PONG
```

**A8.2 Tambahkan ke `.env`:**

```env
# Index /0 — jika hanya satu app di VPS, /0 atau tanpa suffix juga OK
REDIS_URL=redis://127.0.0.1:6379/0
QUEUE_DRIVER=redis
QUEUE_CONCURRENCY=5
DEPLOY_PM2_WORKER_APP=billingisp-worker
```

> Jika di VPS yang sama juga jalan app PostgreSQL (Opsi B), pakai **`/0`** di sini dan **`/1`** di app PostgreSQL — jangan URL identik tanpa index.

**A8.3 Jalankan worker PM2 (sekali, setelah web app jalan):**

```bash
cd /home/tunnelhost-isp/htdocs/isp.tunnelhost.my.id
pm2 start ecosystem.config.cjs --only billingisp-worker
pm2 save
```

**A8.4 Verifikasi worker:**

```bash
pm2 list                              # billingisp + billingisp-worker online
pm2 logs billingisp-worker --lines 20 # harus: Worker netmanage started
redis-cli ping                        # PONG
```

Deploy otomatis (Superadmin → Update Aplikasi) me-restart **web + worker** jika `REDIS_URL` aktif.

#### A9. Nginx reverse proxy (SQLite)

```nginx
server {
    listen 80;
    server_name isp.tunnelhost.my.id;

    location = /.well-known/assetlinks.json {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

HTTPS: `sudo certbot --nginx -d isp.tunnelhost.my.id`

Nginx upload: `client_max_body_size 3m;` di blok `server`.

#### A10. Update rutin (SQLite)

```bash
cd /home/tunnelhost-isp/htdocs/isp.tunnelhost.my.id
git pull origin netmanage-implementation
npm ci --include=dev
npm run db:ensure-schema
npm run build
pm2 restart billingisp billingisp-worker --update-env
```

Atau **Superadmin → Update Aplikasi** jika `DEPLOY_ENABLED=true`.

---

### Opsi B — PostgreSQL (step-by-step)

Contoh path: `/home/tunnelhost-billisp/htdocs/billisp.tunnelhost.my.id` · domain `https://billisp.tunnelhost.my.id` · port **3001**.

#### B1. Prasyarat — pasang PostgreSQL

```bash
sudo apt update && sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable postgresql
sudo systemctl start postgresql
```

Buat database dan user (sesuaikan password):

```bash
sudo -u postgres psql <<'SQL'
CREATE USER netmanage WITH PASSWORD 'GANTI_PASSWORD_KUAT';
CREATE DATABASE netmanage OWNER netmanage;
GRANT ALL PRIVILEGES ON DATABASE netmanage TO netmanage;
GRANT ALL ON SCHEMA public TO netmanage;
SQL
```

> **PostgreSQL 15+:** jika database dibuat tanpa `OWNER netmanage`, user hanya dapat `CONNECT` ke DB — migrasi gagal (exit 1, tabel `public` tetap 0). Perbaiki:
> `sudo -u postgres psql -d netmanage -c "GRANT ALL ON SCHEMA public TO netmanage;"`
> atau `ALTER DATABASE netmanage OWNER TO netmanage;`

#### B2. Clone / pull kode

```bash
cd /home/tunnelhost-billisp/htdocs/billisp.tunnelhost.my.id
git fetch origin
git checkout netmanage-implementation
git pull origin netmanage-implementation
```

#### B3. Install dependensi

```bash
npm ci --include=dev
npm run uploads:ensure-dirs
```

#### B4. Konfigurasi `.env` (PostgreSQL)

```env
NEXT_PUBLIC_APP_URL=https://billisp.tunnelhost.my.id
DATABASE_DRIVER=postgres
DATABASE_URL=postgresql://netmanage:GANTI_PASSWORD_KUAT@localhost:5432/netmanage
AUTH_SECRET=...random-panjang...
CRON_SECRET=...
APP_TIMEZONE=Asia/Jakarta
NEXT_PUBLIC_APP_TIMEZONE=Asia/Jakarta
PORT=3001

MIKROTIK_DRIVER=real
MIKROTIK_TLS_INSECURE=true
DUITKU_DRIVER=real
DUITKU_CALLBACK_URL=https://billisp.tunnelhost.my.id/api/webhook/duitku
DUITKU_RETURN_URL=https://billisp.tunnelhost.my.id/bayar/selesai

DEPLOY_ENABLED=true
DEPLOY_PM2_APP=billisp
DEPLOY_PM2_WORKER_APP=billisp-worker
```

> Jika password mengandung `@`, `:`, `/` — encode URL (`@` → `%40`).

#### B5. Schema database (PostgreSQL)

**Instal baru:**

```bash
npm run db:migrate:pg
```

**Migrasi dari SQLite existing** (sekali, jika pindah database):

```bash
npm run db:migrate-sqlite-to-pg
```

Setiap deploy berikutnya:

```bash
npm run db:migrate:pg
```

#### B6. Build production

```bash
npm run build
```

#### B7. PM2 — aplikasi web (PostgreSQL)

```bash
npm install -g pm2
cd /home/tunnelhost-billisp/htdocs/billisp.tunnelhost.my.id

PORT=3001 pm2 start npm --name billisp -- start
pm2 save
```

#### B8. PM2 — auto-start saat reboot (wajib, sekali)

```bash
pm2 startup
# Jalankan perintah sudo dari output PM2, lalu:
pm2 save
```

#### B9. Redis + worker PM2 (PostgreSQL)

Langkah Redis **sama** dengan Opsi A (A8.1). Tambahkan ke `.env`:

```env
# Index /1 — pisahkan dari app SQLite (Opsi A) yang pakai /0
REDIS_URL=redis://127.0.0.1:6379/1
QUEUE_DRIVER=redis
QUEUE_CONCURRENCY=5
DEPLOY_PM2_WORKER_APP=billisp-worker
```

Jalankan worker (nama berbeda dari server SQLite):

```bash
cd /home/tunnelhost-billisp/htdocs/billisp.tunnelhost.my.id
pm2 start npm --name billisp-worker -- run queue:worker
pm2 save
```

Verifikasi:

```bash
pm2 list
pm2 logs billisp-worker --lines 20
```

> Worker membutuhkan stub `server-only` (sudah di repo: `scripts/register-server-only-stub.mjs`). Pastikan kode terbaru sudah di-pull.

#### B10. Nginx reverse proxy (PostgreSQL)

Sama seperti Opsi A, ganti `server_name` dan `proxy_pass http://127.0.0.1:3001`.

#### B11. Update rutin (PostgreSQL)

```bash
cd /home/tunnelhost-billisp/htdocs/billisp.tunnelhost.my.id
git pull origin netmanage-implementation
npm ci --include=dev
npm run db:migrate:pg
npm run build
pm2 restart billisp billisp-worker --update-env
```

Backup sebelum update: `pg_dump` atau fitur backup superadmin.

---

### Redis — dua app di satu VPS

Satu `redis-server` di port **6379** cukup untuk beberapa aplikasi NetManage sekaligus. Port yang sama **bukan masalah** — Redis memang dirancang untuk banyak client.

Yang perlu dihindari: **dua worker** (`billingisp-worker` + `billisp-worker`) memakai `REDIS_URL` identik **tanpa** pemisahan namespace. Antrian BullMQ memakai nama tetap `netmanage`; worker dari app lain bisa **mengambil job** milik app satunya dan memprosesnya ke database yang salah.

**Solusi (disarankan):** beda **database index** di URL:

| App | Contoh `REDIS_URL` |
|-----|-------------------|
| SQLite (`isp...`) | `redis://127.0.0.1:6379/0` |
| PostgreSQL (`billisp...`) | `redis://127.0.0.1:6379/1` |

Redis default menyediakan index **0–15**; antrian, job, dan key cache terisolasi per index.

Setelah mengubah `.env`:

```bash
pm2 restart billingisp billingisp-worker --update-env
pm2 restart billisp billisp-worker --update-env
```

**Hanya satu app** di VPS? `redis://127.0.0.1:6379` atau `.../0` keduanya aman.

**Alternatif:** instance Redis terpisah (port lain, mis. `6380`) — isolasi penuh, lebih boros RAM.

---

### PM2 — kesalahan umum (SQLite & PostgreSQL)

| Masalah | Penyebab | Solusi |
|---------|----------|--------|
| Setelah reboot app mati | Belum `pm2 startup` + sudo | Jalankan A7 / B8 |
| `pm2 resurrect` kosong | Belum `pm2 save` | `pm2 save` setelah setiap perubahan |
| Worker crash loop `server-only` | Kode lama | `git pull` commit terbaru, restart worker |
| Worker error `REDIS_URL` kosong | `.env` belum diset | Tambah `REDIS_URL` + `QUEUE_DRIVER=redis`, `--update-env` |
| `Queue tidak aktif` | Redis env missing | Set env, `pm2 restart billisp-worker --update-env` |
| Job WhatsApp/cron diproses app lain | Dua app, `REDIS_URL` sama tanpa index | Beda index: `/0` vs `/1`; restart kedua worker |
| Git/npm EACCES | PM2 jalan sebagai root | Jalankan PM2 sebagai user pemilik repo |

File ecosystem: [`ecosystem.config.cjs`](ecosystem.config.cjs) — default nama `billingisp` / `billingisp-worker`. Server PostgreSQL bisa pakai perintah `pm2 start npm --name billisp-worker` seperti B9.

### Checklist verifikasi deploy

| Cek | SQLite | PostgreSQL |
|-----|--------|------------|
| App online | `pm2 list` → billingisp | `pm2 list` → billisp |
| Worker online | billingisp-worker | billisp-worker |
| Redis | `redis-cli ping` → PONG | sama |
| Schema | `npm run db:ensure-schema` OK | `npm run db:migrate:pg` OK |
| Homepage | `https://isp.../` | `https://billisp.../` |
| Cron | `curl -H "Authorization: Bearer $CRON_SECRET" .../api/cron` | sama |
| Log | `pm2 logs billingisp --lines 30` | `pm2 logs billisp --lines 30` |

### Catatan deploy tambahan

| Topik | Keterangan |
|-------|------------|
| **Jaringan Mikrotik** | Server production harus bisa menjangkau IP/router (VPN/LAN). |
| **Redis multi-app** | Satu VPS, dua deploy: `REDIS_URL` beda index (`/0` vs `/1`). |
| **PM2 reboot** | Wajib `pm2 startup` (sudo) + `pm2 save`; jalankan PM2 sebagai user pemilik repo. |
| **Duitku** | `DUITKU_CALLBACK_URL` harus URL publik server, bukan localhost. |
| **Nginx App Links** | Jika `404` di `/.well-known/assetlinks.json`, tambahkan `location =` di atas blok certbot; set `ANDROID_APP_LINK_SHA256` di `.env`. |
| **Timezone** | `APP_TIMEZONE=Asia/Jakarta` di `.env`; opsional `TZ=Asia/Jakarta` di ecosystem PM2. |

### Pasang cron (wajib production — SQLite & PostgreSQL)

Isolasi otomatis & reminder jatuh tempo membutuhkan jadwal cron. Detail lengkap di bagian **[Pasang Cron (Background Worker)](#pasang-cron-background-worker)**.

Ringkas (SQLite — sesuaikan URL untuk PostgreSQL):

```bash
# 1. Set CRON_SECRET di .env, lalu:
pm2 restart billingisp --update-env          # SQLite
# pm2 restart billisp --update-env           # PostgreSQL

# 2. crontab -e
0 6 * * * curl -fsS -m 120 -H "Authorization: Bearer ISI_CRON_SECRET" https://isp.tunnelhost.my.id/api/cron >> /var/log/billingisp-cron.log 2>&1
```

### 9. Update rutin dengan systemd

Setelah `git pull` atau update kode:

```bash
cd /home/tunnelhost-isp/htdocs/isp.tunnelhost.my.id
git pull origin netmanage-implementation
npm ci --include=dev

# SQLite
npm run db:ensure-schema
npm run build
sudo systemctl restart billingisp billingisp-worker

# PostgreSQL
npm run db:migrate:pg
npm run build
sudo systemctl restart billisp billisp-worker
```

### 10. Monitoring dan health check

#### Cek status semua service

```bash
# SQLite
sudo systemctl status redis-server billingisp billingisp-worker billingisp-cron.timer

# PostgreSQL
sudo systemctl status redis-server postgresql billisp billisp-worker billisp-cron.timer
```

#### Health check otomatis dengan systemd

Tambahkan di file service aplikasi web (contoh `billingisp.service`):

```ini
[Service]
# ... existing config ...

# Health check setiap 30 detik
ExecStartPost=/bin/sleep 5
ExecStartPost=/usr/bin/curl -f http://127.0.0.1:3000/api/health || exit 1

# Restart jika health check gagal 3 kali berturut-turut
StartLimitBurst=3
StartLimitIntervalSec=120
```

Buat endpoint health check di aplikasi (`src/app/api/health/route.ts`):

```typescript
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ status: 'ok', timestamp: new Date().toISOString() });
}
```

#### Alerting dengan systemd (email saat service down)

Install mail utility:

```bash
sudo apt install -y mailutils
```

Buat script notifikasi `/usr/local/bin/systemd-email`:

```bash
#!/bin/bash
/usr/bin/mail -s "$1" admin@yourdomain.com
```

```bash
sudo chmod +x /usr/local/bin/systemd-email
```

Tambahkan di file service (contoh `billingisp.service`):

```ini
[Unit]
# ... existing config ...
OnFailure=failure-email@%n.service

[Service]
# ... existing config ...
```

Buat template email `/etc/systemd/system/failure-email@.service`:

```ini
[Unit]
Description=Send email on service failure

[Service]
Type=oneshot
ExecStart=/bin/sh -c 'echo "Service %i failed at $(date)" | /usr/local/bin/systemd-email "Service %i Failed"'
```

### 11. Resource limiting dengan systemd

Batasi penggunaan CPU dan memory untuk mencegah crash:

Edit file service (contoh `billingisp.service`):

```ini
[Service]
# ... existing config ...

# Limit memory ke 1GB (sesuaikan dengan RAM server)
MemoryLimit=1G
MemoryAccounting=true

# Limit CPU ke 80%
CPUQuota=80%
CPUAccounting=true

# Limit jumlah file descriptors
LimitNOFILE=4096

# Restart jika process menggunakan lebih dari 1GB
MemoryMax=1G
```

Monitoring resource usage:

```bash
# Lihat penggunaan memory dan CPU
sudo systemctl status billingisp

# Detail resource accounting
sudo systemd-cgtop

# Lihat limit yang aktif
sudo systemctl show billingisp --property=MemoryLimit,CPUQuota
```

### 12. Log rotation untuk systemd

Journald otomatis rotate log, tapi bisa dikonfigurasi di `/etc/systemd/journald.conf`:

```ini
[Journal]
# Limit total log size ke 500MB
SystemMaxUse=500M

# Limit per file log ke 50MB
SystemMaxFileSize=50M

# Simpan log maksimal 2 minggu
MaxRetentionSec=2week

# Compress log lama
Compress=yes
```

Setelah edit, restart journald:

```bash
sudo systemctl restart systemd-journald
```

Clean up log manual:

```bash
# Hapus log lebih dari 7 hari
sudo journalctl --vacuum-time=7d

# Hapus log sampai total size 200MB
sudo journalctl --vacuum-size=200M
```

### 13. Backup dan restore dengan systemd

#### Backup otomatis dengan systemd timer (Full Backup)

Systemd timer dapat melakukan backup database lengkap dengan rotasi otomatis dan retention policy.

##### A. Buat script backup dengan rotasi (SQLite)

`/home/tunnelhost-isp/htdocs/isp.tunnelhost.my.id/scripts/backup-systemd.sh`:

```bash
#!/bin/bash
# Full backup script dengan rotasi otomatis untuk SQLite

BACKUP_DIR="/home/tunnelhost-isp/htdocs/isp.tunnelhost.my.id/data/backups/platform"
DB_PATH="/home/tunnelhost-isp/htdocs/isp.tunnelhost.my.id/netmanage.db"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="netmanage_full_${TIMESTAMP}.db"
RETENTION_DAYS=30  # Simpan backup 30 hari terakhir
MAX_BACKUPS=10     # Simpan maksimal 10 backup terbaru

# Buat direktori backup jika belum ada
mkdir -p "$BACKUP_DIR"

# Backup database menggunakan SQLite .backup
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting full backup..."
sqlite3 "$DB_PATH" ".backup '$BACKUP_DIR/$BACKUP_FILE'"

if [ $? -eq 0 ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup berhasil: $BACKUP_FILE"
    
    # Compress backup (opsional, hemat disk space)
    gzip "$BACKUP_DIR/$BACKUP_FILE"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Compressed: ${BACKUP_FILE}.gz"
    
    # Rotasi: hapus backup lebih dari RETENTION_DAYS hari
    find "$BACKUP_DIR" -name "netmanage_full_*.db.gz" -type f -mtime +$RETENTION_DAYS -delete
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Deleted backups older than $RETENTION_DAYS days"
    
    # Rotasi: simpan hanya MAX_BACKUPS backup terbaru
    BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/netmanage_full_*.db.gz 2>/dev/null | wc -l)
    if [ "$BACKUP_COUNT" -gt "$MAX_BACKUPS" ]; then
        ls -1t "$BACKUP_DIR"/netmanage_full_*.db.gz | tail -n +$((MAX_BACKUPS + 1)) | xargs rm -f
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] Kept only $MAX_BACKUPS most recent backups"
    fi
    
    # Tampilkan ukuran backup
    BACKUP_SIZE=$(du -h "$BACKUP_DIR/${BACKUP_FILE}.gz" | cut -f1)
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup size: $BACKUP_SIZE"
    
    # Tampilkan total backup yang tersimpan
    TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Total backup size: $TOTAL_SIZE"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Total backups: $(ls -1 "$BACKUP_DIR"/netmanage_full_*.db.gz | wc -l)"
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: Backup failed!"
    exit 1
fi
```

Buat executable:

```bash
chmod +x /home/tunnelhost-isp/htdocs/isp.tunnelhost.my.id/scripts/backup-systemd.sh
```

##### B. Buat script backup PostgreSQL

`/home/tunnelhost-billisp/htdocs/billisp.tunnelhost.my.id/scripts/backup-systemd.sh`:

```bash
#!/bin/bash
# Full backup script dengan rotasi otomatis untuk PostgreSQL

BACKUP_DIR="/home/tunnelhost-billisp/htdocs/billisp.tunnelhost.my.id/data/backups/platform"
DB_NAME="netmanage"
DB_USER="netmanage"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="netmanage_full_${TIMESTAMP}.sql"
RETENTION_DAYS=30
MAX_BACKUPS=10

mkdir -p "$BACKUP_DIR"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting full backup..."

# Backup PostgreSQL menggunakan pg_dump (gunakan .pgpass untuk password)
PGPASSWORD="${DB_PASSWORD:-}" pg_dump -U "$DB_USER" -h localhost -d "$DB_NAME" -F c -f "$BACKUP_DIR/$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup berhasil: $BACKUP_FILE"
    
    # Compress jika format plain SQL (format custom -F c sudah compressed)
    # gzip "$BACKUP_DIR/$BACKUP_FILE"
    
    # Rotasi backup
    find "$BACKUP_DIR" -name "netmanage_full_*.sql" -type f -mtime +$RETENTION_DAYS -delete
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Deleted backups older than $RETENTION_DAYS days"
    
    BACKUP_COUNT=$(ls -1 "$BACKUP_DIR"/netmanage_full_*.sql 2>/dev/null | wc -l)
    if [ "$BACKUP_COUNT" -gt "$MAX_BACKUPS" ]; then
        ls -1t "$BACKUP_DIR"/netmanage_full_*.sql | tail -n +$((MAX_BACKUPS + 1)) | xargs rm -f
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] Kept only $MAX_BACKUPS most recent backups"
    fi
    
    BACKUP_SIZE=$(du -h "$BACKUP_DIR/$BACKUP_FILE" | cut -f1)
    TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
    TOTAL_COUNT=$(ls -1 "$BACKUP_DIR"/netmanage_full_*.sql | wc -l)
    
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup size: $BACKUP_SIZE"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Total backup size: $TOTAL_SIZE"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Total backups: $TOTAL_COUNT"
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: Backup failed!"
    exit 1
fi
```

Untuk PostgreSQL, buat file `.pgpass` agar tidak perlu input password:

```bash
echo "localhost:5432:netmanage:netmanage:GANTI_PASSWORD_KUAT" > ~/.pgpass
chmod 600 ~/.pgpass
```

##### C. Buat systemd service untuk backup

SQLite — `/etc/systemd/system/billingisp-backup.service`:

```ini
[Unit]
Description=NetManage ISP Full Backup (SQLite)
After=billingisp.service

[Service]
Type=oneshot
User=tunnelhost-isp
Group=tunnelhost-isp
WorkingDirectory=/home/tunnelhost-isp/htdocs/isp.tunnelhost.my.id
ExecStart=/home/tunnelhost-isp/htdocs/isp.tunnelhost.my.id/scripts/backup-systemd.sh
StandardOutput=journal
StandardError=journal
SyslogIdentifier=billingisp-backup

# Timeout 30 menit untuk database besar
TimeoutStartSec=1800
```

PostgreSQL — `/etc/systemd/system/billisp-backup.service`:

```ini
[Unit]
Description=NetManage ISP Full Backup (PostgreSQL)
After=billisp.service postgresql.service

[Service]
Type=oneshot
User=tunnelhost-billisp
Group=tunnelhost-billisp
WorkingDirectory=/home/tunnelhost-billisp/htdocs/billisp.tunnelhost.my.id
Environment="DB_PASSWORD=GANTI_PASSWORD_KUAT"
ExecStart=/home/tunnelhost-billisp/htdocs/billisp.tunnelhost.my.id/scripts/backup-systemd.sh
StandardOutput=journal
StandardError=journal
SyslogIdentifier=billisp-backup
TimeoutStartSec=1800
```

##### D. Buat systemd timer untuk schedule backup

SQLite — `/etc/systemd/system/billingisp-backup.timer`:

```ini
[Unit]
Description=NetManage ISP Daily Full Backup Timer
Requires=billingisp-backup.service

[Timer]
# Backup setiap hari jam 02:00
OnCalendar=*-*-* 02:00:00

# Backup mingguan (setiap Minggu jam 03:00)
# OnCalendar=Sun *-*-* 03:00:00

# Backup setiap 6 jam
# OnCalendar=*-*-* 00,06,12,18:00:00

# Jalan saat boot jika terlewat
Persistent=true

# Delay acak 0-10 menit (hindari spike load jika banyak service backup bersamaan)
RandomizedDelaySec=600

[Install]
WantedBy=timers.target
```

PostgreSQL — `/etc/systemd/system/billisp-backup.timer`:

```ini
[Unit]
Description=NetManage ISP Daily Full Backup Timer
Requires=billisp-backup.service

[Timer]
OnCalendar=*-*-* 02:00:00
Persistent=true
RandomizedDelaySec=600

[Install]
WantedBy=timers.target
```

##### E. Enable dan start backup timer

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable timer (auto-start setelah reboot)
sudo systemctl enable billingisp-backup.timer

# Start timer
sudo systemctl start billingisp-backup.timer

# Verifikasi timer aktif
sudo systemctl list-timers billingisp-backup.timer
sudo systemctl status billingisp-backup.timer

# Tes manual backup (tanpa menunggu jadwal)
sudo systemctl start billingisp-backup.service

# Lihat log backup
sudo journalctl -u billingisp-backup.service -n 50 --no-pager
sudo journalctl -u billingisp-backup.service --since today
```

##### F. Strategi backup multi-tier (production)

Untuk production yang lebih robust, kombinasikan beberapa strategi:

**1. Backup lokal harian (systemd timer)**
- Retention: 30 hari
- Schedule: setiap hari jam 02:00

**2. Backup mingguan ke remote storage**

Edit script backup, tambahkan sync ke remote:

```bash
# Tambahkan di akhir script backup-systemd.sh

# Sync ke remote server via rsync (setiap Minggu)
if [ $(date +%u) -eq 7 ]; then  # 7 = Minggu
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Syncing to remote backup..."
    rsync -avz --delete \
        "$BACKUP_DIR/" \
        backup-user@backup-server.com:/backups/netmanage/
    
    if [ $? -eq 0 ]; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] Remote sync completed"
    else
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: Remote sync failed"
    fi
fi

# Atau upload ke S3/Wasabi
# aws s3 sync "$BACKUP_DIR/" s3://your-bucket/netmanage-backups/
```

**3. Backup snapshot bulanan**

Buat timer terpisah untuk backup bulanan:

`/etc/systemd/system/billingisp-backup-monthly.timer`:

```ini
[Unit]
Description=NetManage ISP Monthly Full Backup
Requires=billingisp-backup.service

[Timer]
# Setiap tanggal 1 jam 03:00
OnCalendar=*-*-01 03:00:00
Persistent=true

[Install]
WantedBy=timers.target
```

##### G. Monitoring backup size dan health check

Tambahkan monitoring script `/usr/local/bin/check-backup-health.sh`:

```bash
#!/bin/bash
# Health check untuk backup

BACKUP_DIR="/home/tunnelhost-isp/htdocs/isp.tunnelhost.my.id/data/backups/platform"
MAX_AGE_HOURS=26  # Alert jika backup terakhir > 26 jam (daily backup harusnya < 24 jam)
ALERT_EMAIL="admin@yourdomain.com"

# Cari backup terbaru
LATEST_BACKUP=$(ls -1t "$BACKUP_DIR"/netmanage_full_*.db.gz 2>/dev/null | head -n1)

if [ -z "$LATEST_BACKUP" ]; then
    echo "ERROR: No backups found!" | mail -s "Backup Alert: No backups" "$ALERT_EMAIL"
    exit 1
fi

# Cek umur backup
BACKUP_AGE=$(( ($(date +%s) - $(stat -c %Y "$LATEST_BACKUP")) / 3600 ))

if [ $BACKUP_AGE -gt $MAX_AGE_HOURS ]; then
    echo "WARNING: Latest backup is $BACKUP_AGE hours old" | \
        mail -s "Backup Alert: Outdated backup" "$ALERT_EMAIL"
    exit 1
fi

# Cek ukuran backup (minimal 100KB, sesuaikan dengan database Anda)
BACKUP_SIZE=$(stat -c %s "$LATEST_BACKUP")
if [ $BACKUP_SIZE -lt 102400 ]; then
    echo "ERROR: Backup file too small: $BACKUP_SIZE bytes" | \
        mail -s "Backup Alert: Suspicious backup size" "$ALERT_EMAIL"
    exit 1
fi

echo "Backup health check OK: $LATEST_BACKUP ($BACKUP_AGE hours old, $(du -h "$LATEST_BACKUP" | cut -f1))"
exit 0
```

Jalankan health check setiap hari via cron atau systemd timer.

##### H. Restore dari backup systemd

**SQLite:**

```bash
# 1. Stop aplikasi
sudo systemctl stop billingisp billingisp-worker

# 2. Backup database saat ini (sebagai safety)
cp /home/tunnelhost-isp/htdocs/isp.tunnelhost.my.id/netmanage.db \
   /home/tunnelhost-isp/htdocs/isp.tunnelhost.my.id/netmanage.db.before-restore

# 3. Extract dan restore backup
cd /home/tunnelhost-isp/htdocs/isp.tunnelhost.my.id
gunzip -c data/backups/platform/netmanage_full_20260802_020000.db.gz > netmanage.db

# 4. Verifikasi integrity
sqlite3 netmanage.db "PRAGMA integrity_check;"

# 5. Start aplikasi
sudo systemctl start billingisp billingisp-worker
sudo systemctl status billingisp
```

**PostgreSQL:**

```bash
# 1. Stop aplikasi
sudo systemctl stop billisp billisp-worker

# 2. Drop dan recreate database
sudo -u postgres psql -c "DROP DATABASE netmanage;"
sudo -u postgres psql -c "CREATE DATABASE netmanage OWNER netmanage;"

# 3. Restore dari backup
cd /home/tunnelhost-billisp/htdocs/billisp.tunnelhost.my.id
pg_restore -U netmanage -d netmanage -v \
    data/backups/platform/netmanage_full_20260802_020000.sql

# 4. Start aplikasi
sudo systemctl start billisp billisp-worker
```

##### I. Backup statistics dan reporting

Tambahkan script untuk laporan backup:

```bash
#!/bin/bash
# Backup statistics report

BACKUP_DIR="/home/tunnelhost-isp/htdocs/isp.tunnelhost.my.id/data/backups/platform"

echo "=== NetManage Backup Statistics ==="
echo "Date: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""
echo "Total backups: $(ls -1 "$BACKUP_DIR"/netmanage_full_*.db.gz 2>/dev/null | wc -l)"
echo "Total size: $(du -sh "$BACKUP_DIR" | cut -f1)"
echo ""
echo "Latest backups:"
ls -lht "$BACKUP_DIR"/netmanage_full_*.db.gz | head -n 5
echo ""
echo "Oldest backup: $(ls -lt "$BACKUP_DIR"/netmanage_full_*.db.gz | tail -n1 | awk '{print $6, $7, $8, $9}')"
echo "Newest backup: $(ls -lt "$BACKUP_DIR"/netmanage_full_*.db.gz | head -n1 | awk '{print $6, $7, $8, $9}')"
```

Jalankan via cron untuk kirim laporan mingguan:

```cron
# Setiap Senin jam 08:00
0 8 * * 1 /usr/local/bin/backup-stats.sh | mail -s "Weekly Backup Report" admin@yourdomain.com
```

### 14. Migrasi dari PM2 ke systemd

Jika sudah jalan dengan PM2 dan ingin beralih ke systemd:

```bash
# 1. Stop dan disable PM2
pm2 stop all
pm2 delete all
pm2 kill
pm2 unstartup

# 2. Buat systemd service files (lihat langkah 2 & 3)

# 3. Enable dan start systemd services
sudo systemctl daemon-reload
sudo systemctl enable billingisp billingisp-worker billingisp-cron.timer
sudo systemctl start billingisp billingisp-worker billingisp-cron.timer

# 4. Verifikasi
sudo systemctl status billingisp billingisp-worker
sudo journalctl -u billingisp -f

# 5. Hapus PM2 (opsional)
npm uninstall -g pm2
```

### 15. Checklist verifikasi deploy dengan systemd

| Cek | Command | Expected Output |
|-----|---------|-----------------|
| Redis | `sudo systemctl status redis-server` | `active (running)` |
| Web app | `sudo systemctl status billingisp` | `active (running)` |
| Worker | `sudo systemctl status billingisp-worker` | `active (running)` |
| Cron timer | `sudo systemctl list-timers billingisp-cron.timer` | `NEXT` kolom terisi |
| Redis ping | `redis-cli ping` | `PONG` |
| App response | `curl -I http://127.0.0.1:3000` | `HTTP/1.1 200 OK` |
| Worker log | `sudo journalctl -u billingisp-worker -n 10` | `Worker netmanage started` |
| Auto-start | `sudo systemctl is-enabled billingisp` | `enabled` |

## Integrasi Mikrotik

Set `MIKROTIK_DRIVER=real` di `.env`, lalu tambah router di **ISP → Router**:

| Mode | Port default | Keterangan |
|------|--------------|------------|
| REST | 443 (HTTPS) | RouterOS v7+ |
| Legacy API | 8728 | RouterOS API klasik |

Fitur sinkron:

- **Paket** → profile PPPoE/Hotspot dari router terpilih
- **Pelanggan** → create/update: upsert secret/user (`service=pppoe` untuk PPPoE)
- **Hapus pelanggan** → hapus user di Mikrotik + cascade invoice/tiket di DB
- **Isolir / aktifkan** → disable/enable user di router

## Struktur Proyek

```
src/
  app/            # rute per area: (auth), superadmin, isp, kolektor, portal, api
  components/     # ui (shadcn-style), layout, theme
  features/<domain>/   # service.ts (logika+DB), actions.ts (server action), components/
  lib/
    db/           # schema Drizzle, client, seed
    auth/         # password, session, otp, guard peran
    integrations/ # mikrotik (rest, legacy, http), duitku, whatsapp, maps
    theme/        # preset warna
    tenant/       # resolusi tenant
    jobs/ print/  # background worker, cetak thermal
  proxy.ts        # cek cookie session (pengganti middleware Next 16)
```

## Cara Menambah Fitur Baru

1. Buat folder `src/features/<domain>/` berisi `service.ts` (akses DB, selalu filter `tenantId`) dan `actions.ts` (`"use server"`).
2. Tambahkan tabel di `src/lib/db/schema.ts` lalu `npm run db:push`.
3. Buat halaman di `src/app/<area>/<domain>/page.tsx`, panggil guard `requireUser([...])`.
4. Tambah item navigasi di `src/components/layout/app-shell.tsx`.

## Mengganti Mock ke Integrasi Nyata

Setel driver di `.env` (`MIKROTIK_DRIVER`, `DUITKU_DRIVER`, `WHATSAPP_DRIVER`, `MAPS_DRIVER`) ke `real`. Untuk multi-tenant, prioritas credential adalah konfigurasi tenant di menu **ISP → Integrasi**; jika tenant belum punya konfigurasi, sistem fallback ke ENV global.
## Deploy dengan Systemd (Alternatif PM2)

Systemd adalah init system native di Linux yang lebih stabil dan terintegrasi dengan sistem operasi. Berikut cara menjalankan aplikasi NetManage dan Redis menggunakan systemd.

### 1. Install Redis sebagai systemd service

```bash
# Ubuntu/Debian
sudo apt update && sudo apt install -y redis-server

# Redis otomatis terinstall sebagai systemd service
sudo systemctl enable redis-server
sudo systemctl start redis-server
sudo systemctl status redis-server

# Verifikasi
redis-cli ping  # harus: PONG
```

Konfigurasi Redis (opsional) di `/etc/redis/redis.conf`:

```conf
# Untuk production, tambahkan password
requirepass YOUR_STRONG_PASSWORD_HERE

# Binding (default hanya localhost sudah aman untuk satu server)
bind 127.0.0.1 ::1

# Max memory (sesuaikan dengan RAM server)
maxmemory 256mb
maxmemory-policy allkeys-lru
```

Setelah edit config, restart Redis:

```bash
sudo systemctl restart redis-server
```

Jika pakai password, update `.env`:

```env
REDIS_URL=redis://:YOUR_STRONG_PASSWORD_HERE@127.0.0.1:6379/0
```

### 2. Buat systemd service untuk aplikasi web

#### SQLite — `/etc/systemd/system/billingisp.service`

```ini
[Unit]
Description=NetManage ISP Billing (SQLite)
After=network.target redis-server.service
Requires=redis-server.service

[Service]
Type=simple
User=tunnelhost-isp
Group=tunnelhost-isp
WorkingDirectory=/home/tunnelhost-isp/htdocs/isp.tunnelhost.my.id
Environment="NODE_ENV=production"
Environment="PORT=3000"
EnvironmentFile=/home/tunnelhost-isp/htdocs/isp.tunnelhost.my.id/.env
ExecStart=/usr/bin/node /home/tunnelhost-isp/htdocs/isp.tunnelhost.my.id/node_modules/.bin/next start
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=billingisp

# Security hardening (opsional)
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

#### PostgreSQL — `/etc/systemd/system/billisp.service`

```ini
[Unit]
Description=NetManage ISP Billing (PostgreSQL)
After=network.target postgresql.service redis-server.service
Requires=postgresql.service redis-server.service

[Service]
Type=simple
User=tunnelhost-billisp
Group=tunnelhost-billisp
WorkingDirectory=/home/tunnelhost-billisp/htdocs/billisp.tunnelhost.my.id
Environment="NODE_ENV=production"
Environment="PORT=3001"
EnvironmentFile=/home/tunnelhost-billisp/htdocs/billisp.tunnelhost.my.id/.env
ExecStart=/usr/bin/node /home/tunnelhost-billisp/htdocs/billisp.tunnelhost.my.id/node_modules/.bin/next start
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=billisp

NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

### 3. Buat systemd service untuk worker (BullMQ)

#### SQLite — `/etc/systemd/system/billingisp-worker.service`

```ini
[Unit]
Description=NetManage ISP Billing Worker (SQLite)
After=network.target redis-server.service billingisp.service
Requires=redis-server.service

[Service]
Type=simple
User=tunnelhost-isp
Group=tunnelhost-isp
WorkingDirectory=/home/tunnelhost-isp/htdocs/isp.tunnelhost.my.id
Environment="NODE_ENV=production"
EnvironmentFile=/home/tunnelhost-isp/htdocs/isp.tunnelhost.my.id/.env
ExecStart=/usr/bin/npm run queue:worker
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=billingisp-worker

NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

#### PostgreSQL — `/etc/systemd/system/billisp-worker.service`

```ini
[Unit]
Description=NetManage ISP Billing Worker (PostgreSQL)
After=network.target postgresql.service redis-server.service billisp.service
Requires=redis-server.service

[Service]
Type=simple
User=tunnelhost-billisp
Group=tunnelhost-billisp
WorkingDirectory=/home/tunnelhost-billisp/htdocs/billisp.tunnelhost.my.id
Environment="NODE_ENV=production"
EnvironmentFile=/home/tunnelhost-billisp/htdocs/billisp.tunnelhost.my.id/.env
ExecStart=/usr/bin/npm run queue:worker
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=billisp-worker

NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

### 4. Enable dan jalankan service

```bash
# Reload systemd untuk membaca file service baru
sudo systemctl daemon-reload

# SQLite
sudo systemctl enable billingisp billingisp-worker
sudo systemctl start billingisp billingisp-worker

# PostgreSQL
sudo systemctl enable billisp billisp-worker
sudo systemctl start billisp billisp-worker

# Verifikasi status
sudo systemctl status billingisp billingisp-worker
# atau
sudo systemctl status billisp billisp-worker
```

### 5. Perintah systemd berguna

```bash
# Cek status
sudo systemctl status billingisp
sudo systemctl status billingisp-worker

# Restart (setelah git pull atau update .env)
sudo systemctl restart billingisp billingisp-worker

# Stop
sudo systemctl stop billingisp billingisp-worker

# Lihat log real-time
sudo journalctl -u billingisp -f
sudo journalctl -u billingisp-worker -f

# Lihat log 50 baris terakhir
sudo journalctl -u billingisp -n 50 --no-pager

# Lihat log sejak hari ini
sudo journalctl -u billingisp --since today

# Lihat log dengan timestamp spesifik
sudo journalctl -u billingisp --since "2026-08-01 14:00" --until "2026-08-01 15:00"
```

### 6. Deploy otomatis dengan systemd

Jika `DEPLOY_ENABLED=true`, edit variabel di `.env`:

```env
# Untuk systemd, gunakan nama service sebagai PM2 app name
DEPLOY_PM2_APP=billingisp
DEPLOY_PM2_WORKER_APP=billingisp-worker
DEPLOY_USE_SYSTEMD=true  # aktifkan mode systemd
```

Fitur **Update Aplikasi** di dashboard superadmin akan menjalankan:

```bash
sudo systemctl restart billingisp billingisp-worker
```

#### Setup sudo untuk user aplikasi (wajib)

User aplikasi (mis. `tunnelhost-isp`) harus punya izin `sudo systemctl` tanpa password untuk restart service sendiri.

Edit sudoers dengan `visudo`:

```bash
sudo visudo
```

Tambahkan di akhir file (sesuaikan user dan nama service):

```bash
# SQLite - user tunnelhost-isp
tunnelhost-isp ALL=(ALL) NOPASSWD: /bin/systemctl restart billingisp
tunnelhost-isp ALL=(ALL) NOPASSWD: /bin/systemctl restart billingisp-worker
tunnelhost-isp ALL=(ALL) NOPASSWD: /bin/systemctl status billingisp
tunnelhost-isp ALL=(ALL) NOPASSWD: /bin/systemctl status billingisp-worker

# PostgreSQL - user tunnelhost-billisp (jika ada)
tunnelhost-billisp ALL=(ALL) NOPASSWD: /bin/systemctl restart billisp
tunnelhost-billisp ALL=(ALL) NOPASSWD: /bin/systemctl restart billisp-worker
tunnelhost-billisp ALL=(ALL) NOPASSWD: /bin/systemctl status billisp
tunnelhost-billisp ALL=(ALL) NOPASSWD: /bin/systemctl status billisp-worker
```

**Testing sudo tanpa password:**

```bash
# Jangan pakai sudo di depan, test sebagai user biasa
sudo systemctl status billingisp
# Seharusnya langsung jalan tanpa prompt password
```

Jika masih minta password, cek:
1. Baris sudoers sudah benar (tidak ada typo)
2. User sesuai dengan yang menjalankan aplikasi
3. Path binary `/bin/systemctl` benar (cek: `which systemctl`)

#### Konfigurasi deploy script systemd

Aplikasi akan otomatis detect mode deploy dari `.env`. Saat `DEPLOY_USE_SYSTEMD=true`, alur deploy:

**1. Dashboard Superadmin → Update Aplikasi**

**2. Backend menjalankan (`src/features/deploy/service.ts`):**

```bash
# Pull kode terbaru
git pull origin <branch>

# Install dependencies
npm ci --include=dev

# Database migration
npm run db:ensure-schema  # SQLite
# atau
npm run db:migrate:pg     # PostgreSQL

# Build production
npm run build

# Restart service via systemd (bukan PM2)
sudo systemctl restart billingisp billingisp-worker
```

**3. Verifikasi status:**

```bash
sudo systemctl status billingisp
sudo systemctl status billingisp-worker
```

#### Implementasi kode backend untuk systemd deploy

File yang sudah dimodifikasi:

**1. `scripts/deploy-app.ts` — tambahan support systemd:**

```typescript
// Detect systemd mode
function isSystemdMode(): boolean {
  return process.env.DEPLOY_USE_SYSTEMD === "true";
}

// Schedule systemd restart (async, non-blocking)
function scheduleSystemdRestart(webApp: string, workerApp: string | null) {
  if (process.platform === "win32") return;
  
  let command = `sudo systemctl restart ${webApp}`;
  if (workerApp) {
    command += ` ${workerApp}`;
  }
  
  const child = spawn("bash", ["-lc", command], {
    cwd: ROOT,
    detached: true,
    stdio: "ignore",
  });
  child.unref();
}

// Di main deploy flow
const useSystemd = isSystemdMode();
const restartStepName = useSystemd ? "systemd_restart" : "pm2_restart";

if (useSystemd) {
  scheduleSystemdRestart(webApp, workerApp);
  await log(`Menjadwalkan systemd restart ${webApp}…`);
} else {
  schedulePm2DeployRestart(buildPm2DeployRestartCommand());
  await log(`Menjadwalkan pm2 restart ${webApp}…`);
}
```

**2. `src/features/platform-deploy/pm2-targets.ts` — dynamic step names:**

```typescript
export function buildDeployStepNames(): string[] {
  const useSystemd = process.env.DEPLOY_USE_SYSTEMD === "true";
  const restartStep = useSystemd ? "systemd_restart" : "pm2_restart";
  const workerRestartStep = useSystemd ? "systemd_worker_restart" : "pm2_worker_restart";
  
  const steps = [
    "backup_database",
    "git_pull",
    "npm_ci",
    "db_ensure_schema",
    "npm_build",
    restartStep,
  ];
  if (isDeployWorkerEnabled()) {
    steps.push(workerRestartStep);
  }
  return steps;
}
```

#### Alur deploy lengkap dengan systemd

```
Dashboard Superadmin: "Update Aplikasi"
  ↓
POST /api/superadmin/deploy/trigger
  ↓
Deploy Script (scripts/deploy-app.ts):
  1. Lock file check (prevent concurrent deploys)
  2. Backup database (SQLite: cp, PostgreSQL: pg_dump)
  3. Git pull (git restore → git pull)
  4. npm ci --include=dev
  5. db:ensure-schema or db:migrate:pg
  6. npm run build
  7. Detach systemd restart (async, non-blocking):
     └─ sudo systemctl restart billingisp billingisp-worker
  8. Write deploy status: "success"
  ↓
Return to Dashboard (status: running → polling)
  ↓
Systemd restart (independent process):
  • Stop old app process
  • Start new app process (read updated .env)
  • Worker restart or start if needed
  ↓
Dashboard polls deploy status via API
  ↓
Show result: "Deploy sukses"
```

#### Environment variables deploy lengkap

```env
# === Deploy Configuration ===
DEPLOY_ENABLED=true                      # Enable fitur deploy dari dashboard
DEPLOY_USE_SYSTEMD=true                  # true = systemd, false/unset = PM2

# Service names (harus sesuai dengan nama systemd service di /etc/systemd/system/)
DEPLOY_PM2_APP=billingisp                # Nama service: billingisp.service
DEPLOY_PM2_WORKER_APP=billingisp-worker  # Nama service: billingisp-worker.service

# Optional
DEPLOY_GIT_BRANCH=netmanage-implementation  # Branch untuk git pull
DEPLOY_BUILD_TIMEOUT=600000              # Timeout build (ms), default 10 menit
```

#### Dashboard UI untuk deploy systemd

Di halaman Superadmin → Pengaturan → Update Aplikasi, akan muncul:

```
📋 Deploy Status

Mode: ⚙️ Systemd (jika DEPLOY_USE_SYSTEMD=true)
atau
Mode: 🟢 PM2 (default)

Current Branch: netmanage-implementation
Local Commit: abc1234
Remote Commit: def5678
Status: idle / running / success / failed

[⬇️ Check for Updates] [🚀 Deploy Now]

--- Deploy Steps ---
✓ Backup Database     (2 mins ago)
✓ Git Pull           (1 min ago)
✓ npm ci             (30 secs ago)
✓ Database Schema    (20 secs ago)
✓ npm build          (5 secs ago)
⟳ Systemd Restart    (in progress...)
  └─ billingisp: restarting
  └─ billingisp-worker: restarting

Deploy Log:
[2026-08-02 06:30:00] Deploy dimulai oleh super@netmanage.app (branch: netmanage-implementation, worker Redis aktif)
[2026-08-02 06:30:15] Backup DB → /data/backups/platform/pre-deploy-2026-08-02T063000.db
[2026-08-02 06:30:20] Git pull selesai @ def5678
[2026-08-02 06:30:35] npm ci selesai
[2026-08-02 06:30:45] db:ensure-schema selesai (SQLite)
[2026-08-02 06:35:10] npm run build selesai
[2026-08-02 06:35:15] Menjadwalkan systemd restart billingisp billingisp-worker…
[2026-08-02 06:35:18] Deploy sukses
```

#### Rollback jika deploy gagal

Jika deploy gagal di tahap build, backup database sudah tersimpan otomatis:

```bash
# 1. Cek backup
ls -lh data/backups/platform/pre-deploy-*.db

# 2. Stop aplikasi
sudo systemctl stop billingisp billingisp-worker

# 3. Restore backup
cp data/backups/platform/pre-deploy-2026-08-02T063000.db netmanage.db

# 4. Rollback git (opsional)
git reset --hard <commit-sebelumnya>

# 5. Restart aplikasi
sudo systemctl start billingisp billingisp-worker

# 6. Verifikasi
sudo systemctl status billingisp billingisp-worker
```

#### Monitoring deploy logs systemd

```bash
# Real-time logs saat deploy
sudo journalctl -u billingisp -f

# Lihat log deploy terakhir
sudo journalctl -u billingisp -n 100 --no-pager

# Log sejak hari ini
sudo journalctl -u billingisp --since today

# Log dengan filter keyword
sudo journalctl -u billingisp | grep -i "error\|warning\|deploy"

# Export log ke file
sudo journalctl -u billingisp --since "2026-08-01" > deploy-log-202608.txt
```

#### Checklist deploy systemd di production

| Item | Periksa | Notes |
|------|---------|-------|
| **Sudoers config** | `sudo visudo` | User harus bisa `sudo systemctl` tanpa password |
| **Systemd services** | `systemctl list-units \| grep billingisp` | Services sudah registered |
| **Permissions** | `ls -la /etc/systemd/system/billingisp*.service` | File readable |
| **.env variables** | `DEPLOY_USE_SYSTEMD=true` | Diset di production |
| **Service names** | Match di `.env` dan `/etc/systemd/system/` | `DEPLOY_PM2_APP=billingisp` ↔ `billingisp.service` |
| **Git access** | `cd /app && git pull origin branch` | User aplikasi punya akses repo |
| **Build timeout** | `DEPLOY_BUILD_TIMEOUT=600000` | Sesuaikan jika build lama |
| **Backup dir** | `mkdir -p data/backups/platform` | Directory writable |
| **Deploy script** | `npm run deploy:app` | Bisa dijalankan manual |
| **Dashboard** | Test "Check for Updates" | Harus ke backend & git successfully |

#### Perbedaan PM2 vs Systemd deploy

| Aspek | PM2 | Systemd |
|-------|-----|---------|
| **Trigger restart** | `pm2 restart billingisp` | `sudo systemctl restart billingisp` |
| **Worker** | `pm2 restart billingisp-worker` | `sudo systemctl restart billingisp-worker` |
| **Config** | `DEPLOY_USE_SYSTEMD=false` | `DEPLOY_USE_SYSTEMD=true` |
| **Sudo** | Tidak perlu | Wajib (sudoers NOPASSWD) |
| **Logging** | `pm2 logs` | `journalctl` |
| **Monitoring** | `pm2 monit` | `systemctl status` |
| **On-failure** | `pm2 restart` (auto) | `Restart=always` (auto) |
| **Update env** | `--update-env` | Automatic (re-read .env) |

#### Migration dari PM2 ke systemd

Jika sudah jalan PM2 dan ingin beralih deploy method ke systemd:

```bash
# 1. Setup sudoers untuk systemd (lihat step "Setup sudo")
sudo visudo
# Tambah baris untuk user aplikasi

# 2. Update .env di production
DEPLOY_USE_SYSTEMD=true
DEPLOY_PM2_APP=billingisp
DEPLOY_PM2_WORKER_APP=billingisp-worker

# 3. Restart aplikasi supaya baca .env baru
sudo systemctl restart billingisp billingisp-worker

# 4. Test deploy manual
npm run deploy:app

# 5. Verifikasi via dashboard
# Dashboard → Pengaturan → Update Aplikasi → "Deploy Now"
# Harusnya trigger systemd restart, bukan PM2
```

Kedua method (PM2 dan Systemd) **tidak perlu coexist**. Pilih salah satu untuk production.



### 7. Troubleshooting systemd

| Masalah | Solusi |
|---------|--------|
| `Failed to start` | Cek log: `sudo journalctl -u billingisp -n 50` |
| `EnvironmentFile not found` | Pastikan path `.env` benar & readable oleh user service |
| `Permission denied` saat akses DB | Ubah owner folder: `chown -R tunnelhost-isp:tunnelhost-isp /path/to/app` |
| Worker crash `server-only` | Update kode terbaru (`git pull`), lalu `systemctl restart` |
| Redis connection refused | Cek `sudo systemctl status redis-server`, pastikan `REDIS_URL` benar |
| Port 3000 already in use | Cek proses lain: `sudo lsof -i :3000`, atau ubah `PORT` di `.env` |
| Service tidak auto-start setelah reboot | Pastikan sudah `systemctl enable billingisp` |

### 8. Keunggulan systemd vs PM2

| Aspek | Systemd | PM2 |
|-------|---------|-----|
| **Native Linux** | ✅ Terintegrasi OS | ❌ Third-party |
| **Auto-restart** | ✅ `Restart=always` | ✅ `--watch` |
| **Log management** | ✅ `journalctl` (log rotation otomatis) | ⚠️ PM2 logs bisa membengkak |
| **Resource limit** | ✅ `MemoryLimit`, `CPUQuota` | ⚠️ Perlu konfigurasi manual |
| **Dependency** | ✅ `After=`, `Requires=` | ❌ Manual |
| **Monitoring** | ⚠️ Perlu tool eksternal | ✅ `pm2 monit` built-in |
| **Zero-downtime reload** | ❌ Butuh reverse proxy | ✅ `pm2 reload` |
| **Cluster mode** | ❌ Harus manual load balance | ✅ `pm2 start -i max` |

**Rekomendasi:**

- **Systemd**: untuk production stabil, server dedicated, sysadmin berpengalaman Linux.
- **PM2**: untuk rapid development, shared hosting, atau butuh monitoring dashboard.

Kedua metode **bisa dipakai bersamaan** di server berbeda. Jangan jalankan keduanya untuk app yang sama di satu server.
## Pasang Cron (Background Worker)

Endpoint `GET /api/cron` menjalankan **siklus penagihan pelanggan** dan **siklus langganan SaaS platform**:

**Penagihan pelanggan (tenant aktif saja):**

- **Generate invoice bulanan** per pelanggan aktif (harga dari paket internet), mulai **H-7** sebelum jatuh tempo (atur via `BILLING_GENERATE_DAYS`).
- Notifikasi WhatsApp tagihan baru + **link bayar auto-login** (`/portal/masuk` → langsung ke Tagihan).
- Pengingat WhatsApp **H-3** sebelum jatuh tempo (sekali per invoice, `BILLING_REMINDER_DAYS`).
- Invoice lewat jatuh tempo → status `overdue`, **isolasi pelanggan** di Mikrotik, notifikasi WhatsApp + link bayar.

**Langganan SaaS platform:**

- Subscription lewat `akhir` → status `expired`, tenant `suspended` (login ISP diblokir).
- Reminder WhatsApp **H-7** dan **H-1** ke owner (jika nomor WA owner diisi di profil staf).

Syarat generate otomatis: pelanggan punya **paket internet aktif**, tenant `active`, belum ada invoice periode bulan yang sama. Tanggal jatuh tempo diambil dari field **Jatuh Tempo** pelanggan (maju +1 bulan setelah pembayaran lunas).

Tanpa cron, generate tagihan, isolasi otomatis, dan reminder tidak berjalan.

### 1. Set `CRON_SECRET` di `.env`

Buat string acak (minimal 32 karakter), lalu tambahkan ke `.env` production:

```bash
openssl rand -hex 32
```

```env
CRON_SECRET=isi-dengan-string-acak-panjang
```

Restart aplikasi setelah mengubah `.env`:

```bash
pm2 restart billingisp
```

### 2. Tes manual (sebelum pasang jadwal)

Ganti URL dan secret sesuai server Anda:

```bash
curl -sS -H "Authorization: Bearer ISI_CRON_SECRET_ANDA" \
  https://isp.tunnelhost.my.id/api/cron
```

Respons sukses (contoh):

```json
{"ok":true,"generated":2,"generatedNotified":2,"overdue":0,"isolated":0,"reminded":0,"preDueReminded":1}
```

Jika `401 Unauthorized`, pastikan nilai `CRON_SECRET` di `.env` sama persis dengan header `Bearer`.

Di development, jika `CRON_SECRET` kosong, endpoint bisa dipanggil tanpa header (hanya untuk lokal).

### 3. Pasang cron di VPS Linux (crontab)

Jalankan sebagai user yang menjalankan aplikasi (bukan root, kecuali memang setup Anda begitu):

```bash
crontab -e
```

Tambahkan baris berikut — **ganti URL dan secret** dengan nilai production Anda:

```cron
# Siklus penagihan: setiap hari jam 06:00 WIB (sesuaikan timezone server)
0 6 * * * curl -fsS -m 120 -H "Authorization: Bearer ISI_CRON_SECRET_ANDA" https://isp.tunnelhost.my.id/api/cron >> /var/log/billingisp-cron.log 2>&1
```

**Frekuensi disarankan**

| Jadwal | Crontab | Kapan dipakai |
|--------|---------|----------------|
| Sekali sehari (cukup untuk kebanyakan ISP) | `0 6 * * *` | Generate tagihan, reminder H-3 & isolasi harian |
| Setiap jam | `0 * * * *` | Isolasi lebih cepat setelah lewat jatuh tempo |

Pastikan timezone server benar (`timedatectl` di Ubuntu/Debian). Cron memakai timezone sistem VPS.

Set juga di `.env` aplikasi (wajib konsisten dengan WIB):

```env
APP_TIMEZONE=Asia/Jakarta
NEXT_PUBLIC_APP_TIMEZONE=Asia/Jakarta
```

Di PM2 ecosystem, tambahkan `TZ=Asia/Jakarta` sebagai cadangan infrastruktur. Logika billing (jatuh tempo, cron, isolir) memakai `APP_TIMEZONE`, bukan timezone browser.

**Panggil via localhost** (jika `curl` dijalankan di server yang sama dengan PM2):

```cron
0 6 * * * curl -fsS -m 120 -H "Authorization: Bearer ISI_CRON_SECRET_ANDA" http://127.0.0.1:3000/api/cron >> /var/log/billingisp-cron.log 2>&1
```

Buat file log (opsional, sekali saja):

```bash
sudo touch /var/log/billingisp-cron.log
sudo chown tunnelhost-isp:tunnelhost-isp /var/log/billingisp-cron.log
```

Ganti user/group sesuai user deploy Anda.

### 4. Verifikasi cron aktif

```bash
crontab -l                    # lihat jadwal terdaftar
tail -f /var/log/billingisp-cron.log   # pantau output setelah jam jalan
```

Tes sekali tanpa menunggu jadwal: salin perintah `curl` dari crontab, jalankan di terminal, cek log PM2:

```bash
pm2 logs billingisp --lines 50
```

Cari log `Siklus penagihan selesai` dari modul jobs.

### 5. Alternatif: Vercel Cron

Jika deploy di Vercel, tambahkan di `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron",
      "schedule": "0 6 * * *"
    }
  ]
}
```

Vercel mengirim request dengan header `Authorization: Bearer <CRON_SECRET>` otomatis jika variabel `CRON_SECRET` diset di project settings.

### Alternatif: Systemd Timer (Pengganti Crontab)

Systemd timer lebih modern dan terintegrasi dengan journald untuk logging.

#### Buat service untuk menjalankan cron job

`/etc/systemd/system/billingisp-cron.service` (SQLite):

```ini
[Unit]
Description=NetManage ISP Billing Cron Job
After=network.target billingisp.service

[Service]
Type=oneshot
User=tunnelhost-isp
Group=tunnelhost-isp
Environment="CRON_SECRET=ISI_CRON_SECRET_ANDA"
ExecStart=/usr/bin/curl -fsS -m 120 -H "Authorization: Bearer ${CRON_SECRET}" https://isp.tunnelhost.my.id/api/cron
StandardOutput=journal
StandardError=journal
SyslogIdentifier=billingisp-cron
```

Atau untuk PostgreSQL (`billisp-cron.service`):

```ini
[Unit]
Description=NetManage ISP Billing Cron Job
After=network.target billisp.service

[Service]
Type=oneshot
User=tunnelhost-billisp
Group=tunnelhost-billisp
Environment="CRON_SECRET=ISI_CRON_SECRET_ANDA"
ExecStart=/usr/bin/curl -fsS -m 120 -H "Authorization: Bearer ${CRON_SECRET}" https://billisp.tunnelhost.my.id/api/cron
StandardOutput=journal
StandardError=journal
SyslogIdentifier=billisp-cron
```

#### Buat timer untuk menjadwalkan

`/etc/systemd/system/billingisp-cron.timer` (SQLite):

```ini
[Unit]
Description=NetManage ISP Billing Cron Timer (Daily at 6 AM)
Requires=billingisp-cron.service

[Timer]
# Setiap hari jam 06:00
OnCalendar=*-*-* 06:00:00
# Atau setiap jam: OnCalendar=hourly
Persistent=true

[Install]
WantedBy=timers.target
```

Atau PostgreSQL (`billisp-cron.timer`):

```ini
[Unit]
Description=NetManage ISP Billing Cron Timer (Daily at 6 AM)
Requires=billisp-cron.service

[Timer]
OnCalendar=*-*-* 06:00:00
Persistent=true

[Install]
WantedBy=timers.target
```

#### Enable dan jalankan timer

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable timer (auto-start setelah reboot)
sudo systemctl enable billingisp-cron.timer

# Start timer
sudo systemctl start billingisp-cron.timer

# Cek status timer
sudo systemctl status billingisp-cron.timer
sudo systemctl list-timers billingisp-cron.timer

# Tes manual (tanpa menunggu jadwal)
sudo systemctl start billingisp-cron.service

# Lihat log eksekusi cron
sudo journalctl -u billingisp-cron.service -n 50
```

#### Keunggulan systemd timer vs crontab

| Aspek | Systemd Timer | Crontab |
|-------|---------------|---------|
| **Logging** | ✅ Terintegrasi `journalctl` | ⚠️ Manual redirect ke file |
| **Retry** | ✅ `Restart=on-failure` | ❌ Harus script manual |
| **Dependency** | ✅ `After=`, `Requires=` | ❌ Manual |
| **Persistent** | ✅ Jalan saat boot jika terlewat | ⚠️ Tidak ada built-in |
| **Monitoring** | ✅ `systemctl list-timers` | ⚠️ Harus `crontab -l` |
| **Simplicity** | ⚠️ Dua file (service + timer) | ✅ Satu baris |

### Troubleshooting

| Gejala | Penyebab / solusi |
|--------|-------------------|
| `401 Unauthorized` | `CRON_SECRET` di `.env` tidak cocok dengan header cron |
| `curl: command not found` | Install: `sudo apt install curl` |
| Tidak ada isolasi / reminder | Cron belum terpasang, jadwal salah, atau WhatsApp/Mikrotik masih `mock` |
| Invoice otomatis tidak muncul | Pelanggan belum punya paket / harga 0 / belum masuk jendela H-N / sudah ada invoice bulan itu |
| Link bayar tidak bisa dibuka | Set `NEXT_PUBLIC_APP_URL` ke URL publik production |
| Link auto-login gagal | Pastikan `AUTH_SECRET` sudah diset; link kedaluwarsa setelah `PORTAL_MAGIC_LINK_DAYS` (default 14 hari) |
| Log cron kosong | Cek `crontab -l`, permission file log, path URL salah |
| Systemd timer tidak jalan | Cek `systemctl status billingisp-cron.timer`, pastikan `enable` + `start` |
| Timer jalan tapi service gagal | Lihat log: `journalctl -u billingisp-cron.service -n 30` |

## Git & Branch

```bash
git status
git add .
git commit -m "Pesan commit"
git push origin netmanage-implementation
```

Remote: `https://github.com/klicknet55-prog/billingIsp.git`
