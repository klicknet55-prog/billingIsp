# NetManage

Platform SaaS billing & manajemen jaringan untuk ISP dan RT-RW Net. Dibangun dengan Next.js (App Router), Drizzle ORM, dan Tailwind CSS. Multi-tenant, modular, dan bertema warna yang bisa diganti.

## Fitur (Fondasi & Modul Inti)

- Multi-tenant dengan isolasi data per ISP (`tenant_id` di semua tabel).
- 4 area peran: Super Admin, Owner/Admin ISP, Kolektor (PWA), Portal Pelanggan.
- Auth: email/password untuk staf, OTP passwordless (WhatsApp) untuk pelanggan.
- Modul ISP: pelanggan (+koordinat), paket internet, router Mikrotik, invoice, helpdesk tiket, laporan keuangan (ekspor CSV).
- Kolektor: daftar tugas diurutkan jarak, terima tunai + aktivasi otomatis, cetak struk thermal (Web Bluetooth).
- Portal pelanggan: ringkasan langganan, bayar mandiri (Duitku), diagnostik koneksi, lapor gangguan.
- Tema warna dinamis (6 preset) + mode terang/gelap, tersimpan per perangkat & default per tenant.
- Integrasi via pola adapter + mock (Mikrotik, Duitku, WhatsApp, Maps) — berjalan penuh tanpa kredensial.
- Background worker (cron) untuk isolasi otomatis & reminder jatuh tempo.
- PWA: manifest + service worker (offline dasar).

## Teknologi

| Lapisan | Teknologi |
|--------|-----------|
| Framework | Next.js (App Router) + TypeScript |
| Styling | Tailwind CSS + komponen ala shadcn/ui |
| Database | SQLite (dev) via Drizzle ORM — siap migrasi PostgreSQL |
| Auth | Modul internal (session cookie + scrypt + OTP) |

## Menjalankan

```bash
npm install
cp .env.example .env          # sesuaikan bila perlu
npm run db:push               # buat skema database
npm run db:seed               # isi data demo
npm run db:backfill-integrations  # copy credential env global -> config tenant (idempotent)
npm run dev                   # http://localhost:3000
```

### Akun demo

| Peran | Login | Sandi |
|-------|-------|-------|
| Super Admin | super@netmanage.app | password123 |
| Owner ISP | owner@demo.net | password123 |
| Admin ISP | admin@demo.net | password123 |
| Kolektor | kolektor@demo.net | password123 |
| Pelanggan | nomor `081200000001` (OTP muncul di console server) | - |

## Struktur Proyek

```
src/
  app/            # rute per area: (auth), superadmin, isp, kolektor, portal, api
  components/     # ui (shadcn-style), layout, theme
  features/<domain>/   # service.ts (logika+DB), actions.ts (server action), components/
  lib/
    db/           # schema Drizzle, client, seed
    auth/         # password, session, otp, guard peran
    integrations/ # adapter + mock: mikrotik, duitku, whatsapp, maps
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

Setel driver di `.env` (`MIKROTIK_DRIVER`, `DUITKU_DRIVER`, `WHATSAPP_DRIVER`, `MAPS_DRIVER`) ke `real`. Untuk multi-tenant, prioritas credential adalah konfigurasi tenant di menu `ISP -> Integrasi`; jika tenant belum punya konfigurasi, sistem fallback ke ENV global.

## Background Worker

Jadwalkan `GET /api/cron` (mis. Vercel Cron) untuk menjalankan isolasi otomatis & reminder jatuh tempo. Lindungi dengan `CRON_SECRET` di production.
