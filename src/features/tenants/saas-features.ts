/** Label & deskripsi fitur paket SaaS (kunci dari `limitasi.fitur`). */
export const SAAS_FEATURE_CATALOG: Record<string, { label: string; description: string }> = {
  pelanggan: {
    label: "Manajemen pelanggan",
    description: "Data pelanggan, paket internet, jatuh tempo, dan koordinat lokasi.",
  },
  invoice: {
    label: "Billing & invoice",
    description: "Generate tagihan otomatis, reminder WhatsApp, dan status pembayaran.",
  },
  tiket: {
    label: "Helpdesk tiket",
    description: "Terima laporan gangguan pelanggan dan tetapkan teknisi.",
  },
  api_mikrotik: {
    label: "Integrasi Mikrotik",
    description: "Kontrol router, isolasi/aktivasi pelanggan otomatis via API.",
  },
  laporan_keuangan: {
    label: "Laporan keuangan",
    description: "Pemasukan, pengeluaran, laba rugi, dan ekspor laporan.",
  },
  portal_pelanggan: {
    label: "Portal pelanggan",
    description: "Pelanggan cek tagihan, bayar online, dan lapor gangguan mandiri.",
  },
  kolektor: {
    label: "Aplikasi kolektor",
    description: "Tugas penagihan lapangan, navigasi, dan catat pembayaran tunai.",
  },
  peta: {
    label: "Peta & ODP",
    description: "Pemetaan pelanggan dan infrastruktur jaringan di peta.",
  },
  whatsapp: {
    label: "Notifikasi WhatsApp",
    description: "Kirim tagihan, reminder, dan OTP ke pelanggan via WhatsApp.",
  },
  payment_gateway: {
    label: "Payment gateway",
    description: "Terima pembayaran online pelanggan (QRIS, VA, e-wallet).",
  },
};

export function formatSaasFeatureKey(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function getSaasFeatureInfo(key: string): { label: string; description: string } {
  const known = SAAS_FEATURE_CATALOG[key];
  if (known) return known;
  return {
    label: formatSaasFeatureKey(key),
    description: "Termasuk dalam paket langganan Anda.",
  };
}
