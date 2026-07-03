# Aplikasi Android NetManage (Capacitor)

Dua shell Android hybrid yang memuat web production via WebView HTTPS.

| Folder | App | Package | Entry URL |
|--------|-----|---------|-----------|
| `mobile/admin/` | **Admin.net** | `id.tunnelhost.netmanage.admin` | `/login?nm_app=admin` |
| `mobile/portal/` | **MyWiFi** | `id.tunnelhost.netmanage.portal` | `/portal/login?nm_app=portal` |

Dokumen terkait: [../docs/android-app-plan.md](../docs/android-app-plan.md)

---

## Prasyarat

1. **Web production HTTPS** sudah jalan (mis. `https://isp.tunnelhost.my.id`)
2. **Node.js** 20+
3. **Android Studio** + Android SDK (API 34+)
4. `ANDROID_HOME` → SDK (mis. `%LOCALAPPDATA%\Android\Sdk`)
5. `JAVA_HOME` → JBR Android Studio (disarankan, bukan JDK sistem)

---

## Branding (ikon & splash)

Sumber ikon: `public/icon.png`. Script generate per app:

| App | Latar ikon | Badge |
|-----|------------|-------|
| Admin | Biru gelap `#1e40af` | **ADM** (amber) |
| Portal | Biru `#2563eb` | **WiFi** (hijau) |

```powershell
npm run mobile:assets
npm run mobile:assets:generate
```

File sumber: `mobile/admin/assets/`, `mobile/portal/assets/`  
Output Android: `android/app/src/main/res/mipmap-*` dan `drawable-*`.

---

## Build APK (otomatis)

Satu perintah — generate asset, sync, signed release, salin ke `mobile/dist/`:

```powershell
$env:ANDROID_HOME="$env:LOCALAPPDATA\Android\Sdk"
$env:JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"
npm run mobile:apk
```

Output:

- `mobile/dist/Admin.net-release.apk`
- `mobile/dist/MyWiFi-release.apk`

Keystore internal (auto dibuat, **gitignored**): `mobile/*/android/netmanage-release.jks`  
Password default: `netmanage2026` — ganti sebelum Play Store.

Opsi:

```powershell
npm run mobile:apk -- --skip-assets      # rebuild cepat
npm run mobile:apk -- --admin-only
npm run mobile:apk -- --portal-only
npm run mobile:apk -- --url=https://billisp.tunnelhost.my.id   # domain production lain
```

`--url=` mengatur `CAPACITOR_SERVER_URL`, shell MyWiFi, dan host App Links di `AndroidManifest.xml`.

---

## Workflow manual (Android Studio)

### 1. Sync

```powershell
$env:CAPACITOR_SERVER_URL="https://isp.tunnelhost.my.id"
npm run mobile:sync
```

### 2. Buka project

```powershell
npm run mobile:admin:open
# atau
npm run mobile:portal:open
```

### 3. Signed APK

**Build → Generate Signed Bundle / APK** → APK atau AAB (Play Store).

---

## Izin Android

| App | Izin |
|-----|------|
| Admin | Internet, GPS, Bluetooth |
| Portal | Internet |

---

## Deteksi app shell di web

Parameter `?nm_app=admin|portal` disimpan di `sessionStorage` agar bottom nav & layout mobile aktif di APK.

Rute `/p/*` dan `/portal/*` juga otomatis dikenali sebagai shell portal (App Link bayar).

---

## Link bayar → APK MyWiFi

1. **Pesan WhatsApp** memakai URL HTTPS biasa (`/p/{code}`).
2. Di **browser Android**, halaman landing mencoba buka MyWiFi via intent, lalu fallback auto-login di browser.
3. **Android App Links** (`/p/*`, `/portal/*`) — host default `isp.tunnelhost.my.id` (sesuaikan jika domain beda).
4. **Verifikasi domain**: set `ANDROID_APP_LINK_SHA256` di `.env` production, cek `https://DOMAIN/.well-known/assetlinks.json`.

Setelah ubah manifest, rebuild APK portal:

```powershell
npm run mobile:apk -- --portal-only
```

---

## Troubleshooting

| Masalah | Solusi |
|---------|--------|
| Layar putih / "This page couldn't load" | Pastikan APK **release** (bukan `*-debug-dev.apk`). Jangan build release setelah `mobile:portal:dev` tanpa `npm run mobile:apk` ulang |
| APK dev tidak load | `MyWiFi-debug-dev.apk` butuh PC + `npm run dev` satu WiFi |
| App crash saat izin notifikasi | Push FCM butuh `google-services.json` + `NEXT_PUBLIC_MOBILE_PUSH_ENABLED=true`. Tanpa itu, push dimatikan sengaja |
| `404` di `/.well-known/assetlinks.json` | Nginx/certbot menangkap `/.well-known/` sebelum Next.js. Tambah `location = /.well-known/assetlinks.json { proxy_pass ... }` (lihat README utama bagian Nginx) |
| Link bayar tidak auto-buka MyWiFi | (1) Landing page sekarang auto-coba intent. (2) App Links penuh butuh `ANDROID_APP_LINK_SHA256` di `.env`, nginx assetlinks OK, dan APK **release** terinstall |
| Cookie login hilang | Jangan clear WebView storage |
| GPS tidak jalan | Izin lokasi di pengaturan Android |
| `keytool` tidak ditemukan | Set `JAVA_HOME` ke JBR Android Studio |
| Gradle gagal | Pastikan `ANDROID_HOME` benar; jalankan ulang dengan `--stacktrace` |

---

## Checklist rilis internal

- [x] Branding ikon + splash Admin vs Portal
- [x] Script build signed APK
- [ ] Web production deploy terbaru
- [ ] QA device: [android-qa-checklist.md](../docs/android-qa-checklist.md)
- [ ] Sideload ke kolektor / pelanggan uji