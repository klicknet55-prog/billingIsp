"use client";

export function OfflineBanner({ lastSync }: { lastSync: Date | null }) {
  const label = lastSync
    ? lastSync.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
    : "belum diketahui";

  return (
    <div
      className="mb-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-100"
      role="status"
    >
      Mode offline — data terakhir diperbarui {label} WIB. Pembayaran membutuhkan koneksi
      internet.
    </div>
  );
}
