# Rencana Build App Android (Hybrid)

> Rencana hybrid untuk **dua aplikasi Android** terpisah: **NetManage Admin** (owner, admin, kolektor, teknisi) dan **NetManage Portal** (pelanggan). Perkuat PWA + UX mobile di codebase Next.js existing, lalu wrap dengan Capacitor menjadi dua APK; superadmin tetap web desktop.

**Status:** Draft — belum dieksekusi  
**Pendekatan:** Hybrid (APK via Capacitor dulu, native nanti jika perlu)  
**Scope:** Dua APK (Admin + Portal), **bukan** satu APK full role  
**Estimasi MVP:** ~1,5 minggu (dua shell + hardening web)

Dokumen terkait:

- [PRD Android v1](prd-android-v1.md) — scope produk, user stories, NFR
- [Spesifikasi UI/UX](android-ui-ux-spec.md) — wireframe notes, bottom nav, komponen
- [Riset UX](android-ux-research.md) — pain points audit web
- [Checklist QA](android-qa-checklist.md) — pengujian device
- [Folder desain](design/android/README.md) — wireframe & mockup export
- [Wireframe ASCII](design/android/wireframes/SCREEN-WIREFRAMES.md) — detail per layar (starting point)

---

## Checklist implementasi

### Fase 0b — Desain visual (sebelum coding)

- [ ] Wireframe low-fi 5 layar prioritas per app (lihat [android-ui-ux-spec.md](android-ui-ux-spec.md))
- [ ] Mockup hi-fi 360×800 di Figma
- [ ] Adaptive icon + splash Admin vs Portal
- [ ] Sign-off stakeholder (product, desain, dev)

### Fase 1 — Web mobile hardening

- [ ] Audit & perbaiki responsive UI: `/kolektor`, `/dashboard/*`, `/portal`, login (touch target, card view)
- [ ] `MobileBottomNav` per role (owner/admin vs kolektor vs teknisi vs portal)
- [ ] GPS sort + Maps/Waze satu ketuk di kolektor
- [ ] Guard superadmin: tolak login di Admin app dengan pesan jelas
- [ ] Guard staf: tolak login di Portal app, arahkan ke Admin app
- [ ] Perkuat manifest (512 icon, start_url) dan perluas service worker offline kolektor
- [ ] Tambah `GET /api/mobile/kolektor/tasks` (auth cookie) untuk cache offline

### Fase 2 — Dua project Capacitor

- [x] `mobile/admin/` — entry `/login?nm_app=admin`, package `id.tunnelhost.netmanage.admin`
- [x] `mobile/portal/` — entry `/portal/login?nm_app=portal`, package `id.tunnelhost.netmanage.portal`
- [x] Config `server.url` production HTTPS, permissions Android (GPS, BT admin)
- [ ] Signed APK internal per app (butuh Android Studio + keystore)
- [ ] Splash & adaptive icon branded (default Capacitor icon masih)

### Fase 3 — QA & distribusi

- [ ] QA device nyata (lihat [android-qa-checklist.md](android-qa-checklist.md))
- [ ] Sideload APK internal ke ISP / kolektor
- [ ] Siapkan listing Play Store fase 2 (privacy policy, screenshot)

### Fase 4 — Lanjutan (jika WebView blocker)

- [ ] REST API v1 + plugin native (FCM, Bluetooth fallback)

---

## Konteks codebase saat ini

Aplikasi **BILLING RT-RW NET** sudah berbasis Next.js App Router dengan fondasi mobile:

| Aspek | Status | File kunci |
|-------|--------|------------|
| PWA manifest | Ada | `src/app/manifest.ts` |
| Service worker | Dasar (cache shell) | `public/sw.js` |
| Registrasi SW | Ada | `src/components/pwa-register.tsx` |
| Kolektor mobile | GPS sort, tunai, Bluetooth print | `src/app/kolektor/kolektor-tasks.tsx` |
| Portal pelanggan | OTP, bayar, diagnostik | `src/app/portal/` |
| Auth | Cookie session `nm_session` | `src/lib/auth/session.ts` |
| API publik | Hampir tidak ada — bisnis via **Server Actions** | `src/features/**/actions.ts` |

**Implikasi penting:** App Android fase 1 **tidak perlu rewrite backend** jika memakai **WebView ke URL production** (`https://isp.tunnelhost.my.id`). Server Actions & cookie session tetap jalan selama HTTPS + same-origin.

PRD sudah mengarahkan kolektor & portal sebagai PWA/Android — selaras dengan pendekatan hybrid.

```mermaid
flowchart TB
  subgraph phase0b [Fase 0b - Desain]
    Wire[Wireframe]
    Mock[Mockup Figma]
    Assets[Icon dan Splash]
  end
  subgraph phase1 [Fase 1 - PWA dan UX Mobile]
    Web[Next.js Web App]
    PWA[Manifest plus SW]
    Responsive[Mobile hardening]
    Guards[App role guards]
  end
  subgraph phase2 [Fase 2 - Dua Capacitor APK]
    AdminCap[Admin shell /login]
    PortalCap[Portal shell /portal/login]
    WV[WebView HTTPS production]
  end
  subgraph phase3 [Fase 3 - Distribusi]
    APKAdmin[APK Admin internal]
    APKPortal[APK Portal internal]
    Store[Google Play fase 2]
  end
  subgraph phase4 [Fase 4 - Native later]
    API[REST API layer]
    RN[Native plugins FCM Bluetooth]
  end
  Wire --> Mock --> Assets
  Assets --> Web --> PWA --> Responsive --> Guards
  Guards --> AdminCap --> WV
  Guards --> PortalCap --> WV
  WV --> APKAdmin --> Store
  WV --> APKPortal --> Store
  WV -.->|future| API --> RN
```

---

## Rekomendasi arsitektur hybrid

**Fase 1–2 (sekarang):** Dua shell Capacitor + WebView:

| App | Entry URL | Role |
|-----|-----------|------|
| NetManage Admin | `/login` | owner, admin, kolektor, teknisi |
| NetManage Portal | `/portal/login` | pelanggan |

**Superadmin** tidak masuk scope mobile — tetap `https://…/superadmin` di browser desktop.

**Fase 4 (nanti):** Ekstrak REST API + React Native/Expo **hanya jika** WebView tidak cukup (push notification, Bluetooth printer bermasalah, offline kompleks).

**Mengapa Capacitor (bukan React Native langsung):**

- Reuse 100% UI & logic existing
- Plugin native (Geolocation, Bluetooth, Push) bisa ditambah bertahap
- Satu tim, satu deploy web + mobile shell

**Mengapa bukan TWA murni:** TWA lebih terbatas untuk plugin native & splash/branding; Capacitor lebih cocok untuk roadmap hybrid.

---

## Fase 0 — Prasyarat production

Sebelum APK, pastikan web production stabil:

1. HTTPS aktif di `https://isp.tunnelhost.my.id`
2. Set `.env`:
   ```env
   NEXT_PUBLIC_APP_URL=https://isp.tunnelhost.my.id
   ```
3. Cookie session: `secure: true` di production (sudah di `src/lib/auth/session.ts`)
4. Pertimbangkan `SameSite=None; Secure` **hanya jika** nanti perlu iframe/deep link cross-site (biasanya tidak perlu untuk Capacitor same-origin WebView)

---

## Fase 1 — Perkuat PWA & UX mobile (di repo Next.js)

### 1.1 Manifest & installability

Update `src/app/manifest.ts`:

- `start_url`: `/login` (atau `/` dengan redirect)
- `scope`: `/`
- `display`: `standalone`
- `orientation`: `portrait` (opsional, kolektor/portal)
- Icon 512x512 untuk Play Store (generate dari `public/icon.png`)
- `categories`: `business`, `finance`

Tambah meta di `src/app/layout.tsx`:

```html
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
```

### 1.2 Service worker — offline kolektor (PRD)

Perluas `public/sw.js`:

- Cache route `/kolektor` + aset statis (`/_next/static/*`)
- Cache API response tugas (butuh endpoint GET ringan — lihat 1.4)
- Strategi: stale-while-revalidate untuk daftar tagihan
- Version cache (`billing-v2`) + skipWaiting

Saat ini SW **belum** cache data invoice — PRD minta offline kolektor belum terpenuhi penuh.

### 1.3 Responsive audit per area

| Area | Route | Prioritas mobile | Catatan |
|------|-------|------------------|---------|
| Kolektor | `/kolektor` | Tinggi | Sudah card-based; perbesar touch target |
| Portal | `/portal/*` | Tinggi | Bottom nav sudah ada di `portal-nav.tsx` |
| ISP admin | `/isp/*` | Sedang | Banyak tabel — tambah horizontal scroll / card view mobile |
| Superadmin | `/superadmin/*` | Rendah | Boleh desktop-first, minimal usable |
| Login | `/login`, `/portal/login` | Tinggi | Sudah OK |

Perubahan UI tipikal:

- Sidebar `app-shell.tsx` → sudah drawer mobile
- Tabel ISP → wrapper `overflow-x-auto` atau komponen `MobileTable`
- Tombol aksi min 44px tinggi (guideline touch)

### 1.4 (Opsional tapi disarankan) API ringan untuk mobile offline

Tambah route read-only JSON (auth via cookie):

```
GET /api/mobile/kolektor/tasks
GET /api/mobile/portal/summary
```

Implementasi tipis di `src/app/api/mobile/` — delegasi ke service existing (`listUnpaidInvoices`). Memudahkan SW cache & fase native nanti.

### 1.5 Fitur perangkat — cek kompatibilitas WebView Android

| Fitur | Web API | Capacitor WebView |
|-------|---------|-------------------|
| GPS sort kolektor | `navigator.geolocation` | Perlu permission Android |
| Cetak thermal | Web Bluetooth | Perlu permission + uji di WebView (Chrome 56+) |
| OTP portal | form + server action | OK |
| Duitku bayar | redirect external | OK (Custom Tabs) |
| Maps navigasi | link Google Maps | OK (intent external) |

Jika Web Bluetooth gagal di WebView → fase 4: plugin `@capacitor-community/bluetooth-le`.

---

## Fase 2 — Dua Capacitor Android shell

### 2.1 Struktur monorepo

```
billingisp/
├── src/                         # Next.js (existing)
├── mobile/
│   ├── admin/                   # NetManage Admin
│   │   ├── capacitor.config.ts
│   │   ├── android/
│   │   └── package.json
│   └── portal/                  # NetManage Portal
│       ├── capacitor.config.ts
│       ├── android/
│       └── package.json
```

Monorepo agar versi web + icon sinkron; dua `appId` berbeda untuk Play Store.

### 2.2 Setup Capacitor (Admin)

```bash
cd mobile/admin
npm init -y
npm install @capacitor/core @capacitor/cli @capacitor/android
npm install @capacitor/splash-screen @capacitor/status-bar @capacitor/geolocation
npx cap init "NetManage Admin" id.tunnelhost.netmanage.admin --web-dir=../out
```

**Catatan Next.js:** App ini **SSR**, bukan static export penuh. Konfigurasi Capacitor untuk production:

```ts
// mobile/admin/capacitor.config.ts
const config = {
  appId: "id.tunnelhost.netmanage.admin",
  appName: "NetManage Admin",
  server: {
    url: "https://isp.tunnelhost.my.id/login",
    cleartext: false,
  },
  android: { allowMixedContent: false },
};
```

```ts
// mobile/portal/capacitor.config.ts
const config = {
  appId: "id.tunnelhost.netmanage.portal",
  appName: "NetManage Portal",
  server: {
    url: "https://isp.tunnelhost.my.id/portal/login",
    cleartext: false,
  },
  android: { allowMixedContent: false },
};
```

Opsional: header `X-NetManage-App: admin|portal` via Capacitor config plugin agar web bisa deteksi shell.

Dev lokal: `server.url: "http://10.0.2.2:3000/login"` (emulator) atau IP LAN.

### 2.3 Android permissions (`AndroidManifest.xml`)

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.BLUETOOTH" />
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
```

### 2.4 Branding native shell

| App | Splash | Ikon | Status bar |
|-----|--------|------|------------|
| Admin | Logo + "Admin ISP" | Badge operasional | `#2563eb` |
| Portal | Logo + tagline pelanggan | Badge rumah/WiFi | `#2563eb` |

Asset sumber: `docs/design/android/` → `mobile/*/assets/` saat build.

### 2.5 Build APK (ulangi per app)

```bash
cd mobile/admin   # atau mobile/portal
npx cap add android
npx cap sync android
npx cap open android   # Android Studio
# Build > Generate Signed Bundle/APK
```

Output: `admin-release.apk` + `portal-release.apk` (internal), atau `.aab` untuk Play Store fase 2.

### 2.6 Deep link (opsional)

Intent filter untuk `https://isp.tunnelhost.my.id/*` agar link Duitku/WhatsApp kembali ke app.

---

## Fase 3 — Distribusi & QA

### 3.1 Testing checklist Android

Gunakan checklist lengkap: [android-qa-checklist.md](android-qa-checklist.md).

Ringkasan kritikal:

- [ ] Admin: owner/admin/kolektor/teknisi login; **superadmin ditolak**
- [ ] Portal: pelanggan OTP; **staf ditolak** dengan arahan ke Admin app
- [ ] Kolektor: GPS, sort jarak, bayar tunai, cetak Bluetooth
- [ ] Portal: bayar Duitku redirect & return
- [ ] Back button, session persist, offline kolektor

### 3.2 Distribusi

| Channel | Kapan |
|---------|-------|
| Sideload APK | Uji internal / kolektor lapangan |
| Google Play (AAB) | Production publik |
| PWA install prompt | Tetap sebagai alternatif tanpa Play Store |

Play Store butuh: privacy policy URL, screenshot, deskripsi, content rating.

---

## Fase 4 — Native lanjutan (jika hybrid tidak cukup)

Trigger: Web Bluetooth gagal, push notification wajib, offline sync kompleks, atau performa admin mobile buruk.

### 4.1 REST API layer

Ekstrak dari Server Actions ke `src/app/api/v1/`:

```
POST /api/v1/auth/login
POST /api/v1/auth/otp/request
POST /api/v1/auth/otp/verify
GET  /api/v1/kolektor/tasks
POST /api/v1/invoices/:id/pay-cash
GET  /api/v1/portal/invoices
...
```

Auth: Bearer token (JWT) atau session cookie + CSRF — **paralel** dengan web, jangan break existing.

### 4.2 App native (Expo/React Native)

- Monorepo package `@billing/shared` untuk types & validation (Zod)
- UI native untuk kolektor + portal dulu
- Admin dashboard tetap web atau WebView tab terpisah

### 4.3 Plugin native prioritas

- FCM push (tagihan jatuh tempo, OTP)
- Bluetooth ESC/POS
- Background geolocation (opsional)
- Biometric unlock (Capacitor `@capacitor-community/biometric-auth`)

---

## Estimasi effort

| Fase | Scope | Estimasi |
|------|-------|----------|
| 0b | Wireframe + mockup + asset icon | 2–3 hari |
| 1 | PWA + mobile hardening + role guards | 3–5 hari |
| 1.4 | API mobile read-only + SW offline | 1–2 hari |
| 2 | Dua Capacitor project + APK signed | 2–3 hari |
| 3 | QA perangkat nyata + sideload internal | 2–3 hari |
| 4 | REST API + native (future) | 2–4 minggu |

**MVP dua APK (fase 0b–3 minimal):** ~1,5 minggu.

---

## Urutan implementasi yang disarankan

1. **Responsive fix** kolektor + portal + login (quick wins)
2. **Manifest + icon 512** + viewport meta
3. **Capacitor project** pointing ke production URL
4. **Build APK** → uji di 2–3 device Android
5. **Perluas SW + API kolektor** untuk offline
6. **Play Store** setelah QA stabil
7. **REST API + native** hanya bila ada blocker di lapangan

---

## Risiko & mitigasi

| Risiko | Mitigasi |
|--------|----------|
| Admin dashboard sulit dipakai di layar kecil | Prioritas card view / tab mobile; superadmin boleh desktop-only |
| Web Bluetooth tidak jalan di WebView | Test early; fallback plugin Capacitor |
| Server Actions lambat di jaringan lemah | API + cache SW untuk kolektor |
| Play Store reject WebView-only app | Tambah value native (splash, offline, push) — Capacitor counts as hybrid |
| Session logout saat clear WebView cache | Document "jangan clear storage"; pertimbangkan token refresh fase 4 |

---

## Dokumen terkait

- [`docs/prd-android-v1.md`](prd-android-v1.md) — PRD produk Android v1 (dua app)
- [`docs/android-ui-ux-spec.md`](android-ui-ux-spec.md) — spesifikasi UI/UX & wireframe notes
- [`docs/android-ux-research.md`](android-ux-research.md) — riset pain points mobile
- [`docs/android-qa-checklist.md`](android-qa-checklist.md) — checklist QA device
- [`docs/design/android/README.md`](design/android/README.md) — folder wireframe & mockup
- [`docs/database-migration-plan.md`](database-migration-plan.md) — migrasi SQLite → PostgreSQL/MySQL
- [`Product Requirements Document (PRD) — NetManage SaaS.md`](../Product%20Requirements%20Document%20(PRD)%20%E2%80%94%20NetManage%20SaaS.md) — PRD platform utama
