# BILLING RT-RW NET

Platform SaaS billing & manajemen jaringan untuk ISP dan RT-RW Net (proyek internal: **NetManage**). Dibangun dengan Next.js (App Router), Drizzle ORM, dan Tailwind CSS. Multi-tenant, modular, dan bertema warna yang bisa diganti.

## Fitur (Fondasi & Modul Inti)

- Multi-tenant dengan isolasi data per ISP (`tenant_id` di semua tabel).
- 4 area peran: Super Admin, Owner/Admin ISP, Kolektor (PWA), Portal Pelanggan.
- Auth: email/password untuk staf, OTP passwordless (WhatsApp) untuk pelanggan.
- Modul ISP: pelanggan (+koordinat), paket internet, router Mikrotik, invoice, helpdesk tiket, laporan keuangan (ekspor CSV).
- **Paket internet**: mapping ke router Mikrotik + profile PPPoE/Hotspot (load dari router).
- **Pelanggan**: pilih paket sesuai router; sinkron user ke Mikrotik saat create/edit; hapus dengan modal multi-tahap (Mikrotik + invoice + tiket).
- **Router Mikrotik**: CRUD per tenant, cek status, mode REST (RouterOS v7+) atau Legacy API (8728).
- Kolektor: daftar tugas diurutkan jarak, terima tunai + aktivasi otomatis, cetak struk thermal (Web Bluetooth).
- Portal pelanggan: ringkasan langganan, bayar mandiri (Duitku), diagnostik koneksi, lapor gangguan.
- Tema warna dinamis (6 preset) + mode terang/gelap, tersimpan per perangkat & default per tenant.
- Integrasi via pola adapter + mock (Mikrotik, Duitku, WhatsApp, Maps) — berjalan penuh tanpa kredensial.
- Background worker (cron): generate invoice bulanan, reminder jatuh tempo + link bayar, isolasi otomatis.
- PWA: manifest + service worker (offline dasar).

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
npm run db:push               # buat / update skema database
npm run db:seed               # isi data demo (opsional)
npm run db:backfill-integrations  # copy credential env global -> config tenant (idempotent)
npm run dev                   # http://localhost:3000
```

### Variabel `.env` penting (dev)

```env
MIKROTIK_DRIVER=real          # mock | real
MIKROTIK_TLS_INSECURE=true    # wajib jika akses router via IP + sertifikat self-signed
DATABASE_URL=./netmanage.db
AUTH_SECRET=...               # ganti di production
```

**Kredensial router Mikrotik** disimpan per tenant di menu **ISP → Router**, bukan di `.env`.

### Akun demo

| Peran | Login | Sandi |
|-------|-------|-------|
| Super Admin | super@netmanage.app | password123 |
| Owner ISP | owner@demo.net | password123 |
| Admin ISP | admin@demo.net | password123 |
| Kolektor | kolektor@demo.net | password123 |
| Pelanggan | nomor `081200000001` (OTP muncul di console server) | - |

## Deploy ke Server (Production)

Aplikasi ini berjalan sebagai **Node.js** (bukan Apache/PHP XAMPP). Contoh deploy di VPS Linux dengan domain `https://isp.tunnelhost.my.id`.

### 1. Clone / pull kode

```bash
cd /var/www/billingisp
git fetch origin
git checkout netmanage-implementation   # atau branch production Anda
git pull origin netmanage-implementation
```

### 2. Install & build

```bash
npm ci
npm run build
npm run db:push              # jalankan jika schema DB berubah
```

### 3. Konfigurasi `.env` production

Salin dari `.env.example` dan sesuaikan:

```env
NEXT_PUBLIC_APP_URL=https://isp.tunnelhost.my.id
DATABASE_URL=./netmanage.db
AUTH_SECRET=...random-panjang...
CRON_SECRET=...
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

```bash
npm install -g pm2
pm2 start npm --name billingisp -- start
pm2 save
pm2 startup
```

Aplikasi listen di port **3000** (`next start`).

### 5. Nginx reverse proxy (contoh)

```nginx
server {
    listen 80;
    server_name isp.tunnelhost.my.id;

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

### 6. Update rutin setelah `git push`

```bash
cd /var/www/billingisp
git pull origin netmanage-implementation
npm ci
npm run build
npm run db:push              # jika ada perubahan schema
pm2 restart billingisp
```

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
| **Database** | SQLite (`netmanage.db`) — backup file secara berkala. |
| **Cron** | Wajib di production — lihat [Pasang Cron (Background Worker)](#pasang-cron-background-worker). |
| **Duitku** | `DUITKU_CALLBACK_URL` harus URL publik server, bukan localhost. |

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

Endpoint `GET /api/cron` menjalankan **siklus penagihan otomatis**:

- **Generate invoice bulanan** per pelanggan aktif (harga dari paket internet), mulai **H-7** sebelum jatuh tempo (atur via `BILLING_GENERATE_DAYS`).
- Notifikasi WhatsApp tagihan baru + **link bayar auto-login** (`/portal/masuk` → langsung ke Tagihan).
- Pengingat WhatsApp **H-3** sebelum jatuh tempo (sekali per invoice, `BILLING_REMINDER_DAYS`).
- Invoice lewat jatuh tempo → status `overdue`, **isolasi pelanggan** di Mikrotik, notifikasi WhatsApp + link bayar.

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
