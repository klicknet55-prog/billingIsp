import "server-only";
import { and, eq, gte, isNull, lt, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { paketInternet, pelanggan, tagihan, tenants } from "@/lib/db/schema";
import {
  ensureTagihanForCustomer,
  isolateOverdueUnpaid,
} from "@/features/billing/tagihan-service";
import { portalPayLink, REMINDER_DAYS } from "@/features/jobs/billing";
import { startOfDay } from "@/features/jobs/due-date";
import { formatInvoiceMessageFromTemplate } from "@/features/messages/invoice-message";
import { paceAfterSend, waitBeforeSend } from "@/features/messages/throttle";
import { getWhatsAppClient } from "@/lib/integrations/whatsapp";
import { cleanupExpiredPortalAccessCodes } from "@/lib/auth/portal-access-code";
import { createLogger } from "@/lib/logger";

const log = createLogger("jobs");

const DAY = 24 * 60 * 60 * 1000;
let billingSendCount = 0;

async function notifyPelangganWa(phone: string, message: string, tenantId: string) {
  try {
    await waitBeforeSend();
    await getWhatsAppClient().sendNotification(phone, message, tenantId);
    billingSendCount++;
    await paceAfterSend(billingSendCount);
  } catch (err) {
    log.warn(`WA gagal ke ${phone}: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export interface BillingCycleResult {
  tagihanCreated: number;
  tunggakan: number;
  isolated: number;
  reminded: number;
  preDueReminded: number;
}

async function syncTagihanForTenants(now: Date, result: BillingCycleResult) {
  const activeTenants = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.status, "active"));

  for (const { id: tenantId } of activeTenants) {
    const customers = await db
      .select({
        id: pelanggan.id,
        noWa: pelanggan.noWa,
        harga: paketInternet.hargaBulanan,
      })
      .from(pelanggan)
      .innerJoin(paketInternet, eq(pelanggan.paketInternetId, paketInternet.id))
      .where(and(eq(pelanggan.tenantId, tenantId), eq(paketInternet.isActive, true)));

    for (const cust of customers) {
      if (cust.harga <= 0) continue;
      try {
        const created = await ensureTagihanForCustomer(tenantId, cust.id, cust.harga, now);
        if (created) result.tagihanCreated++;
      } catch (err) {
        log.warn(`Gagal buat tagihan ${cust.id}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }
}

/**
 * Background worker: siklus tagihan otomatis.
 * - Buat tagihan periode (D+5 untuk pertama).
 * - Isolir pelanggan lewat jatuh tempo (tagihan tetap open).
 * - Reminder H-N sebelum jatuh tempo.
 */
export async function runBillingCycle(): Promise<BillingCycleResult> {
  const now = new Date();
  billingSendCount = 0;
  await cleanupExpiredPortalAccessCodes();
  const result: BillingCycleResult = {
    tagihanCreated: 0,
    tunggakan: 0,
    isolated: 0,
    reminded: 0,
    preDueReminded: 0,
  };

  await syncTagihanForTenants(now, result);
  result.isolated = await isolateOverdueUnpaid(undefined, now);

  const upcoming = await db
    .select({ t: tagihan, noWa: pelanggan.noWa, pelangganId: pelanggan.id })
    .from(tagihan)
    .innerJoin(pelanggan, eq(tagihan.pelangganId, pelanggan.id))
    .innerJoin(tenants, eq(tagihan.tenantId, tenants.id))
    .where(
      and(
        eq(tenants.status, "active"),
        eq(tagihan.status, "open"),
        gte(tagihan.dueDate, now),
        lte(tagihan.dueDate, new Date(now.getTime() + REMINDER_DAYS * DAY)),
        isNull(tagihan.preDueRemindedAt)
      )
    );

  for (const { t, noWa, pelangganId } of upcoming) {
    try {
      const msg = await formatInvoiceMessageFromTemplate(t.tenantId, pelangganId, {
        periode: t.periode,
        amount: t.amount,
        dueDate: t.dueDate,
        kind: "pre_due",
        payUrl: await portalPayLink(t.tenantId, pelangganId),
      });
      await notifyPelangganWa(noWa, msg, t.tenantId);
      await db.update(tagihan).set({ preDueRemindedAt: now }).where(eq(tagihan.id, t.id));
      result.preDueReminded++;
    } catch (err) {
      log.warn(`Reminder gagal ${t.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const today = startOfDay(now);
  const overdueOpenRows = await db
    .select({
      t: tagihan,
      noWa: pelanggan.noWa,
      pelangganId: pelanggan.id,
      isIsolated: pelanggan.isIsolated,
    })
    .from(tagihan)
    .innerJoin(pelanggan, eq(tagihan.pelangganId, pelanggan.id))
    .innerJoin(tenants, eq(tagihan.tenantId, tenants.id))
    .where(
      and(
        eq(tenants.status, "active"),
        eq(tagihan.status, "open"),
        lt(tagihan.dueDate, today)
      )
    );

  const remindedPelanggan = new Set<string>();
  for (const { t, noWa, pelangganId } of overdueOpenRows) {
    const key = `${t.tenantId}:${pelangganId}`;
    if (remindedPelanggan.has(key)) continue;
    remindedPelanggan.add(key);
    try {
      const msg = await formatInvoiceMessageFromTemplate(t.tenantId, pelangganId, {
        periode: t.periode,
        amount: t.amount,
        dueDate: t.dueDate,
        kind: "overdue",
        payUrl: await portalPayLink(t.tenantId, pelangganId),
      });
      await notifyPelangganWa(noWa, msg, t.tenantId);
      result.reminded++;
    } catch {
      /* logged in notifyPelangganWa */
    }
  }

  log.info("Siklus tagihan selesai", result);
  return result;
}
