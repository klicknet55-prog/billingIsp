# Aplikasi Android NetManage (Capacitor)

Dua shell Android hybrid yang memuat web production via WebView HTTPS.

| Folder | App | Package | Entry URL |
|--------|-----|---------|-----------|
| `mobile/admin/` | NetManage Admin | `id.tunnelhost.netmanage.admin` | `/login?nm_app=admin` |
| `mobile/portal/` | NetManage Portal | `id.tunnelhost.netmanage.portal` | `/portal/login?nm_app=portal` |

Dokumen terkait: [../docs/android-app-plan.md](../docs/android-app-plan.md)

---

## Prasyarat

1. **Web production HTTPS** sudah jalan (mis. `https://isp.tunnelhost.my.id`)
2. **Node.js** 20+
3. **Android Studio** + Android SDK (API 34 disarankan)
4. `JAVA_HOME` dan `ANDROID_HOME` terkonfigurasi

---

## URL server

Default di `capacitor.config.ts`: `https://isp.tunnelhost.my.id`

Override saat sync/build:

```powershell
# PowerShell
$env:CAPACITOR_SERVER_URL="https://isp.tunnelhost.my.id"
npm run mobile:admin:sync
```

Dev lokal (emulator, HTTP):

```powershell
$env:CAPACITOR_SERVER_URL="http://10.0.2.2:3000"
```

> Untuk HTTP lokal perlu `cleartext: true` di config + network security — production selalu HTTPS.

---

## Workflow build APK

### 1. Sync web config ke project Android

```bash
npm run mobile:sync
# atau per app:
npm run mobile:admin:sync
npm run mobile:portal:sync
```

### 2. Buka di Android Studio

```bash
npm run mobile:admin:open
# atau
npm run mobile:portal:open
```

### 3. Generate signed APK

Di Android Studio:

1. **Build → Generate Signed Bundle / APK**
2. Pilih **APK** (internal) atau **AAB** (Play Store)
3. Buat/gunakan keystore
4. Output: `android/app/release/app-release.apk`

Ulangi untuk app kedua (`mobile/portal`).

---

## Izin Android (Admin)

- Internet
- GPS (kolektor sort jarak)
- Bluetooth (cetak struk thermal)

Portal hanya membutuhkan Internet.

---

## Ikon & splash

Default masih ikon Capacitor. Untuk branding:

1. Siapkan PNG 1024×1024 dari `public/icon.png`
2. Gunakan [Capacitor Assets](https://github.com/ionic-team/capacitor-assets) atau ganti manual di:
   - `android/app/src/main/res/mipmap-*`

Splash: background `#2563eb` (sudah di `capacitor.config.ts`).

---

## Deteksi app shell di web

Parameter `?nm_app=admin|portal` disimpan di `sessionStorage` agar bottom nav & layout mobile aktif di APK.

---

## Troubleshooting

| Masalah | Solusi |
|---------|--------|
| Layar putih | Cek `CAPACITOR_SERVER_URL`, pastikan HTTPS valid |
| Cookie login hilang | Jangan clear WebView storage; pastikan same-origin |
| GPS tidak jalan | Izin lokasi di pengaturan Android |
| Bluetooth gagal | Uji printer; mungkin perlu plugin native fase 4 |

---

## Checklist rilis internal

- [ ] Web Fase 1 sudah di-deploy ke production
- [ ] `CAPACITOR_SERVER_URL` mengarah ke production
- [ ] Build signed APK Admin + Portal
- [ ] QA dengan [android-qa-checklist.md](../docs/android-qa-checklist.md)
