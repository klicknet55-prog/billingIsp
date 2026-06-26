import "server-only";
import { buildTagihanCronContext } from "@/features/messages/context";
import { renderTemplate } from "@/features/messages/render";
import { getTemplateBody } from "@/features/messages/templates";
import type { TenantTemplateKey } from "@/features/messages/types";

const KIND_TO_KEY: Record<"new" | "pre_due" | "overdue", TenantTemplateKey> = {
  new: "invoice_new",
  pre_due: "invoice_pre_due",
  overdue: "invoice_overdue",
};

export async function formatInvoiceMessageFromTemplate(
  tenantId: string,
  pelangganId: string,
  parts: {
    periode: string;
    amount: number;
    dueDate: Date;
    kind: "new" | "pre_due" | "overdue";
    payUrl: string;
  }
): Promise<string> {
  const key = KIND_TO_KEY[parts.kind];
  const body = await getTemplateBody("tenant", key, tenantId);
  const vars = await buildTagihanCronContext(tenantId, pelangganId, {
    periode: parts.periode,
    amount: parts.amount,
    dueDate: parts.dueDate,
  });
  return renderTemplate(body, { ...vars, link_bayar: parts.payUrl });
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
