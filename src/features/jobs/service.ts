import "server-only";
import { and, eq, gte, isNull, lt, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { invoices, paketInternet, pelanggan, tenants } from "@/lib/db/schema";
import { setIsolasi } from "@/features/customers/service";
import {
  formatInvoiceMessage,
  nextDueDateFromDay,
  portalPayLink,
  REMINDER_DAYS,
  shouldGenerateInvoice,
  startOfDay,
} from "@/features/jobs/billing";
import {
  createSystemInvoice,
  hasInvoiceForBillingPeriod,
} from "@/features/invoices/service";
import { getWhatsAppClient } from "@/lib/integrations/whatsapp";
import { createLogger } from "@/lib/logger";

const log = createLogger("jobs");

const DAY = 24 * 60 * 60 * 1000;

export interface BillingCycleResult {
  generated: number;
  generatedNotified: number;
  overdue: number;
  isolated: number;
  reminded: number;
  preDueReminded: number;
}

function resolveDueDate(
  custTglJatuhTempo: Date | null,
  custCreatedAt: Date,
  now: Date
): Date {
  if (custTglJatuhTempo) {
    const anchor = startOfDay(custTglJatuhTempo);
    if (anchor >= startOfDay(now)) return anchor;
    return nextDueDateFromDay(anchor.getDate(), now);
  }
  return nextDueDateFromDay(custCreatedAt.getDate(), now);
}

async function generateMonthlyInvoices(now: Date, result: BillingCycleResult) {
  const activeTenants = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.status, "active"));

  for (const { id: tenantId } of activeTenants) {
    const customers = await db
      .select({
        id: pelanggan.id,
        noWa: pelanggan.noWa,
        tglJatuhTempo: pelanggan.tglJatuhTempo,
        createdAt: pelanggan.createdAt,
        paketId: pelanggan.paketInternetId,
        harga: paketInternet.hargaBulanan,
        paketNama: paketInternet.nama,
      })
      .from(pelanggan)
      .innerJoin(paketInternet, eq(pelanggan.paketInternetId, paketInternet.id))
      .where(and(eq(pelanggan.tenantId, tenantId), eq(paketInternet.isActive, true)));

    for (const cust of customers) {
      if (!cust.paketId || cust.harga <= 0) continue;

      const dueDate = resolveDueDate(cust.tglJatuhTempo, cust.createdAt, now);
      if (!shouldGenerateInvoice(now, dueDate)) continue;

      const exists = await hasInvoiceForBillingPeriod(tenantId, cust.id, dueDate);
      if (exists) continue;

      const inv = await createSystemInvoice(tenantId, {
        pelangganId: cust.id,
        totalTagihan: cust.harga,
        tglJatuhTempo: dueDate,
      });
      result.generated++;

      const msg = formatInvoiceMessage({
        noInvoice: inv.noInvoice,
        amount: inv.totalTagihan,
        dueDate,
        kind: "new",
        payUrl: portalPayLink(tenantId, cust.id),
      });
      await getWhatsAppClient().sendNotification(cust.noWa, msg, tenantId);
      result.generatedNotified++;
    }
  }
}

/**
 * Background worker: siklus penagihan otomatis.
 * - Generate invoice bulanan (H-N sebelum jatuh tempo pelanggan).
 * - Reminder H-3 sebelum jatuh tempo (sekali per invoice).
 * - Invoice lewat jatuh tempo → overdue + isolasi + notifikasi.
 */
export async function runBillingCycle(): Promise<BillingCycleResult> {
  const now = new Date();
  const result: BillingCycleResult = {
    generated: 0,
    generatedNotified: 0,
    overdue: 0,
    isolated: 0,
    reminded: 0,
    preDueReminded: 0,
  };

  await generateMonthlyInvoices(now, result);

  const upcoming = await db
    .select()
    .from(invoices)
    .where(
      and(
        eq(invoices.status, "unpaid"),
        gte(invoices.tglJatuhTempo, now),
        lte(invoices.tglJatuhTempo, new Date(now.getTime() + REMINDER_DAYS * DAY)),
        isNull(invoices.preDueRemindedAt)
      )
    );

  for (const inv of upcoming) {
    const cust = await db.query.pelanggan.findFirst({
      where: (p, { eq: e }) => e(p.id, inv.pelangganId),
    });
    if (!cust || !inv.tglJatuhTempo) continue;

    const msg = formatInvoiceMessage({
      noInvoice: inv.noInvoice,
      amount: inv.totalTagihan,
      dueDate: inv.tglJatuhTempo,
      kind: "pre_due",
      payUrl: portalPayLink(inv.tenantId, cust.id),
    });
    await getWhatsAppClient().sendNotification(cust.noWa, msg, inv.tenantId);

    await db
      .update(invoices)
      .set({ preDueRemindedAt: now })
      .where(eq(invoices.id, inv.id));

    result.preDueReminded++;
  }

  const overdueInvoices = await db
    .select()
    .from(invoices)
    .where(and(eq(invoices.status, "unpaid"), lt(invoices.tglJatuhTempo, now)));

  for (const inv of overdueInvoices) {
    await db.update(invoices).set({ status: "overdue" }).where(eq(invoices.id, inv.id));
    result.overdue++;

    await setIsolasi(inv.tenantId, inv.pelangganId, true);
    result.isolated++;

    const cust = await db.query.pelanggan.findFirst({
      where: (p, { eq: e }) => e(p.id, inv.pelangganId),
    });
    if (cust && inv.tglJatuhTempo) {
      const msg = formatInvoiceMessage({
        noInvoice: inv.noInvoice,
        amount: inv.totalTagihan,
        dueDate: inv.tglJatuhTempo,
        kind: "overdue",
        payUrl: portalPayLink(inv.tenantId, cust.id),
      });
      await getWhatsAppClient().sendNotification(cust.noWa, msg, inv.tenantId);
      result.reminded++;
    }
  }

  log.info("Siklus penagihan selesai", result);
  return result;
}
