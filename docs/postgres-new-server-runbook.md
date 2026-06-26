# Runbook — Deploy Server Baru (PostgreSQL)

> Server **production lama tetap SQLite** sampai Anda siap cutover DNS/domain.
> Dokumen ini untuk VPS/server **baru** yang akan menjalankan PostgreSQL.

**Status:** Persiapan Fase 5  
**Branch kode migrasi:** `feat/postgres-migration` (setelah dual-driver + schema PG selesai)

---

## Ringkasan strategi

```mermaid
flowchart LR
  subgraph now [Sekarang]
    OldVPS[Server lama VPS]
    SQLite[(netmanage.db)]
    OldVPS --> SQLite
  end
  subgraph later [Nanti]
    NewVPS[Server baru VPS]
    PG[(PostgreSQL)]
    NewVPS --> PG
  end
  SQLite -->|backup + migrate script| PG
  OldVPS -.->|tetap jalan| SQLite
```

| Server | Database | Env |
|--------|----------|-----|
| **Lama (production sekarang)** | SQLite | `DATABASE_DRIVER=sqlite` (default), `DATABASE_URL=./netmanage.db` |
| **Baru (target)** | PostgreSQL | `DATABASE_DRIVER=postgres`, `DATABASE_URL=postgresql://...` |

Tidak ada dual-write. Data pindah **sekali** via backup + script migrasi.

---

## Prasyarat

1. Backup production SQLite (superadmin Backup + salin file manual):
   ```bash
   cp netmanage.db netmanage.db.bak.$(date +%F)
   ```
2. Branch `feat/postgres-migration` sudah merge / checkout di repo lokal.
3. PostgreSQL terpasang di server baru.
4. **PostgreSQL client tools** (`pg_dump`) di PATH — dipakai deploy dashboard & superadmin backup:
   ```bash
   sudo apt install postgresql-client   # Debian/Ubuntu
   pg_dump --version
   ```

---

## 1. Provision PostgreSQL (server baru)

```bash
sudo -u postgres psql
CREATE USER netmanage WITH PASSWORD 'GANTI_PASSWORD_KUAT';
CREATE DATABASE netmanage OWNER netmanage;
GRANT ALL PRIVILEGES ON DATABASE netmanage TO netmanage;
\q
```

---

## 2. Clone & konfigurasi aplikasi

```bash
git clone https://github.com/klicknet55-prog/billingIsp.git
cd billingIsp
git checkout feat/postgres-migration   # atau branch yang sudah ada PG

cp .env.example .env
```

`.env` minimal:

```env
NEXT_PUBLIC_APP_URL=https://isp-baru.tunnelhost.my.id
DATABASE_DRIVER=postgres
DATABASE_URL=postgresql://netmanage:GANTI_PASSWORD@localhost:5432/netmanage
AUTH_SECRET=...random-panjang...
CRON_SECRET=...
DEPLOY_ENABLED=true
# driver integrasi real sesu production lama
MIKROTIK_DRIVER=real
DUITKU_DRIVER=real
WHATSAPP_DRIVER=real
```

---

## 3. Install & schema PostgreSQL

```bash
npm ci --include=dev
npm run db:migrate:pg          # Drizzle migrations ke Postgres
npm run build
```

> SQLite memakai `db:ensure-schema`; Postgres memakai **migrations formal** (`drizzle/pg/`).

---

## 4. Import data dari SQLite production

Dari mesin yang punya backup `netmanage.db`:

```bash
# SQLite path = backup production
SQLITE_PATH=./netmanage.db.bak.2026-06-18 \
DATABASE_URL=postgresql://netmanage:...@localhost:5432/netmanage \
npm run db:migrate-sqlite-to-pg
```

Verifikasi jumlah baris (contoh):

```sql
SELECT COUNT(*) FROM tenant;
SELECT COUNT(*) FROM pelanggan;
SELECT COUNT(*) FROM tagihan;
```

Uji login: superadmin, owner tenant, portal pelanggan (OTP), webhook Duitku.

---

## 5. Jalankan aplikasi

**PM2 (disarankan jika deploy dashboard sudah dipakai):**

```bash
pm2 start npm --name billingisp -- start
pm2 save && pm2 startup
```

**systemd (alternatif):** lihat unit file di README / diskusi ops.

**Nginx:** reverse proxy ke port 3000 + certbot HTTPS.

**Cron:**

```cron
0 6 * * * curl -fsS -m 120 -H "Authorization: Bearer $CRON_SECRET" https://isp-baru.../api/cron >> /var/log/billingisp-cron.log 2>&1
```

---

## 6. Cutover domain (opsional)

1. Uji 24–48 jam di subdomain baru (`isp-baru. ...`) tanpa sentuh server lama.
2. Maintenance window singkat:
   - Stop tulis di server lama (opsional: `pm2 stop`)
   - Backup SQLite final
   - Jalankan ulang `db:migrate-sqlite-to-pg` incremental jika ada data delta
3. Arahkan DNS `isp.tunnelhost.my.id` ke IP server baru.
4. Simpan `netmanage.db` arsip read-only 14 hari; jangan hapus dulu.

---

## Rollback

- DNS kembali ke server lama (masih SQLite).
- Server baru bisa dimatikan tanpa mempengaruhi production lama.

---

## Checklist smoke test

- [ ] Login superadmin, owner, kolektor, teknisi
- [ ] Portal pelanggan OTP + bayar tagihan
- [ ] Webhook Duitku (`/api/webhook/duitku`)
- [ ] Cron `/api/cron` (tagihan, isolir, reminder)
- [ ] Kirim WA (tenant + platform)
- [ ] Isolir/aktifkan pelanggan Mikrotik
- [ ] Multi-tenant: tenant A tidak lihat data tenant B

---

## Server lama — yang **tidak** diubah

- Tetap `DATABASE_DRIVER=sqlite` atau kosong (default sqlite)
- Deploy rutin (`git pull`, `db:ensure-schema`, `build`, `pm2 restart`) seperti biasa
- Jangan install PostgreSQL di server lama kecuali untuk tes lokal
