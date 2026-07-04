# Plan Implementasi — Push Notification APK Android (FCM HTTP v1)

Dokumen ini merinci langkah mengaktifkan notifikasi push untuk **Admin.net** dan **MyWiFi** via Firebase Cloud Messaging (FCM).

**Status:** foundation kode sudah ada di repo; **belum aktif di production** karena Firebase dan env belum dikonfigurasi.

**Domain production saat ini:** `https://billisp.tunnelhost.my.id` (PostgreSQL).

> **Penting:** Firebase **Cloud Messaging API (Legacy)** sudah dinonaktifkan (deprecated sejak 2023). Server key lama (`FCM_SERVER_KEY`) **tidak bisa dipakai lagi**. Wajib pakai **FCM HTTP v1** + **service account** — sudah diimplementasi di `fcm-v1-client.ts`.

---

## Ringkasan arsitektur

```mermaid
flowchart LR
  subgraph events [Event bisnis]
    E1[Pembayaran sukses]
    E2[Tiket gangguan]
    E3[Error WhatsApp]
  end
  subgraph server [Next.js]
    S1[push-sender.ts]
    S1b[fcm-v1-client.ts]
    S2[(device_push_token)]
    S3[(push_notification_log)]
    S4[PushNotificationBootstrap]
  end
  FCM[FCM HTTP v1]
  A1[Admin.net APK]
  A2[MyWiFi APK]

  E1 --> S1
  E2 --> S1
  E3 --> S1
  S1 --> S1b
  S1 --> S2
  S1b -->|OAuth2 Bearer| FCM
  S1 --> S3
  FCM --> A1
  FCM --> A2
  A1 -->|login + izin| S4
  A2 -->|login + izin| S4
  S4 -->|upsert token| S2
```

**Alur singkat:**

1. User buka APK → login → bootstrap minta izin notifikasi → FCM mengeluarkan device token.
2. Token disimpan ke DB (`device_push_token`) via server action (butuh session login).
3. Saat event bisnis terjadi, server lookup token → OAuth2 token dari service account → kirim ke FCM HTTP v1 → notif muncul di HP.
4. User tap notif → app navigasi ke halaman terkait (`push-navigation.ts`).

---

## Yang sudah ada di kode

| Komponen | Status | Lokasi |
|----------|--------|--------|
| Plugin Capacitor push | ✅ | `@capacitor/push-notifications` di `mobile/admin` & `mobile/portal` |
| Bootstrap client (izin + register + tap handler) | ✅ | `src/components/mobile/push-notification-bootstrap.tsx` |
| Gate push (mati sampai Firebase siap) | ✅ | `NEXT_PUBLIC_MOBILE_PUSH_ENABLED` di `src/lib/mobile/capacitor-runtime.ts` |
| Server action registrasi token | ✅ | `src/features/notifications/actions.ts` |
| Service upsert token | ✅ | `src/features/notifications/device-push-token-service.ts` |
| FCM HTTP v1 sender | ✅ | `src/features/notifications/fcm-v1-client.ts` |
| Event fanout + log | ✅ | `src/features/notifications/push-sender.ts` |
| Auto-deactivate token invalid | ✅ | `push-sender.ts` (response `UNREGISTERED` / 404) |
| Navigasi deep link dari notif | ✅ | `src/lib/mobile/push-navigation.ts` |
| Schema DB SQLite + PostgreSQL | ✅ | `src/lib/db/schema.sqlite.ts`, `schema.pg.ts` |
| Migrasi PG | ✅ | `drizzle/pg/0008_device_push_token.sql`, `0009_push_notification_log.sql` |
| Gradle google-services (conditional) | ✅ | `mobile/*/android/app/build.gradle` |
| Bootstrap di root layout | ✅ | `src/app/layout.tsx` |

### Event yang sudah ter-wire

| Event | Fungsi | Target APK | Role / subjek |
|-------|--------|------------|---------------|
| Pembayaran sukses | `notifyPaymentSuccess` | Admin.net | owner, admin |
| Pembayaran sukses | `notifyPaymentSuccess` | MyWiFi | pelanggan |
| Tiket baru / update status | `notifyTicketEvent` | Admin.net | owner, admin, teknisi |
| Error kirim WhatsApp | `notifyWhatsAppIntegrationError` | Admin.net | owner, admin |

### Package ID Android (Firebase)

| APK | Application ID |
|-----|----------------|
| Admin.net | `id.tunnelhost.netmanage.admin` |
| MyWiFi | `id.tunnelhost.netmanage.portal` |

---

## Yang belum terpenuhi (blocker)

| # | Item | Dampak jika belum |
|---|------|-------------------|
| 1 | **Project Firebase** + 2 Android app | APK tidak dapat FCM token |
| 2 | **`google-services.json`** di `mobile/admin/android/app/` dan `mobile/portal/android/app/` | Plugin Google Services tidak aktif saat build |
| 3 | **Service account FCM** di `.env` production | Server skip kirim (`status: skipped` di log) |
| 4 | **Firebase Cloud Messaging API** diaktifkan di Google Cloud | HTTP v1 return 403 |
| 5 | **`NEXT_PUBLIC_MOBILE_PUSH_ENABLED=true`** saat `npm run build` | Client tidak minta izin notifikasi |
| 6 | **Migrasi DB** `0008` + `0009` di production | Registrasi token gagal (tabel tidak ada) |
| 7 | **Rebuild & redistribute APK** setelah langkah 1–2 | APK lama tidak support push |
| 8 | **QA end-to-end** di device nyata | Belum terverifikasi operasional |

### Gap kecil (fase berikutnya, bukan blocker MVP)

- Token didaftarkan saat app buka; **user harus sudah login** — jika FCM register sebelum login, token gagal disimpan (silent fail).
- Tidak ada unregister token saat logout.
- Tidak ada UI admin untuk melihat `push_notification_log`.
- Kolektor tidak menerima notif pembayaran (hanya owner/admin).

---

## Step-by-step implementasi

### Fase 1 — Firebase & Google Cloud Console

#### 1.1 Buat project Firebase

1. Buka [Firebase Console](https://console.firebase.google.com/) → buat project (mis. `NetManage-Billing`).

2. Tambah **2 app Android** (wajib terpisah):

   | Nama | Package name |
   |------|--------------|
   | Admin.net | `id.tunnelhost.netmanage.admin` |
   | MyWiFi | `id.tunnelhost.netmanage.portal` |

3. Download `google-services.json` masing-masing app → letakkan:

   ```
   mobile/admin/android/app/google-services.json
   mobile/portal/android/app/google-services.json
   ```

   **Jangan commit** ke git. Pastikan path ini ada di `.gitignore`.

#### 1.2 Aktifkan FCM HTTP v1 (bukan Legacy)

Di [Google Cloud Console](https://console.cloud.google.com/) → pilih project Firebase yang sama:

1. **APIs & Services → Library**
2. Cari dan **Enable**:
   - **Firebase Cloud Messaging API** ← ini yang dipakai HTTP v1
3. Pastikan **Cloud Messaging API (Legacy)** tetap **Disabled** — normal dan diharapkan.

#### 1.3 Buat service account untuk server

1. Firebase → **Project Settings → Service accounts**
2. Klik **Generate new private key** → download file JSON (mis. `netmanage-firebase-adminsdk.json`)
3. Simpan di server production (mis. `/home/tunnelhost-isp/secrets/firebase-adminsdk.json`)
4. **Jangan commit** file JSON ke git

Isi file JSON yang dibutuhkan server:

```json
{
  "type": "service_account",
  "project_id": "netmanage-billing-xxxxx",
  "client_email": "firebase-adminsdk-xxxxx@netmanage-billing-xxxxx.iam.gserviceaccount.com",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
}
```

---

### Fase 2 — Environment & deploy web

Pilih **satu** opsi kredensial di `.env` production (**sebelum** `npm run build`):

**Opsi A — path file (disarankan di VPS):**

```env
GOOGLE_APPLICATION_CREDENTIALS=/home/tunnelhost-isp/secrets/firebase-adminsdk.json
NEXT_PUBLIC_MOBILE_PUSH_ENABLED=true
NEXT_PUBLIC_APP_URL=https://billisp.tunnelhost.my.id
```

**Opsi B — inline (PM2 / tanpa file):**

```env
FCM_PROJECT_ID=netmanage-billing-xxxxx
FCM_CLIENT_EMAIL=firebase-adminsdk-xxxxx@netmanage-billing-xxxxx.iam.gserviceaccount.com
FCM_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
NEXT_PUBLIC_MOBILE_PUSH_ENABLED=true
NEXT_PUBLIC_APP_URL=https://billisp.tunnelhost.my.id
```

**Opsi C — satu baris JSON:**

```env
FCM_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"...","client_email":"...","private_key":"..."}
NEXT_PUBLIC_MOBILE_PUSH_ENABLED=true
NEXT_PUBLIC_APP_URL=https://billisp.tunnelhost.my.id
```

> **Jangan pakai `FCM_SERVER_KEY`** — Legacy API sudah dinonaktifkan di Firebase.

Deploy di server:

```bash
cd /path/to/billingisp
git pull origin netmanage-implementation
npm ci --include=dev
npm run db:migrate:pg
npm run build
pm2 restart billingisp --update-env
pm2 logs billingisp --lines 30
```

**Verifikasi tabel:**

```sql
SELECT COUNT(*) FROM device_push_token;
SELECT COUNT(*) FROM push_notification_log;
```

---

### Fase 3 — Rebuild APK

Pastikan `google-services.json` sudah ada di kedua folder `android/app/` **sebelum** build.

```powershell
# Dari root repo
node scripts/build-mobile-apk.mjs --url=https://billisp.tunnelhost.my.id --skip-assets
```

Output: `mobile/dist/Admin.net-release.apk`, `mobile/dist/MyWiFi-release.apk`.

Distribusi:

- Upload via **Superadmin → Mobile APK**, atau
- Copy ke `public/uploads/mobile-apk/` (setelah `npm run uploads:ensure-dirs`)

User wajib **install ulang** APK release (bukan `*-debug-dev.apk`).

---

### Fase 4 — QA end-to-end

#### 4.1 Registrasi token

1. Install APK release di device Android (API 26+).
2. Login (admin/owner di Admin.net, pelanggan di MyWiFi).
3. Izinkan notifikasi saat diminta.
4. Cek DB:

   ```sql
   SELECT subject_type, app, LEFT(token, 24) AS token_prefix,
          is_active, last_seen_at
   FROM device_push_token
   ORDER BY last_seen_at DESC
   LIMIT 10;
   ```

#### 4.2 Kirim notif per event

| Aksi uji | Expected notif |
|----------|----------------|
| Catat pembayaran pelanggan | Admin.net (owner/admin) + MyWiFi (pelanggan) |
| Buat tiket gangguan baru | Admin.net (owner/admin/teknisi) |
| Update status tiket | Admin.net (owner/admin/teknisi) |
| Trigger error WhatsApp | Admin.net (owner/admin) |

#### 4.3 Tap notifikasi → navigasi

| Event | Path target |
|-------|-------------|
| `payment.success` | `/dashboard/tagihan/{pelangganId}` |
| `payment.success.portal` | `/portal/tagihan` |
| `ticket.event` | `/dashboard/tiket` |
| `whatsapp.integration.error` | `/dashboard/integrasi` |

#### 4.4 Debug via log DB

```sql
SELECT event_type, status, error, LEFT(token, 16), created_at
FROM push_notification_log
ORDER BY created_at DESC
LIMIT 20;
```

| Status | Arti |
|--------|------|
| `sent` | Berhasil dikirim ke FCM HTTP v1 |
| `failed` | FCM menolak (token invalid, kredensial salah, API belum enable) |
| `skipped` | Service account FCM belum dikonfigurasi |

---

## Checklist rollout

```
[ ] Firebase project dibuat
[ ] 2 Android app (admin + portal) terdaftar
[ ] google-services.json di mobile/admin/android/app/
[ ] google-services.json di mobile/portal/android/app/
[ ] google-services.json di .gitignore
[ ] Firebase Cloud Messaging API ENABLED di Google Cloud
[ ] Service account JSON dibuat (Generate new private key)
[ ] GOOGLE_APPLICATION_CREDENTIALS atau FCM_* env di production
[ ] NEXT_PUBLIC_MOBILE_PUSH_ENABLED=true
[ ] npm run db:migrate:pg di production
[ ] npm run build + pm2 restart
[ ] APK release di-rebuild dengan google-services.json
[ ] APK didistribusi & di-install ulang di device uji
[ ] Token muncul di device_push_token setelah login
[ ] Notif sampai untuk pembayaran / tiket / error WA
[ ] Tap notif navigasi ke halaman benar
```

---

## Troubleshooting

| Masalah | Penyebab | Solusi |
|---------|----------|--------|
| Legacy API Disabled di Firebase | Normal — Legacy sudah sunset | Pakai service account + HTTP v1 (bukan server key) |
| `status: skipped` di log | Service account belum di-set | Set `GOOGLE_APPLICATION_CREDENTIALS` atau `FCM_*` env |
| `status: failed` HTTP 403 | FCM API belum enable | Enable **Firebase Cloud Messaging API** di Google Cloud |
| `status: failed` HTTP 401 | Kredensial invalid / expired | Regenerate service account key |
| `UNREGISTERED` di response | Token device expired | Otomatis `is_active=false`; user buka app + login ulang |
| App crash saat minta izin notif | Push aktif tanpa `google-services.json` | Matikan flag atau pasang JSON + rebuild APK |
| Token tidak masuk DB | User belum login saat FCM register | Login dulu, tutup-buka app |
| Notif tidak muncul tapi `sent` | Battery optimization Android | Cek pengaturan notif app di HP |

Lihat juga: [mobile/README.md](../mobile/README.md) bagian Troubleshooting.

---

## Fase berikutnya (hardening)

1. **Re-register token setelah login** — panggil ulang `PushNotifications.register()` di callback login sukses.
2. **Unregister saat logout** — set `is_active = false` untuk token device saat ini.
3. **UI log push** di superadmin (opsional).
4. **Notif kolektor** — tambah role `kolektor` di `notifyPaymentSuccess` jika dibutuhkan.
5. **Foreground handler** — listener `pushNotificationReceived` untuk toast in-app.

---

## Referensi file

| Area | Path |
|------|------|
| FCM HTTP v1 client | `src/features/notifications/fcm-v1-client.ts` |
| Event fanout + log | `src/features/notifications/push-sender.ts` |
| Bootstrap client | `src/components/mobile/push-notification-bootstrap.tsx` |
| Gate env | `src/lib/mobile/capacitor-runtime.ts` |
| Registrasi token | `src/features/notifications/actions.ts` |
| Navigasi tap notif | `src/lib/mobile/push-navigation.ts` |
| Env contoh | `.env.example` (bagian Mobile APK) |
| Build APK | `scripts/build-mobile-apk.mjs` |
