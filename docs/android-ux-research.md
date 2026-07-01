# Riset UX — Aplikasi Android NetManage

**Versi:** 1.0  
**Tanggal:** 30 Juni 2026  
**Metode:** Audit codebase web v1.0.0 + analisis PRD operasional lapangan

Dokumen ini menjadi dasar prioritas layar dan pain point sebelum wireframe/mockup. Validasi lapangan (wawancara kolektor) direkomendasikan sebelum sign-off desain.

---

## 1. Konteks pengguna

| Persona | Konteks penggunaan | Device tipikal | Koneksi |
|---------|-------------------|----------------|---------|
| Kolektor | Jalan kaki/motor, penagihan tunai | Android menengah, 5–6" | 4G tidak stabil |
| Teknisi | Kunjungan lapangan, update tiket | Android menengah | 4G |
| Owner / admin | Pantau operasional di luar kantor | Android / iPhone | WiFi / 4G |
| Pelanggan | Cek tagihan, bayar, lapor gangguan | Android entry–mid | 4G / WiFi |

---

## 2. Pain points (dari audit web mobile saat ini)

### Kolektor (`/kolektor`)

| # | Pain point | Severity | Bukti codebase |
|---|------------|----------|----------------|
| P1 | Tidak ada sort berdasarkan jarak GPS | Tinggi | PRD menyebut GPS sort; halaman saat ini list statis |
| P2 | Tidak ada tombol navigasi Maps/Waze satu ketuk | Tinggi | Belum di `kolektor/page.tsx` |
| P3 | Offline hanya shell dasar SW | Sedang | `public/sw.js` cache `/kolektor` tanpa data tugas |
| P4 | Cetak Bluetooth belum teruji di WebView | Tinggi | `src/lib/print/thermal.ts` — Web Bluetooth |
| P5 | Kartu pelanggan padat, CTA kecil di layar kecil | Sedang | Perlu audit touch target |

### Owner / admin (`/dashboard/*`)

| # | Pain point | Severity | Bukti |
|---|------------|----------|-------|
| P6 | Tabel lebar (pelanggan, tagihan) sulit di HP | Tinggi | Banyak `Table` tanpa card view mobile |
| P7 | Sidebar drawer ada, tapi menu dalam banyak | Sedang | `app-shell.tsx` |
| P8 | Tab filter tagihan sudah diperbaiki client-side | Rendah | `QueryTabNav` mode client |

### Portal (`/portal/*`)

| # | Pain point | Severity | Bukti |
|---|------------|----------|-------|
| P9 | Alur OTP harus jelas di layar kecil | Sedang | `portal/login` |
| P10 | Redirect Duitku bisa membingungkan user | Tinggi | Perlu in-app browser + copy instruksi |
| P11 | Tidak ada bottom nav — navigasi kurang native-feel | Sedang | `portal-nav.tsx` horizontal |

### Umum

| # | Pain point | Severity |
|---|------------|----------|
| P12 | Manifest icon kecil (belum 512) | Sedang |
| P13 | Dua persona bisa login di app yang salah | Sedang |

---

## 3. Prioritas layar (MoSCoW)

### Admin App

| Layar | Must | Should | Could | Won't v1 |
|-------|:----:|:------:|:-----:|:--------:|
| Login staf | x | | | |
| Dashboard home | x | | | |
| Pelanggan (card) | x | | | |
| Tagihan (card + tab) | x | | | |
| Kolektor tugas + GPS | x | | | |
| Bayar tunai + struk | x | | | |
| Tiket list + update | | x | | |
| Peta ODP | | | x | |
| Laporan keuangan | | | | x |
| Superadmin | | | | x |

### Portal App

| Layar | Must | Should | Could |
|-------|:----:|:------:|:-----:|
| Login OTP | x | | |
| Home ringkasan | x | | |
| Daftar tagihan | x | | |
| Bayar Duitku | x | | |
| Lapor gangguan | | x | |
| Diagnostik | | | x |
| Nota detail | | x | |

---

## 4. Task flow prioritas

### Flow A — Kolektor bayar tunai (kritis)

1. Buka Admin app → login
2. Lihat daftar pelanggan menunggak (sort terdekat)
3. Tap **Navigasi** → Maps/Waze
4. Tap **Bayar** → pilih bulan ini / tunggakan
5. Konfirmasi → sistem catat + aktifkan isolir jika perlu
6. Tap **Cetak** → printer Bluetooth
7. Toast sukses

**Titik kegagalan:** offline (step 4–5), Bluetooth (step 6), GPS ditolak (step 2 sort).

### Flow B — Pelanggan bayar mandiri (kritis)

1. Buka Portal app → login OTP
2. Home → lihat tagihan belum lunas
3. Tap **Bayar** → Duitku
4. Selesai bayar → kembali ke app
5. Status **Lunas** + notifikasi WA (server)

**Titik kegagalan:** user tidak kembali ke app setelah Duitku (step 4).

---

## 5. Rekomendasi UX (ringkas)

1. **Bottom navigation** untuk Admin (role-aware) dan Portal.
2. **Card pattern** menggantikan tabel di breakpoint `< md`.
3. **Kolektor task card** dengan 3 CTA jelas: Navigasi | Bayar | Cetak.
4. **Empty / offline states** eksplisit dengan ilustrasi ringan.
5. **Portal pay flow** — banner "Setelah bayar, kembali ke aplikasi" sebelum redirect Duitku.
6. **App guard** — pesan ramah jika login role salah.

---

## 6. Validasi lapangan (TODO)

Checklist wawancara 2–3 kolektor:

- [ ] Berapa pelanggan ditagih per hari?
- [ ] Area mana sinyal paling lemah?
- [ ] Printer Bluetooth merk/model apa?
- [ ] Apakah perlu lihat peta atau cukup alamat teks?
- [ ] Fitur apa yang paling sering dipakai di HP?

Catatan wawancara: _(isi setelah sesi)_

---

## 7. Referensi

- [prd-android-v1.md](prd-android-v1.md)
- [android-ui-ux-spec.md](android-ui-ux-spec.md)
- Kode: `src/app/kolektor/`, `src/app/portal/`, `src/components/layout/app-shell.tsx`
