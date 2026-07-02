# Android APK — Pengingat Next Step

Status terakhir: dua APK sudah bisa dibuild (`Admin.net`, `MyWiFi`), masih ada item lanjutan sebelum rilis final.

## Pending utama (jangan lupa)

- [ ] Deploy web production terbaru setelah perubahan mobile UX terakhir.
- [ ] QA device nyata (minimal 3 device Android: API 26/30/34).
- [ ] Uji end-to-end role: owner/admin/kolektor/teknisi/pelanggan.
- [ ] Uji GPS kolektor + tombol Maps + popup marker peta.
- [ ] Uji pembayaran (cash kolektor + flow portal).
- [ ] Uji session persist + logout + back button behavior.
- [ ] Distribusi internal terbatas untuk uji lapangan (kolektor/pelanggan pilot).

## Rilis & hardening

- [ ] Ganti keystore default internal ke keystore production final.
- [ ] Naikkan `versionCode` / `versionName` untuk rilis berikutnya.
- [ ] Bersihkan file APK lama di `mobile/dist` (sisakan nama final rilis).
- [ ] Catat changelog release APK internal.

## Fase berikutnya (opsional/bertahap)

- [ ] Offline kolektor lebih matang (`/api/mobile/kolektor/tasks` + cache data).
- [ ] Evaluasi kestabilan Bluetooth print di WebView (jika perlu plugin native).
- [ ] Push notification (FCM) jika mulai dibutuhkan operasional.
- [ ] Persiapan Play Store (AAB, screenshot, privacy policy, listing metadata).

## Catatan tambahan

- Tambahkan item baru di bawah ini saat ada request tambahan dari lapangan:

- [ ] ...
- [ ] ...

