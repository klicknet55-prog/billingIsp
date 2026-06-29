import "server-only";
import { buildTagihanCronContext } from "@/features/messages/context";
import { renderTemplate } from "@/features/messages/render";
import { getTemplateBody } from "@/features/messages/templates";
import type { TenantTemplateKey } from "@/features/messages/types";
import { tagihanBalance } from "@/features/billing/tagihan-balance";
import { formatRupiah } from "@/lib/utils";

export type InvoiceCronKind =
  | "new"
  | "pre_due"
  | "overdue"
  | "dunning_2"
  | "dunning_final";

const KIND_TO_KEY: Record<InvoiceCronKind, TenantTemplateKey> = {
  new: "invoice_new",
  pre_due: "invoice_pre_due",
  overdue: "invoice_overdue",
  dunning_2: "invoice_dunning_2",
  dunning_final: "invoice_dunning_final",
};

export async function formatInvoiceMessageFromTemplate(
  tenantId: string,
  pelangganId: string,
  parts: {
    periode: string;
    amount: number;
    amountPaid?: number;
    dueDate: Date;
    kind: InvoiceCronKind;
    payUrl: string;
    daysPastDue?: number;
  }
): Promise<string> {
  const key = KIND_TO_KEY[parts.kind];
  const body = await getTemplateBody("tenant", key, tenantId);
  const vars = await buildTagihanCronContext(tenantId, pelangganId, {
    periode: parts.periode,
    amount: parts.amount,
    dueDate: parts.dueDate,
  });
  const balance = tagihanBalance({ amount: parts.amount, amountPaid: parts.amountPaid ?? 0 });
  return renderTemplate(body, {
    ...vars,
    link_bayar: parts.payUrl,
    sisa_tagihan: formatRupiah(balance),
    sisa_hari: String(parts.daysPastDue ?? 0),
  });
}

export async function formatSaasReminderFromTemplate(
  tenantId: string,
  key: "saas_reminder_7d" | "saas_reminder_1d"
): Promise<string> {
  const { buildTenantOwnerContext } = await import("@/features/messages/context");
  const body = await getTemplateBody("platform", key);
  const vars = await buildTenantOwnerContext(tenantId);
  return renderTemplate(body, vars);
}
