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
| Database | SQLite (dev) via Drizzle ORM — siap migrasi PostgreSQL |
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

Aplikasi ini berjalan sebagai **Node.js** (bukan Apache/PHP XAMPP). Contoh deploy di VPS Linux dengan domain `https://isp.tunnelhost.my.id`.

Path production contoh: `/home/tunnelhost-isp/htdocs/isp.tunnelhost.my.id`

### 1. Clone / pull kode

```bash
cd /home/tunnelhost-isp/htdocs/isp.tunnelhost.my.id
git fetch origin
git checkout netmanage-implementation   # atau branch production Anda
git pull origin netmanage-implementation
```

### 2. Install, schema & build

```bash
npm ci
npm run db:ensure-schema     # wajib — patch tabel/kolom (odp, platform_settings, dll.)
npm run build
```

Opsional **hanya server baru / staging kosong**:

```bash
npm run db:seed              # akun demo termasuk teknisi@demo.net
```

> Production dengan data live: **jangan** `db:seed`. Cukup `db:ensure-schema` setiap deploy.

### 3. Konfigurasi `.env` production

Salin dari `.env.example` dan sesuaikan:

```env
NEXT_PUBLIC_APP_URL=https://isp.tunnelhost.my.id
DATABASE_URL=./netmanage.db
AUTH_SECRET=...random-panjang...
CRON_SECRET=...
APP_TIMEZONE=Asia/Jakarta
NEXT_PUBLIC_APP_TIMEZONE=Asia/Jakarta
BILLING_GENERATE_DAYS=7
BILLING_REMINDER_DAYS=3
PORTAL_MAGIC_LINK_DAYS=14

MIKROTIK_DRIVER=real
MIKROTIK_TLS_INSECURE=true

DUITKU_DRIVER=real
DUITKU_CALLBACK_URL=https://isp.tunnelhost.my.id/api/webhook/duitku
DUITKU_RETURN_URL=https://isp.tunnelhost.my.id/bayar/selesai
```

Router Mikrotik tetap dikonfigurasi di **ISP → Router** per tenant.

### 4. Jalankan dengan PM2

PM2 harus **disimpan** (`save`) dan **didaftarkan ke systemd** (`startup`) supaya proses naik otomatis setelah reboot VPS.

#### Instal & jalankan pertama kali

Jalankan sebagai **user pemilik folder app** (contoh `tunnelhost-isp`), **bukan root**:

```bash
npm install -g pm2
cd /home/tunnelhost-isp/htdocs/isp.tunnelhost.my.id

# Port default 3000 — pastikan PORT=3000 di .env jika perlu
pm2 start npm --name billingisp -- start
# Atau pakai ecosystem (web + worker): pm2 start ecosystem.config.cjs --only billingisp
pm2 save
```

Server PostgreSQL baru (`billisp`, port **3001**):

```bash
cd /home/tunnelhost-billisp/htdocs/billisp.tunnelhost.my.id
PORT=3001 pm2 start npm --name billisp2 -- start
pm2 save
```

#### Daftarkan auto-start saat reboot (wajib, sekali per user)

Masih sebagai user yang sama yang menjalankan PM2:

```bash
pm2 startup
```

PM2 akan menampilkan perintah `sudo env PATH=... pm2 startup systemd -u tunnelhost-isp --hp /home/tunnelhost-isp` — **salin dan jalankan persis** (user dan home path sesuaikan).

Lalu simpan daftar proses saat ini:

```bash
pm2 save
```

Setiap kali menambah/mengganti/hapus app PM2 (`pm2 start`, `pm2 delete`, ganti nama), ulangi **`pm2 save`**.

#### Verifikasi

```bash
pm2 list                    # billingisp / billisp2 harus online
pm2 startup                 # harus sudah terkonfigurasi (bukan error)
sudo systemctl status pm2-tunnelhost-isp   # nama service bisa sedikit beda; cek output pm2 startup
```

Simulasi tanpa reboot penuh:

```bash
pm2 kill
pm2 resurrect               # harus mengembalikan proses dari dump PM2
```

Setelah reboot VPS: `pm2 list` — status **online**. Jika **errored**, cek `pm2 logs billingisp --lines 50`.

#### Env timezone & port (disarankan)

Pastikan `.env` berisi `APP_TIMEZONE=Asia/Jakarta`. Di ecosystem PM2 (opsional), tambahkan `TZ=Asia/Jakarta`.

#### Redis + worker queue (production, disarankan)

Job berat (batch WhatsApp, webhook, cron enqueue) memakai **BullMQ + Redis**. Tanpa Redis, job dijalankan inline di proses web (kurang stabil di beban tinggi).

**1. Pasang Redis di VPS (Ubuntu/Debian):**

```bash
sudo apt update && sudo apt install -y redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server
redis-cli ping   # harus PONG
```

**2. Tambahkan ke `.env`:**

```env
REDIS_URL=redis://127.0.0.1:6379
QUEUE_DRIVER=redis
QUEUE_CONCURRENCY=5
DEPLOY_PM2_WORKER_APP=billingisp-worker
```

**3. Jalankan worker PM2 (sekali, setelah web app sudah jalan):**

```bash
cd /home/tunnelhost-isp/htdocs/isp.tunnelhost.my.id
pm2 start ecosystem.config.cjs --only billingisp-worker
pm2 save
```

Verifikasi: `pm2 list` — `billingisp` dan `billingisp-worker` status **online**. Log worker: `pm2 logs billingisp-worker --lines 30`.

Deploy otomatis (Superadmin → Update Aplikasi) menampilkan langkah **Restart worker Redis (queue)** dan me-restart (atau `start` jika belum ada) proses worker saat `REDIS_URL` / `QUEUE_DRIVER=redis` aktif di `.env`.

#### Kesalahan umum

| Masalah | Penyebab | Solusi |
|---------|----------|--------|
| Setelah reboot app mati | Belum `pm2 startup` + perintah sudo | Jalankan langkah daftar auto-start di atas |
| `pm2 resurrect` kosong | Belum `pm2 save` setelah `pm2 start` | `pm2 start ...` lalu `pm2 save` |
| Git/npm EACCES | PM2 jalan sebagai root, repo milik user lain | Hapus proses root; jalankan PM2 sebagai user pemilik repo |
| Dua PM2 (root + user) | `pm2` per user terpisah | Satu user = satu `pm2 list`; jangan campur root |

Untuk uninstall startup yang salah user: `pm2 unstartup systemd` (lalu ulangi `pm2 startup` dengan user benar).

Aplikasi listen di port **3000** (`next start`) kecuali `PORT=3001` untuk instance billisp.

### 5. Nginx reverse proxy (contoh)

```nginx
server {
    listen 80;
    server_name isp.tunnelhost.my.id;

    # Android App Links — WAJIB di atas blok `location ^~ /.well-known/` certbot jika ada
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

**404 `/.well-known/assetlinks.json` dari nginx:** Certbot sering menambah `location ^~ /.well-known/` ke folder statis (`/var/www/html`), sehingga request tidak sampai ke Next.js. Tambahkan blok `location = /.well-known/assetlinks.json` di atasnya, lalu `sudo nginx -t && sudo systemctl reload nginx`. Pastikan juga `ANDROID_APP_LINK_SHA256` sudah di `.env` dan app sudah `npm run build` + `pm2 restart`.

### 6. Update rutin setelah `git push`

**SQLite** (server production lama, `isp.tunnelhost.my.id`):

```bash
cd /home/tunnelhost-isp/htdocs/isp.tunnelhost.my.id
git pull origin netmanage-implementation
npm ci --include=dev
npm run db:ensure-schema
npm run build
pm2 restart billingisp --update-env
```

**PostgreSQL** (server baru, `billisp.tunnelhost.my.id`):

```bash
cd /home/tunnelhost-billisp/htdocs/billisp.tunnelhost.my.id
git pull origin netmanage-implementation
npm ci --include=dev
npm run db:migrate:pg
npm run build
pm2 restart billisp --update-env
```

Atau gunakan **Superadmin → Update Aplikasi** (`DEPLOY_ENABLED=true`) — alur sama: backup DB → pull → `npm ci --include=dev` → schema (`ensure-schema` / `db:migrate:pg` sesuai `DATABASE_DRIVER`) → build → restart PM2.

Pastikan di `.env`:

| Server | `DATABASE_DRIVER` | `DEPLOY_PM2_APP` |
|--------|-------------------|------------------|
| SQLite (isp) | `sqlite` atau kosong | `billingisp` |
| PostgreSQL (billisp) | `postgres` | `billisp` |

### 6b. Checklist verifikasi deploy

| Cek | URL / perintah |
|-----|----------------|
| Homepage & brand | `/` |
| Halaman statis | `/tentang`, `/kontak`, `/syarat-ketentuan` |
| Superadmin pengaturan | `/superadmin/pengaturan` |
| Peta ODP | `/isp/peta` (login owner) |
| Teknisi | `teknisi@demo.net` → `/isp/tiket` |
| Cron billing & SaaS | `curl -H "Authorization: Bearer $CRON_SECRET" .../api/cron` |
| Log PM2 | `pm2 logs billingisp --lines 30` |

### 7. Pasang cron (wajib production)

Isolasi otomatis & reminder jatuh tempo membutuhkan jadwal cron. Lihat bagian **[Pasang Cron (Background Worker)](#pasang-cron-background-worker)** di bawah.

Ringkas:

```bash
# 1. Set CRON_SECRET di .env, lalu pm2 restart billingisp
# 2. crontab -e — tambahkan (ganti secret & URL):
0 6 * * * curl -fsS -m 120 -H "Authorization: Bearer ISI_CRON_SECRET" https://isp.tunnelhost.my.id/api/cron >> /var/log/billingisp-cron.log 2>&1
```

### Catatan deploy

| Topik | Keterangan |
|-------|------------|
| **Jaringan Mikrotik** | Server production harus bisa menjangkau IP/router (VPN/LAN). |
| **Database** | SQLite: backup file `netmanage.db`. PostgreSQL: `pg_dump` + `npm run db:migrate:pg` saat deploy. |
| **PM2 reboot** | Wajib `pm2 startup` (sudo) + `pm2 save`; jalankan PM2 sebagai user pemilik repo, bukan root. |
| **Cron** | Wajib di production — lihat [Pasang Cron (Background Worker)](#pasang-cron-background-worker). |
| **Duitku** | `DUITKU_CALLBACK_URL` harus URL publik server, bukan localhost. |
| **Upload logo/foto** | Folder `public/uploads/` harus bisa ditulis user PM2. Jalankan `npm run uploads:ensure-dirs` setelah deploy. Form upload wajib `multipart/form-data` (sudah di kode). Nginx: `client_max_body_size 3m;` |

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

## Git & Branch

```bash
git status
git add .
git commit -m "Pesan commit"
git push origin netmanage-implementation
```

Remote: `https://github.com/klicknet55-prog/billingIsp.git`
