# Verifikasi Mobile UX — Setelah Deploy Production

Gunakan checklist ini setelah deploy ke `https://isp.tunnelhost.my.id` (atau domain production Anda).

**Penting:** Setelah deploy, di HP buka **tab incognito** atau hapus data situs (cache service worker) agar tidak pakai JS/HTML lama.

---

## 1. Deploy ke server

### Opsi A — SSH manual

```bash
cd /home/tunnelhost-isp/htdocs/isp.tunnelhost.my.id
git fetch origin
git pull origin netmanage-implementation
npm ci --include=dev
npm run db:ensure-schema
npm run build
pm2 restart billingisp --update-env
pm2 logs billingisp --lines 30
```

### Opsi B — Superadmin → Update Aplikasi

Pastikan di `.env` production:

```env
DEPLOY_ENABLED=true
DEPLOY_GIT_BRANCH=netmanage-implementation
DEPLOY_PM2_APP=billingisp
NEXT_PUBLIC_APP_URL=https://isp.tunnelhost.my.id
```

Lalu **Superadmin → Update Aplikasi** (backup DB → pull → build → restart otomatis).

---

## 2. Cek cepat (desktop browser)

| Cek | URL |
|-----|-----|
| App online | `https://isp.tunnelhost.my.id/login` |
| Manifest | `https://isp.tunnelhost.my.id/manifest.webmanifest` |
| Service worker | DevTools → Application → SW versi `netmanage-v3` |
| Viewport meta | View page source — `width=device-width` |

---

## 3. Cek di Chrome Android (HP)

Buka `https://isp.tunnelhost.my.id` — **bukan** IP LAN dev server.

### Admin (owner/admin)

Login → harus masuk `/dashboard`.

| # | Tes | Harapan |
|---|-----|---------|
| 1 | Bottom nav tampil | 4 tab: Beranda, Pelanggan, Tagihan, Menu |
| 2 | Tap **Beranda** / **Pelanggan** | Navigasi jalan |
| 3 | Tap **Menu** | Drawer kiri terbuka, daftar menu lengkap |
| 4 | Tap backdrop / X | Drawer tertutup |
| 5 | Ikon bulan/matahari header | Tema gelap/terang berganti |
| 6 | Logo brand header | Tampil (atau ikon jaringan fallback) |
| 7 | Tombol back Android di home | Toast "Tekan lagi untuk keluar" |

### Kolektor

| # | Tes | Harapan |
|---|-----|---------|
| 1 | Login kolektor | Redirect `/kolektor` |
| 2 | Bottom nav | Tugas + Profil |
| 3 | Tap Maps | Buka Google Maps / Waze |
| 4 | Bayar tunai | Bottom sheet, pembayaran tercatat |

### Portal pelanggan

Login OTP di `/portal/login`.

| # | Tes | Harapan |
|---|-----|---------|
| 1 | Bottom nav | Beranda, Tagihan, Lapor, Akun |
| 2 | Tema header | Toggle gelap/terang |
| 3 | Staf login di portal | Ditolak + arahan ke Admin app |

### Guard role

| Akun | App | Harapan |
|------|-----|---------|
| superadmin | `/login` (Admin) | Ditolak dengan pesan jelas |
| owner | `/portal/login` | Ditolak, arahkan ke Admin |

---

## 4. Jika mobile masih bermasalah

1. **Clear site data:** Chrome → ⋮ → Site settings → Clear & reset
2. **Cek viewport:** Jangan aktifkan "Desktop site" di Chrome
3. **Cek role:** Superadmin tidak punya bottom nav (sengaja)
4. **Log server:** `pm2 logs billingisp --lines 50`
5. **Pastikan `NEXT_PUBLIC_APP_URL`** di `.env` production = URL HTTPS publik (bukan localhost)

---

## 5. Setelah mobile UX OK

Lanjut **Fase 2b:** build APK Capacitor (`mobile/admin`, `mobile/portal`) pointing ke URL production.

Lihat: [android-app-plan.md](android-app-plan.md) · [android-qa-checklist.md](android-qa-checklist.md)
