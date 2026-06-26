import type { PlatformTemplateKey, TenantTemplateKey } from "@/features/messages/types";

export const DEFAULT_TENANT_TEMPLATES: Record<TenantTemplateKey, string> = {
  invoice_new:
    "Tagihan periode [[tagihan]] sebesar [[jumlah_tagihan]] jatuh tempo [[jatuh_tempo]]. Bayar: [[link_bayar]]",
  invoice_pre_due:
    "Pengingat [[nama_pelanggan]]: tagihan [[tagihan]] [[jumlah_tagihan]] jatuh tempo [[jatuh_tempo]]. Bayar: [[link_bayar]]",
  invoice_overdue:
    "[[nama_pelanggan]], tagihan [[tagihan]] ([[jumlah_tagihan]]) telah jatuh tempo. Total tunggakan: [[tunggakan]]. Layanan dinonaktifkan sementara. Bayar: [[link_bayar]]",
  manual_invoice:
    "Halo [[nama_pelanggan]], tagihan [[tagihan]] sebesar [[jumlah_tagihan]] jatuh tempo [[jatuh_tempo]]. Tunggakan: [[tunggakan]]. Bayar di: [[link_bayar]]",
  manual_custom:
    "Halo [[nama_pelanggan]], ini pesan dari [[nama_usaha]]. Terima kasih.",
};

export const DEFAULT_PLATFORM_TEMPLATES: Record<PlatformTemplateKey, string> = {
  saas_reminder_7d:
    "Pengingat: langganan platform [[nama_usaha]] berakhir [[langganan_akhir]] ([[sisa_hari]] hari lagi). Perpanjang di menu Langganan SaaS.",
  saas_reminder_1d:
    "Penting: langganan platform [[nama_usaha]] berakhir besok ([[langganan_akhir]]). Segera perpanjang agar layanan tidak ditangguhkan.",
  manual_tenant:
    "Halo [[nama_owner]], pesan dari platform NetManage untuk [[nama_usaha]] ([[domain]]).",
};

export const SAMPLE_PELANGGAN_VARS: Record<string, string> = {
  nama_pelanggan: "Budi Santoso",
  no_wa: "6281234567890",
  alamat: "Jl. Merdeka No. 1",
  tagihan: "Juni 2026",
  no_invoice: "2026-06",
  jumlah_tagihan: "Rp150.000",
  tunggakan: "Rp300.000 (Mei 2026, April 2026)",
  jatuh_tempo: "15 Jun 2026",
  link_bayar: "https://app.example/portal/masuk?t=contoh",
  nama_usaha: "RT-RW Net",
  paket: "20 Mbps",
  router: "Router Utama",
};

export const SAMPLE_TENANT_VARS: Record<string, string> = {
  nama_usaha: "Demo Net",
  nama_owner: "Ahmad",
  domain: "demo.netmanage.app",
  paket_saas: "Pro",
  langganan_akhir: "30 Jun 2026",
  sisa_hari: "7",
};
