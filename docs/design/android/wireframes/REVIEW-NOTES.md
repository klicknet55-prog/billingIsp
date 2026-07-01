# Catatan Review Wireframe — NetManage Android v1

**Tanggal review:** 30 Juni 2026  
**Peserta:** Product owner (user) + development  
**Dokumen acuan:** [SCREEN-WIREFRAMES.md](SCREEN-WIREFRAMES.md)

**Status:** ✅ Keputusan utama disetujui — siap handoff implementasi Fase 1

---

## Ringkasan keputusan

| # | Topik | Keputusan | Dampak implementasi |
|---|-------|-----------|---------------------|
| 1 | Portal bottom nav | **4 tab:** Beranda, Tagihan, Lapor, **Akun** (bukan Diagnostik di nav) | Buat `/portal/akun`; pindah Diagnostik ke link di Home + Akun |
| 2 | Kolektor task card | **3 tombol sejajar:** Maps, Bayar, Cetak | Refactor `kolektor/page.tsx` + GPS sort + print trigger |
| 3 | Bayar tunai | **Bottom sheet** + radio (bulan ini / tunggakan / keduanya) | Sheet baru; `PayTagihanPanel` dipanggil dari tap Bayar |
| 4 | Admin bottom nav | **4 tab owner/admin:** Beranda, Pelanggan, Tagihan, Menu (drawer) | Komponen `MobileBottomNav` + role-aware items |
| 5 | Teknisi bottom nav | **3 tab:** Tiket, Beranda, Menu | Tab config terpisah di `MobileBottomNav` |
| 6 | Back keluar app | **Double-tap** + toast "Tekan lagi untuk keluar" | Hook Capacitor / `popstate` di root tab |
| 7 | Salah app guard | **Full-screen** terpisah (A9 / P7) | Guard setelah login + halaman dedicated |

---

## Gap wireframe vs web saat ini

| Layar | Wireframe | Web v1.0.0 | Aksi |
|-------|-----------|------------|------|
| A5 Kolektor | Sort GPS, Maps, 3 CTA | List statis, pay inline saja | Build baru |
| A6 Bayar | Bottom sheet | `TagihanPayCards` inline di card | Refactor ke sheet |
| Portal nav | Bottom nav 4 tab | Top horizontal nav + logout header | Ganti ke bottom nav di mobile/app |
| P6 Akun | Halaman profil + keluar | Belum ada route | **Route baru** `/portal/akun` |
| Diagnostik | Link dari Home/Akun | Tab nav utama | Turunkan prioritas nav |
| A2 Dashboard | Stat cards + quick links | Ada di `/dashboard` / `/isp` | Card view mobile |
| A3/A4 | Card list mobile | Tabel desktop | `MobileDataCard` breakpoint `< md` |
| Guards A9/P7 | Full-screen | Belum ada | Middleware / post-login check |

---

## Layar disetujui tanpa perubahan

- A0/A1 Login Admin (+ error superadmin)
- A1e Pesan superadmin ditolak
- A7 Drawer menu (reuse `app-shell.tsx`)
- P0/P1 Login OTP (2 step)
- P2 Home portal + CTA bayar besar
- P3 Tagihan list
- P4 Intro sebelum Duitku
- P5 Lapor gangguan
- Offline banner kolektor (A5)
- Toast sukses global

---

## Penyesuaian minor (catatan implementasi)

1. **Route pelanggan/tagihan:** Nav memakai `/dashboard/pelanggan` dan `/dashboard/tagihan` (sesuai `app-shell.tsx`); rewrite ke `/isp/*` tetap di proxy — wireframe route valid.

2. **Kolektor Cetak:** Tombol Cetak selalu visible di wireframe; boleh **disabled** jika belum ada pembayaran di sesi itu (opsional — konfirmasi saat dev jika perlu).

3. **Portal Akun:** Isi minimum v1: nama, HP, alamat, link paket, syarat & ketentuan, hubungi ISP, keluar.

4. **Double-tap back:** Hanya di root bottom-nav tab; di dalam form/modal back menutup layer dulu (sesuai wireframe).

5. **Mockup hi-fi:** Opsional — wireframe ASCII + keputusan ini cukup untuk mulai Fase 1.

---

## Checklist review per layar

| Layar | Disetujui | Catatan |
|-------|:---------:|---------|
| A1 Login | ✅ | |
| A2 Dashboard | ✅ | Stat cards OK |
| A3 Pelanggan | ✅ | Card + filter chips |
| A4 Tagihan | ✅ | Tab client-side |
| A5 Kolektor | ✅ | 3 CTA + GPS |
| A6 Bayar sheet | ✅ | Bottom sheet |
| A7 Drawer | ✅ | |
| A8 Tiket teknisi | ✅ | 3 tab nav |
| A9 Guard pelanggan | ✅ | Full-screen |
| P1 OTP | ✅ | |
| P2 Home | ✅ | Diagnostik link di bawah |
| P3 Tagihan | ✅ | |
| P4 Bayar intro | ✅ | |
| P5 Lapor | ✅ | |
| P6 Akun | ✅ | **Route baru** |
| P7 Guard staf | ✅ | Full-screen |

---

## Sign-off

| Peran | Nama | Tanggal | Status |
|-------|------|---------|--------|
| Product | (user) | 30 Jun 2026 | ✅ Approved |
| Development | — | 30 Jun 2026 | Ready for impl |
| Desain visual (Figma) | — | — | Deferred (opsional) |

---

## Langkah berikutnya

1. **Fase 1 implementasi** — urutan disarankan:
   - `MobileBottomNav` (role-aware)
   - Portal: bottom nav + halaman `/portal/akun`
   - Kolektor: GPS sort, Maps, bottom sheet bayar, tombol Cetak
   - `MobileDataCard` untuk pelanggan & tagihan
   - Full-screen app guards (A9/P7)
   - Double-tap back handler
2. QA internal dengan [android-qa-checklist.md](../../../android-qa-checklist.md)
3. Fase 2 Capacitor setelah web mobile stabil
