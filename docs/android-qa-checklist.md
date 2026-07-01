# Checklist QA — Aplikasi Android NetManage v1

Gunakan dokumen ini saat pengujian di device fisik sebelum rilis APK internal.

**Versi:** 1.0 · **Tanggal:** 30 Juni 2026

---

## Persiapan tes

- [ ] Server production HTTPS aktif (`NEXT_PUBLIC_APP_URL` benar)
- [ ] Akun uji: owner, admin, kolektor, teknisi, pelanggan, superadmin
- [ ] Minimal 3 device Android (API 26, 30, 34)
- [ ] APK Admin + APK Portal terinstall
- [ ] Printer thermal Bluetooth (opsional, untuk tes kolektor)

---

## A. NetManage Admin

### A1 — Instalasi & shell

- [ ] Ikon launcher tampil benar
- [ ] Splash screen tampil ±2 detik lalu load web
- [ ] Status bar berwarna primary
- [ ] App membuka `/login` (bukan homepage publik)

### A2 — Autentikasi

| Role | Harapan | Pass |
|------|---------|:----:|
| owner | Redirect `/dashboard` | |
| admin | Redirect `/dashboard` | |
| kolektor | Redirect `/kolektor` | |
| teknisi | Redirect `/dashboard` atau tiket | |
| superadmin | **Ditolak** dengan pesan jelas | |
| pelanggan (salah app) | n/a | |

- [ ] Session persist setelah tutup app (buka lagi masih login)
- [ ] Logout berfungsi

### A3 — Navigasi mobile

- [ ] Bottom nav tampil di layar kecil / standalone
- [ ] Drawer menu membuka rute lengkap
- [ ] Tombol back Android: modal dulu, baru keluar
- [ ] Di home tab, back tidak langsung kill app tanpa konfirmasi

### A4 — Owner / admin

- [ ] Dashboard home load tanpa error
- [ ] Daftar pelanggan: card readable, tap detail
- [ ] Daftar tagihan: tab filter responsif (1 tap)
- [ ] Tidak perlu scroll horizontal untuk aksi utama

### A5 — Kolektor

- [ ] Daftar tugas menampilkan pelanggan menunggak
- [ ] Sort jarak (jika GPS izin diberikan)
- [ ] Tap Maps/Waze membuka navigasi
- [ ] Bayar tunai: catat pembayaran sukses
- [ ] Setelah bayar, isolir pelanggan terlepas (jika applicable)
- [ ] Cetak struk Bluetooth (device support)
- [ ] Mode offline: banner + data cache (jika diimplementasi)

### A6 — Teknisi

- [ ] Daftar tiket load
- [ ] Update status tiket sukses
- [ ] Lokasi teknisi terkirim (jika fitur aktif)

---

## B. NetManage Portal

### B1 — Instalasi & shell

- [ ] Ikon berbeda dari Admin app
- [ ] App membuka `/portal/login`

### B2 — Autentikasi

- [ ] Login OTP WhatsApp berhasil
- [ ] Magic link (jika diuji) berhasil
- [ ] Login staf → pesan arahkan ke Admin app
- [ ] Session persist setelah tutup app

### B3 — Fitur pelanggan

- [ ] Home menampilkan ringkasan langganan
- [ ] Daftar tagihan + badge status
- [ ] Bayar Duitku: redirect → bayar → kembali → status lunas
- [ ] Lapor gangguan + upload foto
- [ ] Diagnostik jalan (jika diuji)

### B4 — Navigasi

- [ ] Bottom nav: Beranda, Tagihan, Lapor, Akun
- [ ] Back button perilaku benar

---

## C. Non-fungsional

- [ ] Semua request HTTPS (tidak ada mixed content warning)
- [ ] Performa acceptable di 4G (tidak blank > 5 detik)
- [ ] Dark mode readable (jika tenant pakai dark theme)
- [ ] Rotasi layar tidak merusak layout kritis
- [ ] Font tidak terlalu kecil (min 12px body)

---

## D. Regresi web

Pastikan perubahan mobile tidak merusak desktop:

- [ ] Login web desktop normal
- [ ] Dashboard ISP di browser laptop normal
- [ ] Portal di browser mobile (non-app) masih jalan

---

## Hasil tes

| Device | Android API | Admin | Portal | Tester | Tanggal |
|--------|-------------|:-----:|:------:|--------|---------|
| | | | | | |
| | | | | | |
| | | | | | |

**Keputusan rilis:**

- [ ] Lulus — siap distribusi internal
- [ ] Gagal — perlu perbaikan (catat issue di bawah)

### Issue log

| # | App | Deskripsi | Severity | Status |
|---|-----|-----------|----------|--------|
| 1 | | | | |
