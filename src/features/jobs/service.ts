import "server-only";
import { and, eq, gte, lt, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { invoices } from "@/lib/db/schema";
import { setIsolasi } from "@/features/customers/service";
import { getWhatsAppClient } from "@/lib/integrations/whatsapp";
import { createLogger } from "@/lib/logger";

const log = createLogger("jobs");

export interface BillingCycleResult {
  overdue: number;
  isolated: number;
  reminded: number;
  preDueReminded: number;
}

const DAY = 24 * 60 * 60 * 1000;
const REMINDER_DAYS = 3;

/**
 * Background worker: jalankan siklus penagihan.
 * - Invoice unpaid yang melewati jatuh tempo -> status overdue + isolasi pelanggan + reminder.
 *
 * Dipanggil terjadwal (cron) lewat route `/api/cron`. Mudah dipindah ke
 * Inngest/queue tanpa mengubah logika inti.
 */
export async function runBillingCycle(): Promise<BillingCycleResult> {
  const now = new Date();
  const result: BillingCycleResult = { overdue: 0, isolated: 0, reminded: 0, preDueReminded: 0 };

  // Reminder H-3: invoice unpaid yang akan jatuh tempo dalam 3 hari.
  const upcoming = await db
    .select()
    .from(invoices)
    .where(
      and(
        eq(invoices.status, "unpaid"),
        gte(invoices.tglJatuhTempo, now),
        lte(invoices.tglJatuhTempo, new Date(now.getTime() + REMINDER_DAYS * DAY))
      )
    );
  for (const inv of upcoming) {
    const cust = await db.query.pelanggan.findFirst({
      where: (p, { eq: e }) => e(p.id, inv.pelangganId),
    });
    if (cust) {
      await getWhatsAppClient().sendNotification(
        cust.noWa,
        `Pengingat: tagihan ${inv.noInvoice} akan jatuh tempo. Mohon lakukan pembayaran tepat waktu.`,
        inv.tenantId
      );
      result.preDueReminded++;
    }
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
    if (cust) {
      await getWhatsAppClient().sendNotification(
        cust.noWa,
        `Tagihan ${inv.noInvoice} telah jatuh tempo. Layanan dinonaktifkan sementara hingga pembayaran.`,
        inv.tenantId
      );
      result.reminded++;
    }
  }

  log.info("Siklus penagihan selesai", result);
  return result;
}
