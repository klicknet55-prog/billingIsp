# Tutorial Build APK — NetManage / BILLING RT-RW NET

Panduan langkah demi langkah untuk membangun APK Android **Admin.net** dan **MyWiFi** yang terhubung ke server production HTTPS.

Contoh domain di tutorial ini: **`https://netmanage.tunnelhost.my.id`**

> Dokumen pendukung: [mobile/README.md](../mobile/README.md) · [deploy-mobile-verify.md](deploy-mobile-verify.md) · [android-qa-checklist.md](android-qa-checklist.md)

---

## Apa yang dibangun?

Proyek ini punya **dua APK terpisah** (Capacitor shell + WebView):

| APK | Folder | Package Android | Untuk siapa | Halaman awal |
|-----|--------|-----------------|-------------|--------------|
| **Admin.net** | `mobile/admin/` | `id.tunnelhost.netmanage.admin` | Owner, admin, kolektor, teknisi | `/login?nm_app=admin` |
| **MyWiFi** | `mobile/portal/` | `id.tunnelhost.netmanage.portal` | Pelanggan (portal) | `/portal/login?nm_app=portal` |

APK **tidak** membundel kode Next.js. Saat dibuka, app memuat halaman web dari server production lewat HTTPS.

```
┌─────────────┐     HTTPS      ┌──────────────────────────────────┐
│  HP Android │ ─────────────► │ https://netmanage.tunnelhost...  │
│  (APK)      │   WebView      │ Next.js (login, dashboard, dll.) │
└─────────────┘                └──────────────────────────────────┘
```

---

## Prasyarat

### Di server production

1. Web sudah online di HTTPS, contoh: [https://netmanage.tunnelhost.my.id](https://netmanage.tunnelhost.my.id)
2. File `.env` production berisi:

```env
NEXT_PUBLIC_APP_URL=https://netmanage.tunnelhost.my.id
```

3. Deploy terbaru sudah jalan (`npm run build` + restart PM2/nginx).

Tanpa `NEXT_PUBLIC_APP_URL` yang benar, login, cookie session, dan link referral bisa gagal di APK.

### Di PC yang dipakai build

| Software | Versi / catatan |
|----------|-----------------|
| Node.js | 20+ |
| Android Studio | Terinstall lengkap dengan Android SDK (API 34+) |
| Git | Repo `billingisp` sudah di-clone |

**Windows** — set variabel lingkungan (PowerShell):

```powershell
$env:ANDROID_HOME="$env:LOCALAPPDATA\Android\Sdk"
$env:JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"
```

**Linux / macOS**:

```bash
export ANDROID_HOME="$HOME/Android/Sdk"
export JAVA_HOME="/path/to/android-studio/jbr"   # sesuaikan
```

Cek SDK terdeteksi:

```powershell
Test-Path $env:ANDROID_HOME
```

Harus mengembalikan `True`.

### Install dependency mobile (sekali)

Dari **root repo**:

```powershell
npm ci --prefix mobile/admin
npm ci --prefix mobile/portal
```

---

## Langkah 1 — Build APK release (cara otomatis)

Jalankan dari **root folder** proyek (`billingisp/`):

### Windows (PowerShell)

```powershell
cd F:\xampp\htdocs\billingisp

$env:ANDROID_HOME="$env:LOCALAPPDATA\Android\Sdk"
$env:JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"

npm run mobile:apk -- --url=https://netmanage.tunnelhost.my.id
```

### Linux / macOS

```bash
cd /path/to/billingisp

export ANDROID_HOME="$HOME/Android/Sdk"
export JAVA_HOME="/opt/android-studio/jbr"

npm run mobile:apk -- --url=https://netmanage.tunnelhost.my.id
```

### Apa yang dilakukan script?

Script [`scripts/build-mobile-apk.mjs`](../scripts/build-mobile-apk.mjs) otomatis:

1. Generate ikon & splash screen dari `public/icon.png`
2. Set `CAPACITOR_SERVER_URL` ke domain Anda
3. Generate shell redirect MyWiFi (`mobile/portal/www/index.html`)
4. Patch host App Links di `AndroidManifest.xml` (portal)
5. `cap sync android` untuk admin + portal
6. Gradle `assembleRelease` (APK ditandatangani)
7. Salin hasil ke folder `mobile/dist/`

Build pertama bisa **5–15 menit** (download Gradle dependency).

### Output APK

Setelah sukses, file ada di:

```
mobile/dist/Admin.net-release.apk    ← Admin.net
mobile/dist/MyWiFi-release.apk       ← MyWiFi (portal pelanggan)
```

---

## Langkah 2 — Opsi build tambahan

| Perintah | Kegunaan |
|----------|----------|
| `npm run mobile:apk -- --url=https://netmanage.tunnelhost.my.id` | Build keduanya (default) |
| `npm run mobile:apk -- --url=... --admin-only` | Hanya Admin.net |
| `npm run mobile:apk -- --url=... --portal-only` | Hanya MyWiFi |
| `npm run mobile:apk -- --url=... --skip-assets` | Rebuild cepat tanpa regenerate ikon |
| `npm run mobile:apk:debug -- --url=...` | APK debug (uji internal, bukan distribusi) |

Ganti domain dengan `--url=` atau variabel lingkungan:

```powershell
$env:CAPACITOR_SERVER_URL="https://netmanage.tunnelhost.my.id"
npm run mobile:apk
```

> **Penting:** Default di `capacitor.config.ts` masih `https://isp.tunnelhost.my.id`. Selalu pakai `--url=` saat domain production Anda berbeda.

---

## Langkah 3 — Keystore & tanda tangan APK

Saat build release pertama kali, script membuat keystore otomatis:

| File | Lokasi |
|------|--------|
| Keystore | `mobile/admin/android/netmanage-release.jks` |
| Keystore | `mobile/portal/android/netmanage-release.jks` |
| Properties | `mobile/*/android/keystore.properties` |

- Password default: **`netmanage2026`**
- File keystore **tidak** di-commit ke Git (`.gitignore`)
- **Ganti password** sebelum upload ke Google Play Store

Ambil SHA-256 fingerprint (untuk App Links):

```powershell
& "$env:JAVA_HOME\bin\keytool.exe" -list -v `
  -keystore mobile\portal\android\netmanage-release.jks `
  -alias netmanage `
  -storepass netmanage2026
```

Salin nilai **SHA256** ke `.env` production:

```env
ANDROID_APP_LINK_SHA256=AA:BB:CC:DD:...
```

Lalu restart app server dan verifikasi:

```
https://netmanage.tunnelhost.my.id/.well-known/assetlinks.json
```

---

## Langkah 4 — Distribusi APK ke pengguna

### Opsi A — Sideload langsung

1. Kirim file dari `mobile/dist/` ke HP (WhatsApp, email, USB)
2. Di Android: **Settings → Security → Install unknown apps** → izinkan sumber file
3. Tap file `.apk` → Install

### Opsi B — Upload lewat Superadmin (disarankan)

1. Login sebagai superadmin
2. Buka **Upload APK** → `/superadmin/mobile-apk`
3. Upload `Admin.net-release.apk` dan `MyWiFi-release.apk`
4. URL download tersimpan di `public/uploads/mobile-apk/` dan bisa dipakai di halaman Community

### Opsi C — Google Play Store (fase berikutnya)

Build **AAB** (Android App Bundle) lewat Android Studio: **Build → Generate Signed Bundle / APK → Android App Bundle**.

---

## Langkah 5 — Verifikasi setelah install

| # | Tes | Harapan |
|---|-----|---------|
| 1 | Buka **Admin.net** → login owner/admin | Masuk `/dashboard`, bottom nav tampil |
| 2 | Buka **MyWiFi** → login portal (OTP) | Masuk `/portal/*`, bottom nav tampil |
| 3 | Owner login di MyWiFi | Ditolak, arahkan ke Admin |
| 4 | Superadmin login di Admin.net | Ditolak dengan pesan jelas |
| 5 | Kolektor → tap Maps | Buka Google Maps / Waze |
| 6 | Link bayar WhatsApp (`/p/...`) di HP | Buka MyWiFi atau fallback browser |

Checklist lengkap: [android-qa-checklist.md](android-qa-checklist.md)

---

## Build manual lewat Android Studio

Jika ingin debug visual atau build AAB:

```powershell
$env:CAPACITOR_SERVER_URL="https://netmanage.tunnelhost.my.id"
npm run mobile:sync
npm run mobile:admin:open    # atau mobile:portal:open
```

Di Android Studio:

1. Tunggu Gradle sync selesai
2. **Build → Generate Signed Bundle / APK**
3. Pilih keystore `netmanage-release.jks` (password `netmanage2026`)
4. Pilih **APK** atau **AAB**

---

## Branding (ikon & splash)

Ikon di-generate dari `public/icon.png`:

| App | Warna latar | Badge |
|-----|-------------|-------|
| Admin.net | Biru gelap `#1e40af` | ADM |
| MyWiFi | Biru `#2563eb` | WiFi |

Regenerate manual:

```powershell
npm run mobile:assets
npm run mobile:assets:generate
```

File sumber: `mobile/admin/assets/`, `mobile/portal/assets/`

---

## Push notifikasi (opsional)

Push FCM **tidak wajib** untuk APK dasar. Jika ingin aktif:

1. Buat project Firebase → download `google-services.json`
2. Letakkan di:
   - `mobile/admin/android/app/google-services.json`
   - `mobile/portal/android/app/google-services.json`
3. Set di `.env` production:

```env
NEXT_PUBLIC_MOBILE_PUSH_ENABLED=true
FCM_PROJECT_ID=...
FCM_CLIENT_EMAIL=...
FCM_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

4. Rebuild APK

Tanpa konfigurasi FCM, app tetap jalan — push dimatikan sengaja agar tidak crash.

---

## Troubleshooting

| Masalah | Penyebab umum | Solusi |
|---------|---------------|--------|
| `Android SDK tidak ditemukan` | `ANDROID_HOME` salah | Set ke folder SDK Android Studio |
| `keytool tidak ditemukan` | `JAVA_HOME` salah | Pakai JBR Android Studio, bukan JDK sistem |
| Layar putih / "couldn't load" | Domain tidak bisa diakses HP | Pastikan HTTPS production online; rebuild dengan `--url=` benar |
| Login gagal / redirect loop | `NEXT_PUBLIC_APP_URL` salah di server | Samakan dengan domain build APK |
| MyWiFi stuck "Memuat…" | Shell lokal tidak redirect | Rebuild portal: `npm run mobile:apk -- --url=... --portal-only` |
| Link bayar tidak buka MyWiFi | App Links belum diverifikasi | Set `ANDROID_APP_LINK_SHA256`, cek `/.well-known/assetlinks.json`, rebuild portal APK |
| `404` assetlinks.json | Nginx intercept `.well-known` | Tambah `location =` di nginx (lihat [README.md](../README.md)) |
| Gradle gagal | SDK/Java tidak cocok | Buka Android Studio → SDK Manager → install API 34+ |
| Cookie login hilang | Clear storage WebView | Jangan hapus data app saat uji |

Log Gradle detail:

```powershell
cd mobile\admin\android
.\gradlew.bat assembleRelease --stacktrace
```

---

## Ringkasan perintah cepat

```powershell
# 1. Env
$env:ANDROID_HOME="$env:LOCALAPPDATA\Android\Sdk"
$env:JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"

# 2. Build keduanya untuk production
npm run mobile:apk -- --url=https://netmanage.tunnelhost.my.id

# 3. Hasil
# mobile/dist/Admin.net-release.apk
# mobile/dist/MyWiFi-release.apk
```

---

## Checklist sebelum rilis ke pengguna

- [ ] Web production `https://netmanage.tunnelhost.my.id` online & HTTPS valid
- [ ] `NEXT_PUBLIC_APP_URL` di server = domain production
- [ ] Build APK dengan `--url=` domain yang sama
- [ ] Uji login Admin.net dan MyWiFi di HP nyata
- [ ] Upload APK ke Superadmin atau distribusi sideload
- [ ] (Opsional) `ANDROID_APP_LINK_SHA256` + verifikasi App Links
- [ ] (Opsional) FCM + `google-services.json` untuk push notifikasi

---

*Terakhir diperbarui: sesuai branch `netmanage-implementation` — script `npm run mobile:apk`.*
