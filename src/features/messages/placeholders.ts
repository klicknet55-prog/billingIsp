export interface PlaceholderDef {
  key: string;
  label: string;
  example: string;
}

export const PELANGGAN_PLACEHOLDERS: PlaceholderDef[] = [
  { key: "nama_pelanggan", label: "Nama pelanggan", example: "Budi Santoso" },
  { key: "no_wa", label: "Nomor WhatsApp", example: "6281234567890" },
  { key: "alamat", label: "Alamat pelanggan", example: "Jl. Merdeka No. 1" },
  { key: "tagihan", label: "Periode tagihan", example: "Juni 2026" },
  { key: "no_invoice", label: "Periode (legacy [[no_invoice]])", example: "2026-06" },
  { key: "jumlah_tagihan", label: "Jumlah tagihan periode", example: "Rp150.000" },
  { key: "tunggakan", label: "Total tunggakan", example: "Rp300.000 (Mei 2026, April 2026)" },
  { key: "jatuh_tempo", label: "Tanggal jatuh tempo", example: "15 Jun 2026" },
  { key: "link_bayar", label: "Link bayar portal", example: "https://app.example/portal/masuk?t=..." },
  { key: "nama_usaha", label: "Nama usaha ISP", example: "RT-RW Net" },
  { key: "paket", label: "Nama paket internet", example: "20 Mbps" },
  { key: "router", label: "Nama router", example: "Router Utama" },
];

export const TENANT_OWNER_PLACEHOLDERS: PlaceholderDef[] = [
  { key: "nama_usaha", label: "Nama usaha tenant", example: "Demo Net" },
  { key: "nama_owner", label: "Nama owner", example: "Ahmad" },
  { key: "domain", label: "Domain tenant", example: "demo.netmanage.app" },
  { key: "paket_saas", label: "Paket SaaS", example: "Pro" },
  { key: "langganan_akhir", label: "Tanggal akhir langganan", example: "30 Jun 2026" },
  { key: "sisa_hari", label: "Sisa hari langganan", example: "7" },
];

export function placeholderToken(key: string): string {
  return `[[${key}]]`;
}
