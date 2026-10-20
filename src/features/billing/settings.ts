import "server-only";
import { eq } from "drizzle-orm";
import { DEFAULT_BILLING_SETTINGS, type BillingSettings } from "@/features/jobs/billing";
import { db } from "@/lib/db";
import { tenants } from "@/lib/db/schema";

export async function getTenantBillingSettings(tenantId: string): Promise<BillingSettings> {
  const tenant = await db.query.tenants.findFirst({
    columns: {
      billingReminderDays: true,
      billingFirstInvoiceDays: true,
      billingGenerateDays: true,
      billingIsolationDays: true,
      billingDunningStep2Days: true,
    },
    where: eq(tenants.id, tenantId),
  });
  if (!tenant) throw new Error(`Tenant ${tenantId} tidak ditemukan saat membaca pengaturan tagihan.`);

  return {
    reminderDays: tenant.billingReminderDays ?? DEFAULT_BILLING_SETTINGS.reminderDays,
    firstInvoiceDays: tenant.billingFirstInvoiceDays ?? DEFAULT_BILLING_SETTINGS.firstInvoiceDays,
    generateDays: tenant.billingGenerateDays ?? DEFAULT_BILLING_SETTINGS.generateDays,
    isolationDays: tenant.billingIsolationDays ?? DEFAULT_BILLING_SETTINGS.isolationDays,
    dunningStep2Days:
      tenant.billingDunningStep2Days ?? DEFAULT_BILLING_SETTINGS.dunningStep2Days,
  };
}
