/** Label & deskripsi fitur paket SaaS (kunci dari `limitasi.fitur`). */

export const SAAS_INTEGRATION_FEATURE_KEYS = [
  "whatsapp",
  "payment_gateway",
  "vpn_mikrotik",
] as const;

export type SaasIntegrationFeatureKey = (typeof SAAS_INTEGRATION_FEATURE_KEYS)[number];

export const SAAS_MODULE_FEATURE_KEYS = [
  "pelanggan",
  "invoice",
  "tiket",
  "api_mikrotik",
  "laporan_keuangan",
  "portal_pelanggan",
  "kolektor",
  "peta",
] as const;

export type SaasModuleFeatureKey = (typeof SAAS_MODULE_FEATURE_KEYS)[number];

export const SAAS_ALL_FEATURE_KEYS = [
  ...SAAS_MODULE_FEATURE_KEYS,
  ...SAAS_INTEGRATION_FEATURE_KEYS,
] as const;

export type SaasFeatureKey = (typeof SAAS_ALL_FEATURE_KEYS)[number];

/** Integrasi yang belum diimplementasi — tidak bisa dicentang di form paket. */
export const SAAS_INTEGRATION_COMING_SOON: readonly SaasIntegrationFeatureKey[] = ["vpn_mikrotik"];

export const SAAS_FEATURE_CATALOG: Record<
  SaasFeatureKey,
  { label: string; description: string; group: "modul" | "integrasi" }
> = {
  pelanggan: {
    label: "Manajemen pelanggan",
    description: "Data pelanggan, paket internet, jatuh tempo, dan koordinat lokasi.",
    group: "modul",
  },
  invoice: {
    label: "Billing & invoice",
    description: "Generate tagihan otomatis, reminder WhatsApp, dan status pembayaran.",
    group: "modul",
  },
  tiket: {
    label: "Helpdesk tiket",
    description: "Terima laporan gangguan pelanggan dan tetapkan teknisi.",
    group: "modul",
  },
  api_mikrotik: {
    label: "Integrasi Mikrotik",
    description: "Kontrol router, isolasi/aktivasi pelanggan otomatis via API.",
    group: "modul",
  },
  laporan_keuangan: {
    label: "Laporan keuangan",
    description: "Pemasukan, pengeluaran, laba rugi, dan ekspor laporan.",
    group: "modul",
  },
  portal_pelanggan: {
    label: "Portal pelanggan",
    description: "Pelanggan cek tagihan, bayar online, dan lapor gangguan mandiri.",
    group: "modul",
  },
  kolektor: {
    label: "Aplikasi kolektor",
    description: "Tugas penagihan lapangan, navigasi, dan catat pembayaran tunai.",
    group: "modul",
  },
  peta: {
    label: "Peta & ODP",
    description: "Pemetaan pelanggan dan infrastruktur jaringan di peta.",
    group: "modul",
  },
  whatsapp: {
    label: "Notifikasi WhatsApp",
    description: "Kirim tagihan, reminder, dan OTP ke pelanggan via WhatsApp.",
    group: "integrasi",
  },
  payment_gateway: {
    label: "Payment gateway",
    description: "Terima pembayaran online pelanggan (QRIS, VA, e-wallet).",
    group: "integrasi",
  },
  vpn_mikrotik: {
    label: "VPN Mikrotik",
    description: "Buat akun VPN L2TP + port forward API router dari dashboard.",
    group: "integrasi",
  },
};

export function formatSaasFeatureKey(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function getSaasFeatureInfo(key: string): { label: string; description: string } {
  const known = SAAS_FEATURE_CATALOG[key as SaasFeatureKey];
  if (known) return { label: known.label, description: known.description };
  return {
    label: formatSaasFeatureKey(key),
    description: "Termasuk dalam paket langganan Anda.",
  };
}

export function isKnownSaasFeatureKey(key: string): key is SaasFeatureKey {
  return key in SAAS_FEATURE_CATALOG;
}

/** Parse checkbox fitur dari form paket superadmin. */
export function parsePackageFeaturesFromForm(formData: FormData): string[] {
  const keys = new Set<string>();
  for (const key of SAAS_ALL_FEATURE_KEYS) {
    if (SAAS_INTEGRATION_COMING_SOON.includes(key as SaasIntegrationFeatureKey)) continue;
    if (formData.get(`fitur_${key}`) === "on") keys.add(key);
  }
  return [...keys];
}
