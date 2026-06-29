export type MessageScope = "tenant" | "platform";

export type TenantTemplateKey =
  | "invoice_new"
  | "invoice_pre_due"
  | "invoice_overdue"
  | "invoice_dunning_2"
  | "invoice_dunning_final"
  | "manual_invoice"
  | "manual_custom";

export type PlatformTemplateKey = "saas_reminder_7d" | "saas_reminder_1d" | "manual_tenant";

export type TemplateKey = TenantTemplateKey | PlatformTemplateKey;

export type MessageType = "invoice" | "custom";

export const TENANT_TEMPLATE_KEYS: TenantTemplateKey[] = [
  "invoice_new",
  "invoice_pre_due",
  "invoice_overdue",
  "invoice_dunning_2",
  "invoice_dunning_final",
  "manual_invoice",
  "manual_custom",
];

export const PLATFORM_TEMPLATE_KEYS: PlatformTemplateKey[] = [
  "saas_reminder_7d",
  "saas_reminder_1d",
  "manual_tenant",
];

export const TEMPLATE_LABELS: Record<string, string> = {
  invoice_new: "Tagihan baru (cron)",
  invoice_pre_due: "Pengingat H-3 (cron)",
  invoice_overdue: "Tagihan jatuh tempo H+0 (cron)",
  invoice_dunning_2: "Dunning step 2 — H+3 (cron)",
  invoice_dunning_final: "Dunning final + isolir H+7 (cron)",
  manual_invoice: "Kirim manual — tagihan / link bayar",
  manual_custom: "Kirim manual — pesan custom",
  saas_reminder_7d: "Reminder langganan H-7",
  saas_reminder_1d: "Reminder langganan H-1",
  manual_tenant: "Broadcast ke tenant",
};
