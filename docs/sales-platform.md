# Sales Platform

## Fitur

- Superadmin membuat akun sales, menetapkan fee 0-100%, menonaktifkan akses, dan mengganti kode referral.
- Sales membagikan tautan `/register-tenant?sales=SA-XXXXXX` atau calon tenant memasukkan kode sales pada form.
- Superadmin dapat mengatribusikan tenant secara manual setelah konfirmasi dan wajib menulis alasan. Perubahan mencatat sales lama/baru, aktor, waktu, dan alasan.
- Komisi dicatat ketika pembayaran langganan/upgrade SaaS sukses, tidak ketika transaksi masih pending/gagal atau renewal Free melalui donasi.
- Setiap payment log menyimpan sales dan tarif fee dalam basis points sebagai snapshot. Perubahan fee/atribusi tidak mengubah transaksi yang sudah dibuat.
- Ledger menggunakan ID payment gateway unik agar callback berulang tidak menggandakan komisi.
- Sales dapat mengajukan pencairan gabungan atas seluruh saldo komisi tersedia dan menyertakan tujuan transfer. Komisi yang sedang menunggu persetujuan dicadangkan agar tidak diajukan dua kali.
- Superadmin menyetujui atau menolak permintaan; setelah transfer dilakukan, superadmin mencatat referensi pembayaran untuk membayar seluruh komisi dalam permintaan tersebut.
- Refund sebelum pencairan membatalkan komisi payable; refund setelah pencairan membuat penyesuaian negatif untuk pencairan selanjutnya.
- Program referral tenant tetap terpisah dari kode referral sales.

## Migrasi dan deployment

Jalankan `npm run db:migrate` setelah mengambil perubahan kode dan sebelum build/restart. Perintah ini memilih database dari `DATABASE_DRIVER`:

- SQLite: menjalankan `src/lib/db/ensure-schema.ts`, yang menerapkan migrasi runtime secara idempotent.
- PostgreSQL: menerapkan migrasi bernomor di `drizzle/pg/` menggunakan Drizzle.

Deploy dashboard juga menjalankan langkah migrasi tersebut sebelum build. Jangan menghapus migrasi yang sudah dipakai. Untuk perubahan skema berikutnya, ubah kedua schema Drizzle, tambahkan patch SQLite yang idempotent, buat migrasi PostgreSQL bernomor berikutnya, lalu perbarui journal PostgreSQL.

Contoh pengecekan manual:

```powershell
npm run db:migrate
npm run typecheck
npm run build
```

Sebelum migrasi produksi, buat backup database. Jika migrasi PostgreSQL gagal, deploy berhenti sebelum build/restart; periksa output perintah dan log deploy. SQLite melaporkan perubahan schema di output `db:ensure-schema`.

## Troubleshooting

- **Kode sales tidak valid:** pastikan akun dan profil aktif; cek `sales_profile.referral_code` dan status akun di menu Tim Sales.
- **Tenant tidak terlihat di dashboard sales:** cek `tenant_sales_attribution` dan `sales_attribution_audit`. Atribusi manual yang baru hanya berlaku pada transaksi yang dibuat sesudahnya.
- **Komisi belum muncul:** periksa status dan nominal di `payment_gateway_log`; hanya payment log `subscription` dengan status `success` dan nominal positif yang dapat menghasilkan komisi.
- **Komisi duplikat:** unique index `sales_commission_payment_unique` menahan callback ulang berdasarkan payment log sumber.
- **Nilai fee berbeda dari tarif sekarang:** ledger menggunakan `commission_rate_bps` pada payment log saat transaksi dibuat dan menyimpan ulang nilai tersebut ke komisi.
- **Refund:** lakukan pembalikan dari ledger superadmin dengan alasan/refund reference. Pastikan penyesuaian negatif dibukukan pada payout berikutnya bila komisi sudah dibayar.
- **Permintaan pencairan tertahan:** tinjau atau tolak permintaan di menu Tim Sales. Penolakan melepaskan kembali komisi yang dicadangkan agar bisa diajukan ulang.

Fee tersimpan dalam basis points (100 bps = 1%) agar perhitungan konsisten di SQLite dan PostgreSQL. Nilai rupiah komisi dibulatkan ke bilangan rupiah terdekat.

## Retensi data

- Data teknis dan operasional yang sudah selesai serta data billing berstatus terminal dan berusia lebih dari 2 tahun dijadwalkan untuk diarsipkan lalu dihapus setiap tahun pada **28 Januari**. Cutoff-nya adalah 28 Januari dua tahun sebelumnya, mengikuti `APP_TIMEZONE`.
- Job retensi dipanggil dari endpoint cron harian. Pada 23–27 Januari sistem mengirim pemberitahuan WhatsApp H-5 ke nomor owner aktif tenant yang datanya terdampak; kegagalan pengiriman dicoba ulang selama jendela tersebut.
- Pada atau setelah 28 Januari, setiap tenant hanya diproses bila notifikasi WhatsApp berhasil tercatat dan arsip gzip berhasil dibuat di `data/backups/tenant/<tenant-id>/retention/`. Job purge yang gagal dicoba ulang pada pemanggilan cron berikutnya. Jika arsip gagal, data tidak dihapus.
- Log teknis, tiket resolved, batch impor/pesan selesai, dan transaksi pembayaran terminal dapat dipurge. Data pelanggan beserta paket internet tidak dihapus. Tenant, akun, template, saldo komisi yang belum dibayar, invoice/tagihan belum lunas, tiket belum selesai, pembayaran pending, dan data yang masih dirujuk juga dipertahankan.
- Invoice/tagihan dan ledger komisi yang dihapus tetap tersedia pada arsip. Total historis komisi sales yang sudah dibayar dipertahankan sebagai ringkasan agar saldo total di dashboard tidak turun.
- Jadwalkan `GET /api/cron` setiap hari pukul tetap dan pastikan `CRON_SECRET` diteruskan. Jika Redis digunakan, worker queue harus aktif. Kalender retensi mengikuti `APP_TIMEZONE`; jadwal tahunan tidak mengubah frekuensi cron harian untuk billing dan reminder.
- Arsip berisi data tenant dan transaksi; lindungi direktori backup dengan akses server yang sesuai dan kebijakan backup eksternal. Hanya periode tahunan yang tercatat dengan format tahun empat digit yang diproses; job bulanan lama tidak otomatis dijalankan oleh jadwal baru.
