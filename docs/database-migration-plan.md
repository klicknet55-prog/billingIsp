# Rencana Migrasi Database SQLite → PostgreSQL / MySQL

> Dokumen rencana migrasi database NetManage dari SQLite (Drizzle + better-sqlite3) ke PostgreSQL atau MySQL/MariaDB. Mencakup perubahan kode, skema, migrasi data, dan cutover production.

**Status:** Persiapan — **server production lama tetap SQLite**; PostgreSQL untuk **deploy server baru** nanti.  
**Branch disarankan:** `feat/postgres-migration`  
**Runbook server baru:** [`postgres-new-server-runbook.md`](./postgres-new-server-runbook.md)  
**Estimasi implementasi kode:** ~1 hari kerja

---

## Strategi deployment (2 server)

1. **Server lama** — tidak diubah: `DATABASE_DRIVER=sqlite` (default), `DATABASE_URL=./netmanage.db`, deploy rutin.
2. **Repo** — kembangkan dual-driver + schema PG di branch `feat/postgres-migration`.
3. **Server baru** — provision Postgres, migrate data dari backup SQLite, smoke test, cutover DNS opsional.

Tidak ada dual-write. Cutover data = maintenance window singkat atau clone dari backup terakhir.

---

## Checklist implementasi

- [ ] Backup SQLite production + tentukan skenario (fresh vs migrasi data) dan target DB (PG/MySQL)
- [ ] Konversi `src/lib/db/schema.ts` dari `sqliteTable` ke `pgTable`/`mysqlTable` + mapping tipe
- [ ] Update `db/index.ts`, `drizzle.config.ts`, `package.json`, `next.config.js`, `.env.example`
- [ ] Generate folder `drizzle/` migrations dan ganti `db:push` rutin dengan `db:migrate` di production
- [ ] Buat & jalankan script migrasi data (pgloader atau Node) jika ada data production
- [ ] Cutover production: update `DATABASE_URL`, build, migrate, smoke test auth + Duitku + multi-tenant

---

## Konteks saat ini

Proyek NetManage memakai **SQLite** end-to-end:

| Komponen | File | Keterangan |
|----------|------|------------|
| Koneksi | `src/lib/db/index.ts` | `better-sqlite3`, path dari `DATABASE_URL=./netmanage.db` |
| Skema | `src/lib/db/schema.ts` | 17 tabel, semua `sqliteTable` |
| Drizzle Kit | `drizzle.config.ts` | `dialect: "sqlite"`, skema via `db:push` (belum ada folder `drizzle/` migrations) |
| Next.js | `next.config.js` | `serverExternalPackages: ["better-sqlite3"]` |

### Pola SQLite-specific yang harus diubah

```mermaid
flowchart LR
  subgraph sqlite [SQLite saat ini]
    A["sqliteTable"]
    B["integer + mode boolean"]
    C["integer + mode timestamp"]
    D["text + mode json"]
    E["sql unixepoch"]
    F["real latitude/longitude"]
  end
  subgraph pg [PostgreSQL target]
    P1["pgTable"]
    P2["boolean"]
    P3["timestamp"]
    P4["jsonb"]
    P5["defaultNow / now"]
    P6["doublePrecision"]
  end
  subgraph mysql [MySQL target]
    M1["mysqlTable"]
    M2["boolean"]
    M3["timestamp"]
    M4["json"]
    M5["defaultNow / now"]
    M6["double"]
  end
  A --> P1 & M1
  B --> P2 & M2
  C --> P3 & M3
  D --> P4 & M4
  E --> P5 & M5
  F --> P6 & M6
```

**Kabar baik:** query bisnis di `src/features/**` hampir semua memakai Drizzle query builder (`eq`, `and`, `db.transaction`) — **tidak ada raw SQL SQLite-specific** di luar skema.

PRD merekomendasikan **PostgreSQL** untuk production multi-tenant; MySQL/MariaDB tetap feasible dengan Drizzle.

---

## Fase 0 — Persiapan & keputusan

### 0.1 Backup wajib (production)

```bash
cp netmanage.db netmanage.db.bak.$(date +%F)
# atau salin dari path DATABASE_URL di server
```

### 0.2 Pilih target

| Aspek | PostgreSQL | MySQL/MariaDB |
|-------|------------|---------------|
| Rekomendasi PRD | Ya | Alternatif |
| Driver Drizzle | `postgres` (package `postgres`) atau `pg` + `@neondatabase/serverless` | `mysql2` |
| JSON kolom `limitasi` | `jsonb` (indexable) | `json` |
| Boolean | native `boolean` | native `boolean` (tinyint) |
| Hosting umum | Supabase, Neon, RDS, managed VPS | cPanel, shared hosting, RDS |
| Tool migrasi data | **pgloader** (SQLite→PG, mature) | script custom / mysqldump transform |

### 0.3 Tentukan skenario data

**Skenario A — Fresh / boleh reset**

- Buat DB kosong → `db:push` atau `db:migrate` → `db:seed` + konfigurasi ulang Integrasi Duitku/WA per tenant.

**Skenario B — Ada data production**

- Wajib: backup SQLite + script migrasi data + verifikasi row count + uji login tenant.
- Urutan insert harus menghormati FK: `tenant` → `user`, `package_tenant` → `subscription` → `router`/`paket_internet` → `pelanggan` → `invoice`/`ticket` → integrasi → `session`/`otp_code`.

---

## Fase 1 — Provision database server

### PostgreSQL

```bash
# Buat user & database
sudo -u postgres psql
CREATE USER netmanage WITH PASSWORD '...';
CREATE DATABASE netmanage OWNER netmanage;
GRANT ALL PRIVILEGES ON DATABASE netmanage TO netmanage;
```

`.env` production:

```env
DATABASE_URL=postgresql://netmanage:PASSWORD@localhost:5432/netmanage
# atau format connection string provider (Neon/Supabase)
```

### MySQL/MariaDB

```sql
CREATE DATABASE netmanage CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'netmanage'@'localhost' IDENTIFIED BY '...';
GRANT ALL ON netmanage.* TO 'netmanage'@'localhost';
FLUSH PRIVILEGES;
```

`.env`:

```env
DATABASE_URL=mysql://netmanage:PASSWORD@localhost:3306/netmanage
```

---

## Fase 2 — Perubahan kode (intake ke repo)

### 2.1 Dependencies (`package.json`)

**PostgreSQL:**

```bash
npm remove better-sqlite3 @types/better-sqlite3
npm install postgres          # driver Drizzle "postgres"
# alternatif: npm install pg @types/pg
```

**MySQL:**

```bash
npm remove better-sqlite3 @types/better-sqlite3
npm install mysql2
```

### 2.2 Skema (`src/lib/db/schema.ts`)

Ganti import dan definisi tabel. Contoh mapping untuk **PostgreSQL**:

```ts
import { pgTable, text, boolean, timestamp, integer, jsonb, doublePrecision } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

const now = sql`now()`; // ganti unixepoch()

export const tenants = pgTable("tenant", {
  id: text("id").primaryKey(),
  // ...
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable("user", {
  // ...
  isActive: boolean("is_active").notNull().default(true),
});

export const packageTenants = pgTable("package_tenant", {
  limitasi: jsonb("limitasi").$type<{ maxPelanggan: number; maxRouter: number; fitur: string[] }>().notNull(),
});
```

Untuk **MySQL**: gunakan `mysqlTable`, `json()` (bukan jsonb), `double()` untuk koordinat.

**17 tabel** yang perlu dikonversi:

`tenant`, `user`, `package_tenant`, `subscription`, `router`, `paket_internet`, `pelanggan`, `invoice`, `ticket`, `ticket_assignment`, `kategori_pengeluaran`, `pengeluaran`, `payment_gateway_log`, `tenant_duitku_config`, `tenant_whatsapp_config`, `session`, `otp_code`.

### 2.3 Koneksi DB (`src/lib/db/index.ts`)

**PostgreSQL (contoh dengan `postgres`):**

```ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const client = postgres(process.env.DATABASE_URL!, { max: 10 });
export const db = drizzle(client, { schema });
```

**MySQL:**

```ts
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "./schema";

const pool = mysql.createPool(process.env.DATABASE_URL!);
export const db = drizzle(pool, { schema });
```

Hapus pragma SQLite (`journal_mode`, `foreign_keys`).

### 2.4 Drizzle Kit (`drizzle.config.ts`)

```ts
// PostgreSQL
export default {
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
} satisfies Config;

// MySQL: dialect: "mysql"
```

### 2.5 Next.js config (`next.config.js`)

Hapus `serverExternalPackages: ["better-sqlite3"]` (tidak diperlukan lagi).

### 2.6 Env & docs

Update `.env.example`:

```env
# PostgreSQL: postgresql://user:pass@host:5432/netmanage
# MySQL:      mysql://user:pass@host:3306/netmanage
DATABASE_URL=
```

Update `README.md` baris database.

### 2.7 (Disarankan) Ganti `db:push` → migrations formal

Saat ini production memakai `npm run db:push`. Untuk Postgres/MySQL production, **gunakan migrations**:

```bash
npm run db:generate   # buat SQL di ./drizzle/
npm run db:migrate    # tambah script: drizzle-kit migrate
```

Commit folder `drizzle/` ke git agar skema reproducible antar environment.

---

## Fase 3 — Buat skema di database baru

```bash
# Set DATABASE_URL ke DB baru
npm run db:generate
npm run db:migrate   # atau db:push untuk dev cepat
```

Verifikasi semua 17 tabel + FK ada.

---

## Fase 4 — Migrasi data

### Skenario A: Fresh start

```bash
npm run db:seed
npm run db:backfill-integrations
```

Lalu konfigurasi manual: credential Duitku/WA per tenant, domain tenant, superadmin password.

### Skenario B: Pindahkan data SQLite → DB baru

**Opsi B1 — pgloader (PostgreSQL, paling praktis)**

1. Deploy skema Drizzle dulu (tabel kosong).
2. pgloader sqlite → postgres dengan mapping tipe.
3. **Perhatian transformasi:**
   - SQLite `integer` boolean (0/1) → PG `boolean`
   - SQLite `integer` timestamp (unix epoch) → PG `timestamptz` (butuh transform `datetime(col, 'unixepoch')`)
   - JSON text → jsonb

**Opsi B2 — Script Node one-off (PostgreSQL & MySQL)**

Buat `scripts/migrate-sqlite-to-pg.ts`:

- Baca SQLite via `better-sqlite3` (devDependency sementara)
- Tulis ke target via Drizzle `db.insert().values()` per tabel (urutan FK)
- Transform: `new Date(unixSeconds * 1000)` untuk timestamp, `!!val` untuk boolean, `JSON.parse` untuk `limitasi`

**Opsi B3 — Export CSV per tabel + import**

Cocok untuk data kecil; manual tapi aman untuk audit.

**Checklist verifikasi pasca-migrasi:**

```sql
SELECT COUNT(*) FROM tenant;
SELECT COUNT(*) FROM "user";
SELECT COUNT(*) FROM pelanggan;
SELECT COUNT(*) FROM invoice;
-- bandingkan dengan SQLite: SELECT COUNT(*) FROM ...
```

Plus uji fungsional: login superadmin, login owner tenant, list pelanggan, webhook Duitku log.

---

## Fase 5 — Cutover production

```mermaid
sequenceDiagram
  participant App as Next.js App
  participant Old as SQLite netmanage.db
  participant New as Postgres_or_MySQL

  Note over App,Old: Maintenance window
  App->>Old: Stop writes (maintenance mode / stop pm2)
  Old->>New: Final data sync (jika incremental)
  App->>New: Update DATABASE_URL di .env
  App->>New: npm ci && npm run build
  App->>New: npm run db:migrate (jika belum)
  App->>App: pm2 restart
  App->>New: Smoke test login + payment webhook
```

Langkah server (`isp.tunnelhost.my.id`):

1. **Maintenance:** stop app (`pm2 stop ...`)
2. Backup SQLite final
3. Install & start PostgreSQL/MySQL (jika belum)
4. `git pull` branch dengan perubahan migrasi
5. Set `DATABASE_URL` di `.env` (jangan commit `.env`)
6. `npm ci --include=dev && npm run build`
7. `npm run db:migrate` (atau push skema)
8. Jalankan script migrasi data (skenario B) atau seed (skenario A)
9. `pm2 start` / restart
10. Simpan `netmanage.db` sebagai arsip read-only (jangan hapus 7–14 hari)

---

## Fase 6 — Testing checklist

- [ ] Login superadmin, owner, kolektor, portal pelanggan (OTP)
- [ ] CRUD pelanggan, router, paket, invoice
- [ ] Duitku: buat transaksi + webhook POST ke `/api/webhook/duitku`
- [ ] Integrasi per-tenant (enkripsi credential masih jalan — `src/lib/crypto.ts` tidak bergantung DB)
- [ ] Cron `/api/cron` (isolasi, reminder)
- [ ] Multi-tenant isolation: tenant A tidak lihat data tenant B
- [ ] Performa: query list pelanggan/invoice dengan index (pertimbangkan index pada `tenant_id`, `status`, `duitku_order_id`)

---

## Perbedaan penting PostgreSQL vs MySQL

| Item | PostgreSQL | MySQL |
|------|------------|-------|
| Drizzle dialect | `postgresql` | `mysql` |
| Reserved words | `"user"` perlu quote | `` `user` `` perlu backtick |
| JSON | `jsonb` + operator `@>` | `json` + `JSON_EXTRACT` |
| Connection pool | `postgres` max connections | `mysql2` pool |
| Migrasi data tool | pgloader | script custom |
| Hosting di VPS tunnelhost | install `postgresql` package | sering sudah ada MariaDB |

---

## Estimasi effort

| Task | Estimasi |
|------|----------|
| Konversi skema 17 tabel | 2–4 jam |
| Update koneksi + drizzle config + deps | 30 menit |
| Setup migrations formal | 1 jam |
| Script migrasi data (skenario B) | 2–4 jam |
| Testing + cutover production | 2–3 jam |
| **Total** | **~1 hari kerja** |

---

## Rekomendasi praktis untuk deployment

1. **Target utama: PostgreSQL** (sesuai PRD, tool migrasi lebih matang).
2. **Branch terpisah** `feat/postgres-migration` — jangan campur dengan fitur bisnis.
3. **Dual-run sementara tidak disarankan** — pilih cutover sekali (maintenance window singkat).
4. Jika data production masih sedikit (1–2 tenant uji), pertimbangkan **skenario A (fresh + re-config)** untuk mengurangi risiko transformasi timestamp/boolean.
5. Setelah migrasi, tambahkan **index** eksplisit di skema untuk kolom yang sering difilter: `tenant_id`, `pelanggan.tenant_id`, `invoice.status`, `payment_gateway_log.duitku_order_id`.
