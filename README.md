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
