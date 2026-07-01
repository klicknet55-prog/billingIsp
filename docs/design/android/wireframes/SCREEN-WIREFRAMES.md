# Wireframe ASCII — NetManage Android v1

**Versi:** 1.0  
**Tanggal:** 30 Juni 2026  
**Viewport acuan:** 360 × 800 dp (portrait)  
**Status:** Starting point — review sebelum mockup hi-fi

Dokumen ini melengkapi [android-ui-ux-spec.md](../../../android-ui-ux-spec.md) dengan wireframe detail per layar, termasuk states utama.

Legenda:

```
[ Tombol ]     = tap target min 44dp tinggi
(···)          = teks placeholder / truncated
━━━            = divider
▓▓▓            = area sticky / fixed
░░░            = skeleton loading
[!]            = banner alert
```

---

## Screen map

| ID | App | Layar | Route | Prioritas |
|----|-----|-------|-------|-----------|
| A0 | Admin | Splash | — | Must |
| A1 | Admin | Login | `/login` | Must |
| A1e | Admin | Login error superadmin | `/login` | Must |
| A2 | Admin | Dashboard | `/dashboard` | Must |
| A3 | Admin | Pelanggan list | `/dashboard/pelanggan` | Must |
| A3d | Admin | Pelanggan detail | `/dashboard/pelanggan/[id]` | Should |
| A4 | Admin | Tagihan list | `/dashboard/tagihan` | Must |
| A5 | Admin | Kolektor tugas | `/kolektor` | Must |
| A6 | Admin | Bayar tunai (sheet) | modal | Must |
| A7 | Admin | Drawer menu | overlay | Must |
| A8 | Admin | Tiket teknisi | `/dashboard/tiket` | Should |
| A9 | Admin | Salah app (pelanggan) | guard | Must |
| P0 | Portal | Splash | — | Must |
| P1 | Portal | Login OTP | `/portal/login` | Must |
| P2 | Portal | Home | `/portal` | Must |
| P3 | Portal | Tagihan list | `/portal/tagihan` | Must |
| P4 | Portal | Bayar intro | `/portal/tagihan` | Must |
| P5 | Portal | Lapor gangguan | `/portal/lapor` | Should |
| P6 | Portal | Akun | `/portal/akun` | Should |
| P7 | Portal | Salah app (staf) | guard | Must |

---

## Komponen global (kedua app)

### Status bar + safe area

```
┌──────────────────────────────────────┐  ← status bar sistem (themed primary)
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │  ← 24dp (approx)
│                                      │
│           KONTEN SCROLL              │
│                                      │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │  ← bottom nav 56dp + safe-area inset
└──────────────────────────────────────┘
```

### Bottom nav — Admin (owner/admin)

```
┌────────┬────────┬────────┬────────┐
│  🏠    │  👥    │  📄    │  ☰     │
│Beranda │Pelanggan│Tagihan │ Menu   │
└────────┴────────┴────────┴────────┘
  ^aktif = primary color + label bold
```

### Bottom nav — Admin (kolektor)

```
┌──────────────────┬──────────────────┐
│       📋         │       👤         │
│      Tugas       │  Profil/Keluar   │
└──────────────────┴──────────────────┘
```

### Bottom nav — Portal

```
┌────────┬────────┬────────┬────────┐
│  🏠    │  📄    │  📢    │  👤    │
│Beranda │Tagihan │ Lapor  │  Akun  │
└────────┴────────┴────────┴────────┘
```

### Toast sukses (global)

```
                    ┌─────────────────────────┐
                    │ ✓ Pembayaran berhasil   │
                    └─────────────────────────┘
                              ↑ 3 detik, bottom 80dp
```

---

# NetManage Admin

## A0 — Splash

```
┌──────────────────────────────────────┐
│                                      │
│                                      │
│                                      │
│            ┌──────────┐              │
│            │  LOGO    │              │
│            │ NetManage│              │
│            └──────────┘              │
│                                      │
│         Admin ISP                    │  ← subtitle 14px muted
│                                      │
│              ◠ loading               │  ← spinner opsional
│                                      │
│                                      │
│  bg: #2563eb (primary)               │
│  logo + teks: putih                  │
└──────────────────────────────────────┘
```

**Durasi:** max 2 detik → WebView load `/login`

---

## A1 — Login (default)

```
┌──────────────────────────────────────┐
│                                      │
│            ┌──────────┐              │
│            │  LOGO    │              │
│            └──────────┘              │
│                                      │
│         Masuk Admin ISP              │  ← 20px semibold
│    Kelola pelanggan & tagihan        │  ← 14px muted
│                                      │
│  Email                               │  ← label 12px
│  ┌────────────────────────────────┐  │
│  │ admin@ispcontoh.com            │  │  ← input 44dp
│  └────────────────────────────────┘  │
│                                      │
│  Kata sandi                            │
│  ┌────────────────────────────────┐  │
│  │ ••••••••••              [👁]  │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │           Masuk                │  │  ← primary, full-width 48dp
│  └────────────────────────────────┘  │
│                                      │
│  Lupa kata sandi?                    │  ← link ke web / reset
│                                      │
└──────────────────────────────────────┘
```

**Interaksi:**
- Tap Masuk → loading state pada tombol (spinner + disabled)
- Sukses → redirect per role (`/dashboard` atau `/kolektor`)

---

## A1e — Login error superadmin

```
┌──────────────────────────────────────┐
│  ... (form login sama) ...           │
│                                      │
│  ┌────────────────────────────────┐  │
│  │ [!] Akun Super Admin tidak     │  │  ← destructive banner
│  │     didukung di aplikasi ini.  │  │
│  │     Gunakan browser desktop:   │  │
│  │     isp.tunnelhost.my.id       │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │      Buka di Browser         │  │  ← secondary, optional
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
```

---

## A1 — Login loading

```
│  ┌────────────────────────────────┐  │
│  │         ◠ Memproses...         │  │
│  └────────────────────────────────┘  │
```

---

## A2 — Dashboard home

```
┌──────────────────────────────────────┐
│  Halo, Pak Ahmad          [🔔]      │  ← header sticky
│  ISP Contoh Net                      │
├──────────────────────────────────────┤
│                                      │
│  ┌─────────────┐ ┌─────────────┐    │
│  │ Pelanggan   │ │ Tagihan     │    │  ← stat cards 2 kolom
│  │    128      │ │  23 belum   │    │
│  │   aktif     │ │    lunas    │    │
│  └─────────────┘ └─────────────┘    │
│                                      │
│  ┌─────────────┐ ┌─────────────┐    │
│  │ Tiket open  │ │ Pemasukan   │    │
│  │      5      │ │  Rp 12,4 jt │    │
│  │             │ │  bulan ini  │    │
│  └─────────────┘ └─────────────┘    │
│                                      │
│  Akses cepat                         │  ← section 16px semibold
│  ┌────────────────────────────────┐  │
│  │ + Tambah pelanggan          >  │  │
│  ├────────────────────────────────┤  │
│  │ Lihat tagihan belum lunas   >  │  │
│  ├────────────────────────────────┤  │
│  │ Tiket gangguan              >  │  │
│  └────────────────────────────────┘  │
│                                      │
├──────────────────────────────────────┤
│ ▓ Beranda │ Pelanggan │ Tagihan │☰ ▓│
└──────────────────────────────────────┘
```

**Loading state:** 4 skeleton cards `░░░░`

**Empty (tenant baru):** kartu onboarding "Belum ada pelanggan" + CTA tambah

---

## A3 — Pelanggan list

```
┌──────────────────────────────────────┐
│  Pelanggan                    [+]    │  ← + = tambah pelanggan
├──────────────────────────────────────┤
│  ┌────────────────────────────────┐  │
│  │ 🔍 Cari nama, HP, alamat...    │  │  ← search sticky
│  └────────────────────────────────┘  │
│                                      │
│  [ Semua ] [ Aktif ] [ Isolir ] [BL] │  ← filter chips horizontal scroll
│                                      │
│  ┌────────────────────────────────┐  │
│  │ Budi Santoso          [Aktif] │  │  ← badge hijau
│  │ 081234567890                   │  │
│  │ Paket 20 Mbps · ODP-A Port 3   │  │
│  │ Tagihan: Belum lunas           │  │  ← warning color
│  │              [ Lihat detail ]  │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │ Siti Aminah          [Isolir] │  │  ← badge merah
│  │ 081298765432                   │  │
│  │ Paket 10 Mbps                  │  │
│  │ Tunggakan: Rp 150.000          │  │
│  │              [ Lihat detail ]  │  │
│  └────────────────────────────────┘  │
│                                      │
│  ... scroll ...                      │
├──────────────────────────────────────┤
│ ▓ Beranda │ Pelanggan │ Tagihan │☰ ▓│
└──────────────────────────────────────┘
```

**Empty state:**

```
│         ( ilustrasi kosong )         │
│      Belum ada pelanggan             │
│  [ + Tambah pelanggan pertama ]      │
```

**Error state:**

```
│  [!] Gagal memuat data. [Coba lagi]  │
```

---

## A3d — Pelanggan detail

```
┌──────────────────────────────────────┐
│  ←  Budi Santoso                     │
├──────────────────────────────────────┤
│  ┌────────────────────────────────┐  │
│  │ Status: Aktif                  │  │
│  │ Paket: 20 Mbps — Rp 200.000/bln │  │
│  │ Jatuh tempo: tgl 28 setiap bulan│  │
│  └────────────────────────────────┘  │
│                                      │
│  Kontak                              │
│  ┌────────────────────────────────┐  │
│  │ HP: 081234567890    [📞][💬]   │  │
│  │ Alamat: Jl. Mawar No. 5, RT 02│  │
│  │ ODP: ODP-A · Port 3            │  │
│  └────────────────────────────────┘  │
│                                      │
│  Tagihan terakhir                    │
│  ┌────────────────────────────────┐  │
│  │ Juni 2026 · Belum lunas        │  │
│  │ Rp 200.000                     │  │
│  │         [ Bayar ] [ Detail ]   │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │      Edit pelanggan            │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
```

---

## A4 — Tagihan list

```
┌──────────────────────────────────────┐
│  Tagihan                             │
├──────────────────────────────────────┤
│  ┌──────────┬──────────┬──────────┐  │
│  │Belum lunas│Tunggakan │  Semua  │  │  ← tab, 1 tap switch
│  └──────────┴──────────┴──────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │ Budi Santoso                   │  │
│  │ Periode: Juni 2026             │  │
│  │ Rp 200.000 · Jatuh 28 Jun      │  │
│  │ [ Belum lunas ]                │  │
│  │     [ Bayar ]    [ Detail ]    │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │ Siti Aminah                    │  │
│  │ Tunggakan 2 bulan              │  │
│  │ Rp 300.000                     │  │
│  │ [ Tunggakan ]                  │  │
│  │     [ Bayar ]    [ Detail ]    │  │
│  └────────────────────────────────┘  │
│                                      │
├──────────────────────────────────────┤
│ ▓ Beranda │ Pelanggan │ Tagihan │☰ ▓│
└──────────────────────────────────────┘
```

**Tab aktif:** underline primary + teks bold

---

## A5 — Kolektor tugas (online)

```
┌──────────────────────────────────────┐
│  Tugas penagihan          [↻]       │  ← refresh
├──────────────────────────────────────┤
│  12 pelanggan menunggak              │  ← summary bar
│  Sort: [ Terdekat ▼ ]  [ Nama ▼ ]   │  ← dropdown / chip
├──────────────────────────────────────┤
│  ┌────────────────────────────────┐  │
│  │ Siti Aminah            1.2 km  │  │  ← jarak kanan
│  │ Jl. Mawar No. 5, RT 02         │  │
│  │ Tunggakan: Rp 150.000          │  │
│  │                                │  │
│  │ ┌──────┐ ┌──────┐ ┌──────┐    │  │
│  │ │ Maps │ │ Bayar│ │Cetak │    │  │  ← 3 CTA sama lebar
│  │ └──────┘ └──────┘ └──────┘    │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │ Ahmad Rizki            2.8 km  │  │
│  │ Jl. Melati 12                  │  │
│  │ Bulan ini: Rp 200.000          │  │
│  │ ┌──────┐ ┌──────┐ ┌──────┐    │  │
│  │ │ Maps │ │ Bayar│ │Cetak │    │  │
│  │ └──────┘ └──────┘ └──────┘    │  │
│  └────────────────────────────────┘  │
│                                      │
├──────────────────────────────────────┤
│ ▓      Tugas       │   Profil      ▓│
└──────────────────────────────────────┘
```

---

## A5 — Kolektor offline

```
┌──────────────────────────────────────┐
│ [!] Mode offline — data terakhir     │  ← warning banner sticky
│     diperbarui 10:32 WIB             │
├──────────────────────────────────────┤
│  ... (list sama, read-only) ...      │
│                                      │
│  Tombol Bayar: disabled + tooltip    │
│  "Perlu koneksi internet"            │
└──────────────────────────────────────┘
```

---

## A5 — GPS ditolak

```
┌──────────────────────────────────────┐
│ [!] Izin lokasi ditolak. Sort        │
│     menggunakan urutan nama.         │
│     [ Buka Pengaturan ]              │
├──────────────────────────────────────┤
│  ... list tanpa jarak km ...         │
└──────────────────────────────────────┘
```

---

## A5 — Empty (semua lunas)

```
│         ( ilustrasi centang )        │
│    Semua tagihan sudah lunas!        │
│         Kerja bagus 👍               │
```

---

## A6 — Bayar tunai (bottom sheet)

```
┌──────────────────────────────────────┐
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │  ← backdrop gelap
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
├──────────────────────────────────────┤
│  ───  (drag handle)                  │
│                                      │
│  Catat pembayaran tunai              │  ← 18px semibold
│  Siti Aminah                         │  ← 14px muted
│                                      │
│  Pilih tagihan                       │
│  ┌────────────────────────────────┐  │
│  │ ( ) Bulan ini — Rp 200.000     │  │
│  ├────────────────────────────────┤  │
│  │ (•) Tunggakan — Rp 150.000     │  │  ← radio selected
│  ├────────────────────────────────┤  │
│  │ ( ) Keduanya — Rp 350.000      │  │
│  └────────────────────────────────┘  │
│                                      │
│  Catatan (opsional)                  │
│  ┌────────────────────────────────┐  │
│  │                                │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │   Konfirmasi Rp 150.000        │  │  ← primary 48dp
│  └────────────────────────────────┘  │
│  [ Batal ]                           │
└──────────────────────────────────────┘
```

**Setelah konfirmasi sukses:**

```
│  Toast: ✓ Pembayaran tercatat        │
│  Sheet tutup, card pelanggan update  │
│  CTA Cetak aktif                     │
```

---

## A6 — Cetak struk (Bluetooth)

```
┌──────────────────────────────────────┐
│  Cetak struk                    ✕    │
├──────────────────────────────────────┤
│  Printer: [ Pilih printer ▼ ]        │
│                                      │
│  Preview struk:                      │
│  ┌────────────────────────────────┐  │
│  │ === ISP CONTOH NET ===         │  │
│  │ Bukti Pembayaran               │  │
│  │ Siti Aminah                    │  │
│  │ Rp 150.000                     │  │
│  │ 30/06/2026 10:45               │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │        Cetak sekarang          │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
```

**BT ditolak / gagal:**

```
│  [!] Bluetooth tidak tersedia.       │
│      [ Buka Pengaturan ]             │
```

---

## A7 — Drawer menu (owner/admin)

```
┌──────────────────┬───────────────────┐
│                  │ ✕  Menu ISP       │
│   (konten        ├───────────────────┤
│    redup 50%)    │ 🏠 Beranda        │
│                  │ 👥 Pelanggan      │
│                  │ 📄 Tagihan        │
│                  │ 📦 Paket          │
│                  │ 🌐 Router         │
│                  │ 🗺️ ODP Peta       │
│                  │ 🎫 Tiket          │
│                  │ 💰 Keuangan       │
│                  │ ⚙️ Pengaturan     │
│                  ├───────────────────┤
│                  │ 👤 Pak Ahmad      │
│                  │    owner           │
│                  │ [ Keluar ]         │
└──────────────────┴───────────────────┘
```

Slide dari kanan atau kiri — konsisten dengan `app-shell.tsx` existing.

---

## A8 — Tiket teknisi

```
┌──────────────────────────────────────┐
│  Tiket gangguan                      │
├──────────────────────────────────────┤
│  [ Open ] [ Proses ] [ Selesai ]     │  ← filter chips
│                                      │
│  ┌────────────────────────────────┐  │
│  │ #1042 · Internet lambat        │  │
│  │ Budi Santoso · 2 jam lalu      │  │
│  │ [ Open ]                       │  │
│  │    [ Ambil tiket ]             │  │
│  └────────────────────────────────┘  │
│                                      │
├──────────────────────────────────────┤
│ ▓ Tiket │ Beranda │ Menu ▓           │
└──────────────────────────────────────┘
```

---

## A9 — Salah app (pelanggan login di Admin)

```
┌──────────────────────────────────────┐
│                                      │
│            ┌──────────┐              │
│            │   📱     │              │
│            └──────────┘              │
│                                      │
│   Akun pelanggan tidak bisa          │
│   digunakan di NetManage Admin       │
│                                      │
│   Unduh aplikasi NetManage Portal    │
│   untuk cek tagihan dan bayar.       │
│                                      │
│  ┌────────────────────────────────┐  │
│  │    Buka NetManage Portal       │  │  ← deep link / Play Store nanti
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │         Kembali login          │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
```

---

# NetManage Portal

## P0 — Splash

```
┌──────────────────────────────────────┐
│                                      │
│            ┌──────────┐              │
│            │  LOGO    │              │
│            └──────────┘              │
│                                      │
│         NetManage Portal             │
│    Cek tagihan · Bayar · Lapor       │  ← tagline ramah
│                                      │
│  bg: gradien primary lebih terang    │
└──────────────────────────────────────┘
```

---

## P1 — Login OTP (step 1: nomor HP)

```
┌──────────────────────────────────────┐
│                                      │
│            ┌──────────┐              │
│            │  LOGO    │              │
│            └──────────┘              │
│                                      │
│      Masuk ke Portal Pelanggan       │
│   Gunakan nomor WhatsApp terdaftar   │
│                                      │
│  Nomor WhatsApp                      │
│  ┌──────┬─────────────────────────┐  │
│  │ +62  │ 81234567890             │  │  ← prefix fixed
│  └──────┴─────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │         Kirim OTP              │  │
│  └────────────────────────────────┘  │
│                                      │
│  Kode OTP dikirim via WhatsApp       │  ← 12px muted
│                                      │
└──────────────────────────────────────┘
```

---

## P1 — Login OTP (step 2: masukkan kode)

```
┌──────────────────────────────────────┐
│  ←                                   │
│                                      │
│  Masukkan kode OTP                   │
│  Dikirim ke 0812***7890              │
│                                      │
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐│
│  │ 4 │ │ 8 │ │ _ │ │ _ │ │ _ │ │ _ ││  ← 6 digit, auto-focus
│  └───┘ └───┘ └───┘ └───┘ └───┘ └───┘│
│                                      │
│  Kirim ulang dalam 00:45             │  ← countdown
│                                      │
│  ┌────────────────────────────────┐  │
│  │           Verifikasi           │  │
│  └────────────────────────────────┘  │
│                                      │
│  Salah nomor? [ Ubah nomor ]         │
└──────────────────────────────────────┘
```

**Error OTP salah:**

```
│  [!] Kode tidak valid. Coba lagi.    │
```

---

## P2 — Home portal

```
┌──────────────────────────────────────┐
│  Halo, Budi 👋                       │
│  ISP Contoh Net                      │
├──────────────────────────────────────┤
│  ┌────────────────────────────────┐  │
│  │ Langganan Anda                 │  │
│  │ Paket 20 Mbps                  │  │
│  │ Status: ● Aktif                │  │
│  │ Berlaku s/d 28 Jul 2026        │  │
│  └────────────────────────────────┘  │
│                                      │
│  Tagihan berjalan                    │
│  ┌────────────────────────────────┐  │
│  │ Juni 2026                      │  │
│  │ Rp 200.000                     │  │
│  │ Jatuh tempo: 28 Juni 2026      │  │
│  │ [ Belum lunas ]                │  │
│  │                                │  │
│  │  ┌──────────────────────────┐  │  │
│  │  │    Bayar Sekarang        │  │  │  ← CTA besar 52dp
│  │  └──────────────────────────┘  │  │
│  └────────────────────────────────┘  │
│                                      │
│  Butuh bantuan?                      │
│  ┌────────────────────────────────┐  │
│  │ 📢 Laporkan gangguan        >  │  │
│  ├────────────────────────────────┤  │
│  │ 🔧 Cek koneksi              >  │  │
│  └────────────────────────────────┘  │
│                                      │
├──────────────────────────────────────┤
│ ▓ Beranda │ Tagihan │ Lapor │ Akun ▓│
└──────────────────────────────────────┘
```

**Sudah lunas:**

```
│  │ Juni 2026 · Rp 200.000         │  │
│  │ [ ✓ Lunas ]                    │  │
│  │  (tombol bayar hidden)         │  │
```

---

## P3 — Tagihan list

```
┌──────────────────────────────────────┐
│  Riwayat tagihan                     │
├──────────────────────────────────────┤
│  ┌────────────────────────────────┐  │
│  │ Juni 2026          Belum lunas │  │
│  │ Rp 200.000                     │  │
│  │ Jatuh: 28 Jun        [ Bayar ] │  │
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │ Mei 2026                Lunas  │  │
│  │ Rp 200.000                     │  │
│  │ Dibayar 25 Mei       [ Detail ]│  │
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │ April 2026              Lunas  │  │
│  │ ...                            │  │
│  └────────────────────────────────┘  │
├──────────────────────────────────────┤
│ ▓ Beranda │ Tagihan │ Lapor │ Akun ▓│
└──────────────────────────────────────┘
```

---

## P4 — Bayar Duitku (intro sebelum redirect)

```
┌──────────────────────────────────────┐
│  ←  Pembayaran                       │
├──────────────────────────────────────┤
│                                      │
│         ┌──────────────┐             │
│         │  💳 QRIS/VA  │             │
│         └──────────────┘             │
│                                      │
│  Anda akan diarahkan ke halaman      │
│  pembayaran aman (Duitku).           │
│                                      │
│  Setelah pembayaran selesai,         │
│  kembali ke aplikasi ini untuk       │
│  melihat status tagihan.             │
│                                      │
│  ┌────────────────────────────────┐  │
│  │ Tagihan: Juni 2026             │  │
│  │ Total: Rp 200.000              │  │
│  └────────────────────────────────┘  │
│                                      │
│  ● Tagihan  →  ● Bayar  →  ○ Selesai │  ← stepper
│                                      │
│  ┌────────────────────────────────┐  │
│  │   Lanjutkan Pembayaran         │  │
│  └────────────────────────────────┘  │
│                                      │
└──────────────────────────────────────┘
```

**Setelah return dari Duitku:**

```
│  ✓ Pembayaran berhasil!              │
│  Tagihan Juni 2026 lunas.            │
│  [ Lihat riwayat ]                   │
```

---

## P5 — Lapor gangguan

```
┌──────────────────────────────────────┐
│  ←  Laporkan gangguan                │
├──────────────────────────────────────┤
│  Jenis masalah                       │
│  ┌────────────────────────────────┐  │
│  │ Internet tidak bisa connect ▼  │  │
│  └────────────────────────────────┘  │
│                                      │
│  Keterangan                          │
│  ┌────────────────────────────────┐  │
│  │ Lampu LOS menyala merah sejak  │  │
│  │ pagi...                        │  │
│  │                                │  │
│  └────────────────────────────────┘  │
│                                      │
│  Foto (opsional)                     │
│  ┌──────┐ ┌──────┐                   │
│  │ [+]  │ │ thumb│                   │  ← max 3 foto
│  └──────┘ └──────┘                   │
│                                      │
│  ┌────────────────────────────────┐  │
│  │         Kirim laporan          │  │
│  └────────────────────────────────┘  │
├──────────────────────────────────────┤
│ ▓ Beranda │ Tagihan │ Lapor │ Akun ▓│
└──────────────────────────────────────┘
```

**Sukses:** toast + redirect ke daftar tiket / home

---

## P6 — Akun

```
┌──────────────────────────────────────┐
│  Akun saya                           │
├──────────────────────────────────────┤
│  ┌────────────────────────────────┐  │
│  │  BS   Budi Santoso             │  │  ← avatar inisial
│  │       081234567890             │  │
│  │       Jl. Mawar No. 5          │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │ Paket & langganan           >  │  │
│  ├────────────────────────────────┤  │
│  │ Syarat & ketentuan          >  │  │
│  ├────────────────────────────────┤  │
│  │ Hubungi ISP                 >  │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │           Keluar               │  │  ← destructive outline
│  └────────────────────────────────┘  │
│                                      │
│  Versi app 1.0.0                     │
├──────────────────────────────────────┤
│ ▓ Beranda │ Tagihan │ Lapor │ Akun ▓│
└──────────────────────────────────────┘
```

---

## P7 — Salah app (staf login di Portal)

```
┌──────────────────────────────────────┐
│                                      │
│            ┌──────────┐              │
│            │   🛠️     │              │
│            └──────────┘              │
│                                      │
│   Akun staf tidak bisa digunakan     │
│   di NetManage Portal                │
│                                      │
│   Untuk mengelola ISP, gunakan       │
│   aplikasi NetManage Admin.          │
│                                      │
│  ┌────────────────────────────────┐  │
│  │    Buka NetManage Admin        │  │
│  └────────────────────────────────┘  │
│  ┌────────────────────────────────┐  │
│  │         Kembali login          │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
```

---

## Back button — konfirmasi keluar

```
┌──────────────────────────────────────┐
│                                      │
│     Keluar dari aplikasi?            │
│                                      │
│  ┌─────────────┐ ┌─────────────┐    │
│  │   Batal     │ │    Keluar   │    │
│  └─────────────┘ └─────────────┘    │
│                                      │
└──────────────────────────────────────┘
```

Atau toast: "Tekan lagi untuk keluar" (double-tap back di root tab).

---

## Review checklist

**Review selesai** — lihat keputusan lengkap di [REVIEW-NOTES.md](REVIEW-NOTES.md).

| Layar | Jelas? | Perlu ubah? | Catatan |
|-------|:------:|:-----------:|---------|
| A1 Login | ✅ | — | |
| A2 Dashboard | ✅ | — | |
| A3 Pelanggan | ✅ | — | |
| A4 Tagihan | ✅ | — | |
| A5 Kolektor | ✅ | — | 3 CTA disetujui |
| A6 Bayar tunai | ✅ | — | Bottom sheet |
| P1 OTP | ✅ | — | |
| P2 Home | ✅ | — | Diagnostik → link, bukan tab |
| P3 Tagihan | ✅ | — | |
| P4 Bayar intro | ✅ | — | |
| P5 Lapor | ✅ | — | |
| P6 Akun | ✅ | — | Route baru |
| Guards salah app | ✅ | — | Full-screen |

**Sign-off wireframe:**

| Peran | Nama | Tanggal |
|-------|------|---------|
| Product | Approved | 30 Jun 2026 |
| Kolektor (user test) | — | Validasi lapangan opsional |
| Pelanggan (user test) | — | Validasi lapangan opsional |

---

## Langkah berikutnya

1. Review wireframe ini dengan 1 owner + 1 kolektor
2. Catat perubahan di kolom Review checklist
3. Lanjut mockup hi-fi (Figma) — reuse token di [android-ui-ux-spec.md](../../../android-ui-ux-spec.md) §1
4. Setelah sign-off → implementasi Fase 1 web mobile hardening
