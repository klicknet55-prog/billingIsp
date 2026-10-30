import "server-only";
import { and, eq, inArray, isNotNull, lt, or, sql } from "drizzle-orm";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { gzipSync } from "node:zlib";
import { db, databaseDriver } from "@/lib/db";
import { getAppTimeZone, getZonedParts, zonedDateTimeToUtc } from "@/lib/app-timezone";
import {
  dataRetentionRuns,
  invoices,
  messageBatches,
  messageSendLogs,
  paymentAttempts,
  paymentGatewayLogs,
  pelangganImportBatches,
  pushNotificationLogs,
  receiptTagihanLinks,
  salesCommissionRetentionSummaries,
  salesCommissions,
  tagihan,
  tenants,
  ticketAssignments,
  tickets,
  users,
  webhookDeliveryLogs,
} from "@/lib/db/schema";
import { getWhatsAppClient } from "@/lib/integrations/whatsapp";
import { createLogger } from "@/lib/logger";
import { newId } from "@/lib/utils";

const log = createLogger("data-retention");
const RETENTION_YEARS = 2;
const NOTIFICATION_MONTH = 1;
const NOTIFICATION_DAY = 23;
const PURGE_MONTH = 1;
const PURGE_DAY = 28;
const DAY_MS = 24 * 60 * 60 * 1000;

type RetentionPlan = {
  webhookDeliveryLogs: (typeof webhookDeliveryLogs.$inferSelect)[];
  pushNotificationLogs: (typeof pushNotificationLogs.$inferSelect)[];
  messageSendLogs: (typeof messageSendLogs.$inferSelect)[];
  tickets: (typeof tickets.$inferSelect)[];
  ticketAssignments: (typeof ticketAssignments.$inferSelect)[];
  pelangganImportBatches: (typeof pelangganImportBatches.$inferSelect)[];
  messageBatches: (typeof messageBatches.$inferSelect)[];
  invoices: (typeof invoices.$inferSelect)[];
  tagihan: (typeof tagihan.$inferSelect)[];
  receiptTagihanLinks: (typeof receiptTagihanLinks.$inferSelect)[];
  paymentAttempts: (typeof paymentAttempts.$inferSelect)[];
  paymentGatewayLogs: (typeof paymentGatewayLogs.$inferSelect)[];
  salesCommissions: (typeof salesCommissions.$inferSelect)[];
};

function annualPeriod(date: Date) {
  return String(getZonedParts(date).year);
}

function cutoffForYear(year: number) {
  return zonedDateTimeToUtc(year - RETENTION_YEARS, PURGE_MONTH, PURGE_DAY, 0, 0, 0);
}

function isAnnualPeriod(period: string) {
  return /^\d{4}$/.test(period);
}

function cutoffForPeriod(period: string) {
  if (!isAnnualPeriod(period)) throw new Error(`Periode retensi tidak valid: ${period}`);
  const year = Number(period);
  if (year < 1000 || year > 9999) throw new Error(`Periode retensi tidak valid: ${period}`);
  return cutoffForYear(year);
}

function isRetentionNotificationWindow(date: Date) {
  const { month, day } = getZonedParts(date);
  return month === NOTIFICATION_MONTH && day >= NOTIFICATION_DAY && day < PURGE_DAY;
}

function isRetentionPurgeWindowOpen(date: Date) {
  const { month, day } = getZonedParts(date);
  return month > PURGE_MONTH || (month === PURGE_MONTH && day >= PURGE_DAY);
}

function rowCounts(plan: RetentionPlan): Record<string, number> {
  return Object.fromEntries(
    Object.entries(plan).map(([table, rows]) => [table, rows.length])
  );
}

async function buildRetentionPlan(tenantId: string, cutoff: Date): Promise<RetentionPlan> {
  const [
    oldWebhookLogs,
    oldPushLogs,
    oldMessageLogs,
    oldTickets,
    oldImportBatches,
    oldMessageBatches,
    paidInvoices,
    paidTagihan,
    oldPaymentAttempts,
    oldGatewayLogs,
    oldCommissions,
  ] = await Promise.all([
    db.select().from(webhookDeliveryLogs).where(
      and(eq(webhookDeliveryLogs.tenantId, tenantId), lt(webhookDeliveryLogs.createdAt, cutoff))
    ),
    db.select().from(pushNotificationLogs).where(
      and(eq(pushNotificationLogs.tenantId, tenantId), lt(pushNotificationLogs.createdAt, cutoff))
    ),
    db.select().from(messageSendLogs).where(
      and(eq(messageSendLogs.tenantId, tenantId), lt(messageSendLogs.createdAt, cutoff))
    ),
    db.select().from(tickets).where(
      and(
        eq(tickets.tenantId, tenantId),
        eq(tickets.status, "resolved"),
        lt(tickets.createdAt, cutoff)
      )
    ),
    db.select().from(pelangganImportBatches).where(
      and(
        eq(pelangganImportBatches.tenantId, tenantId),
        inArray(pelangganImportBatches.status, ["completed", "failed"]),
        isNotNull(pelangganImportBatches.finishedAt),
        lt(pelangganImportBatches.finishedAt, cutoff)
      )
    ),
    db.select().from(messageBatches).where(
      and(
        eq(messageBatches.tenantId, tenantId),
        inArray(messageBatches.status, ["done", "failed"]),
        isNotNull(messageBatches.finishedAt),
        lt(messageBatches.finishedAt, cutoff)
      )
    ),
    db.select().from(invoices).where(
      and(
        eq(invoices.tenantId, tenantId),
        eq(invoices.status, "paid"),
        isNotNull(invoices.tglLunas),
        lt(invoices.tglLunas, cutoff)
      )
    ),
    db.select().from(tagihan).where(
      and(
        eq(tagihan.tenantId, tenantId),
        eq(tagihan.status, "paid"),
        isNotNull(tagihan.paidAt),
        lt(tagihan.paidAt, cutoff)
      )
    ),
    db.select().from(paymentAttempts).where(
      and(
        eq(paymentAttempts.tenantId, tenantId),
        inArray(paymentAttempts.status, ["completed", "failed"]),
        lt(paymentAttempts.createdAt, cutoff)
      )
    ),
    db.select().from(paymentGatewayLogs).where(
      and(
        eq(paymentGatewayLogs.tenantId, tenantId),
        inArray(paymentGatewayLogs.status, ["success", "failed"]),
        lt(paymentGatewayLogs.createdAt, cutoff)
      )
    ),
    db.select().from(salesCommissions).where(
      and(
        eq(salesCommissions.tenantId, tenantId),
        inArray(salesCommissions.status, ["paid", "reversed"]),
        lt(salesCommissions.createdAt, cutoff)
      )
    ),
  ]);

  const ticketIds = oldTickets.map((row) => row.id);
  const candidateTagihanIds = new Set(paidTagihan.map((row) => row.id));
  const [assignments, linkedReceipts, linkedInvoices, commissionChildren, commissionsByPayment] =
    await Promise.all([
      ticketIds.length
        ? db.select().from(ticketAssignments).where(inArray(ticketAssignments.ticketId, ticketIds))
        : Promise.resolve([]),
      paidInvoices.length || paidTagihan.length
        ? db
            .select()
            .from(receiptTagihanLinks)
            .where(
              or(
                paidInvoices.length
                  ? inArray(receiptTagihanLinks.receiptId, paidInvoices.map((row) => row.id))
                  : undefined,
                paidTagihan.length
                  ? inArray(receiptTagihanLinks.tagihanId, paidTagihan.map((row) => row.id))
                  : undefined
              )
            )
        : Promise.resolve([]),
      paidInvoices.length
        ? db
            .select({ receiptId: tagihan.receiptId, id: tagihan.id })
            .from(tagihan)
            .where(inArray(tagihan.receiptId, paidInvoices.map((row) => row.id)))
        : Promise.resolve([]),
      oldCommissions.length
        ? db
            .select({ id: salesCommissions.id, reversalOfId: salesCommissions.reversalOfId })
            .from(salesCommissions)
            .where(inArray(salesCommissions.reversalOfId, oldCommissions.map((row) => row.id)))
        : Promise.resolve([]),
      oldGatewayLogs.length
        ? db
            .select({
              id: salesCommissions.id,
              paymentGatewayLogId: salesCommissions.paymentGatewayLogId,
            })
            .from(salesCommissions)
            .where(inArray(
              salesCommissions.paymentGatewayLogId,
              oldGatewayLogs.map((row) => row.id)
            ))
        : Promise.resolve([]),
    ]);

  const eligibleInvoices = paidInvoices.filter(
    (invoice) =>
      !linkedInvoices.some(
        (linked) => linked.receiptId === invoice.id && !candidateTagihanIds.has(linked.id)
      )
  );
  const eligibleInvoiceIds = new Set(eligibleInvoices.map((row) => row.id));
  const eligiblePaymentAttempts = oldPaymentAttempts.filter(
    (attempt) => !attempt.receiptId || eligibleInvoiceIds.has(attempt.receiptId)
  );
  const candidateCommissionIds = new Set(oldCommissions.map((row) => row.id));
  const retainedReversalParents = new Set(
    commissionChildren
      .filter((child) => !candidateCommissionIds.has(child.id))
      .map((child) => child.reversalOfId)
      .filter((id): id is string => id !== null)
  );
  const eligibleCommissions = oldCommissions.filter(
    (commission) => !retainedReversalParents.has(commission.id)
  );
  const eligibleCommissionIds = new Set(eligibleCommissions.map((row) => row.id));
  const eligibleGatewayLogs = oldGatewayLogs.filter((payment) => {
    if (
      payment.referenceType === "invoice" &&
      !eligibleInvoiceIds.has(payment.referenceId)
    ) {
      return false;
    }
    return !commissionsByPayment.some(
        (commission) =>
          commission.paymentGatewayLogId === payment.id &&
          !eligibleCommissionIds.has(commission.id)
      );
  });
  const receiptLinksToArchive = linkedReceipts.filter(
    (link) =>
      (eligibleInvoiceIds.has(link.receiptId) || candidateTagihanIds.has(link.tagihanId)) &&
      !(eligibleInvoiceIds.has(link.receiptId) && candidateTagihanIds.has(link.tagihanId))
  );
  const internalLinks = linkedReceipts.filter(
    (link) => eligibleInvoiceIds.has(link.receiptId) && candidateTagihanIds.has(link.tagihanId)
  );
  return {
    webhookDeliveryLogs: oldWebhookLogs,
    pushNotificationLogs: oldPushLogs,
    messageSendLogs: oldMessageLogs,
    tickets: oldTickets,
    ticketAssignments: assignments,
    pelangganImportBatches: oldImportBatches,
    messageBatches: oldMessageBatches,
    invoices: eligibleInvoices,
    tagihan: paidTagihan,
    receiptTagihanLinks: [...receiptLinksToArchive, ...internalLinks],
    paymentAttempts: eligiblePaymentAttempts,
    paymentGatewayLogs: eligibleGatewayLogs,
    salesCommissions: eligibleCommissions,
  };
}

function archiveDirectory(tenantId: string) {
  return path.join(process.cwd(), "data", "backups", "tenant", tenantId, "retention");
}

async function saveRetentionArchive(
  tenant: { id: string; namaUsaha: string; domain: string },
  period: string,
  cutoff: Date,
  plan: RetentionPlan
) {
  const folder = archiveDirectory(tenant.id);
  await mkdir(folder, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `retention-${period}-${stamp}.json.gz`;
  const filePath = path.join(folder, filename);
  const data = {
    format: "netmanage-retention-archive",
    version: 1,
    tenant: { id: tenant.id, name: tenant.namaUsaha, domain: tenant.domain },
    cutoff: cutoff.toISOString(),
    archivedAt: new Date().toISOString(),
    counts: rowCounts(plan),
    data: plan,
  };
  await writeFile(filePath, gzipSync(Buffer.from(JSON.stringify(data), "utf8")), { flag: "wx" });
  return path.relative(process.cwd(), filePath);
}

function ids<T extends { id: string }>(rows: T[]) {
  return rows.map((row) => row.id);
}

async function deleteRetentionPlan(plan: RetentionPlan) {
  const deletionOrder = [
    ["ticketAssignments", ids(plan.ticketAssignments)],
    ["receiptTagihanLinks", ids(plan.receiptTagihanLinks)],
    ["tagihan", ids(plan.tagihan)],
    ["invoices", ids(plan.invoices)],
    ["paymentAttempts", ids(plan.paymentAttempts)],
    ["salesCommissions", ids(plan.salesCommissions.filter((row) => row.entryType === "reversal"))],
    ["salesCommissions", ids(plan.salesCommissions.filter((row) => row.entryType !== "reversal"))],
    ["paymentGatewayLogs", ids(plan.paymentGatewayLogs)],
    ["tickets", ids(plan.tickets)],
    ["pelangganImportBatches", ids(plan.pelangganImportBatches)],
    ["messageBatches", ids(plan.messageBatches)],
    ["messageSendLogs", ids(plan.messageSendLogs)],
    ["pushNotificationLogs", ids(plan.pushNotificationLogs)],
    ["webhookDeliveryLogs", ids(plan.webhookDeliveryLogs)],
  ] as const;
  const countByTable: Record<string, number> = {};
  for (const [table, rowIds] of deletionOrder) {
    countByTable[table] = (countByTable[table] ?? 0) + rowIds.length;
  }

  if (databaseDriver === "sqlite") {
    db.transaction((tx) => {
      const syncTx = tx as typeof db;
      const paidBySales = new Map<string, number>();
      for (const commission of plan.salesCommissions) {
        if (commission.status === "paid") {
          paidBySales.set(
            commission.salesUserId,
            (paidBySales.get(commission.salesUserId) ?? 0) + commission.amount
          );
        }
      }
      for (const [salesUserId, amount] of paidBySales) {
        syncTx
          .insert(salesCommissionRetentionSummaries)
          .values({ salesUserId, paidAmount: amount, updatedAt: new Date() })
          .onConflictDoUpdate({
            target: salesCommissionRetentionSummaries.salesUserId,
            set: {
              paidAmount: sql`${salesCommissionRetentionSummaries.paidAmount} + ${amount}`,
              updatedAt: new Date(),
            },
          })
          .run();
      }
      for (const [table, rowIds] of deletionOrder) {
        if (!rowIds.length) continue;
        const target = {
          ticketAssignments,
          receiptTagihanLinks,
          tagihan,
          invoices,
          paymentAttempts,
          salesCommissions,
          paymentGatewayLogs,
          tickets,
          pelangganImportBatches,
          messageBatches,
          messageSendLogs,
          pushNotificationLogs,
          webhookDeliveryLogs,
        }[table];
        syncTx.delete(target).where(inArray(target.id, rowIds)).run();
      }
    });
  } else {
    await db.transaction(async (tx) => {
      const paidBySales = new Map<string, number>();
      for (const commission of plan.salesCommissions) {
        if (commission.status === "paid") {
          paidBySales.set(
            commission.salesUserId,
            (paidBySales.get(commission.salesUserId) ?? 0) + commission.amount
          );
        }
      }
      for (const [salesUserId, amount] of paidBySales) {
        await tx
          .insert(salesCommissionRetentionSummaries)
          .values({ salesUserId, paidAmount: amount, updatedAt: new Date() })
          .onConflictDoUpdate({
            target: salesCommissionRetentionSummaries.salesUserId,
            set: {
              paidAmount: sql`${salesCommissionRetentionSummaries.paidAmount} + ${amount}`,
              updatedAt: new Date(),
            },
          });
      }
      for (const [table, rowIds] of deletionOrder) {
        if (!rowIds.length) continue;
        const target = {
          ticketAssignments,
          receiptTagihanLinks,
          tagihan,
          invoices,
          paymentAttempts,
          salesCommissions,
          paymentGatewayLogs,
          tickets,
          pelangganImportBatches,
          messageBatches,
          messageSendLogs,
          pushNotificationLogs,
          webhookDeliveryLogs,
        }[table];
        await tx.delete(target).where(inArray(target.id, rowIds));
      }
    });
  }
  return countByTable;
}

async function notifyTenantOwner(
  tenant: { id: string; namaUsaha: string; domain: string },
  period: string,
  cutoff: Date,
  counts: Record<string, number>
) {
  const owner = await db.query.users.findFirst({
    where: and(eq(users.tenantId, tenant.id), eq(users.role, "owner"), eq(users.isActive, true)),
  });
  const phone = owner?.phone?.trim();
  if (!phone) throw new Error("Nomor WhatsApp owner tenant belum diisi.");
  const count = Object.values(counts).reduce((sum, value) => sum + value, 0);
  const cutoffLabel = cutoff.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: getAppTimeZone(),
  });
  const message =
    `Pemberitahuan pemeliharaan data ${tenant.namaUsaha}: pada 28 Januari ${period}, ` +
    `arsip data lama sebelum ${cutoffLabel} akan dibuat lalu data yang memenuhi kebijakan retensi ` +
    `2 tahun akan dihapus dari database. Data tagihan belum lunas dan data operasional yang belum ` +
    `selesai tetap disimpan. Perkiraan ${count} baris data lama terdampak. Arsip disimpan di server.`;
  await getWhatsAppClient().sendNotification(phone, message, tenant.id);
}

async function ensureRun(tenantId: string, period: string) {
  await db
    .insert(dataRetentionRuns)
    .values({
      id: newId("ret"),
      tenantId,
      period,
      notificationStatus: "pending",
      purgeStatus: "pending",
      updatedAt: new Date(),
    })
    .onConflictDoNothing();
  const run = await db.query.dataRetentionRuns.findFirst({
    where: and(eq(dataRetentionRuns.tenantId, tenantId), eq(dataRetentionRuns.period, period)),
  });
  if (!run) throw new Error(`Gagal menyiapkan job retensi untuk tenant ${tenantId}.`);
  return run;
}

async function runNotifications(now: Date, period: string, cutoff: Date) {
  const tenantsList = await db
    .select({ id: tenants.id, namaUsaha: tenants.namaUsaha, domain: tenants.domain })
    .from(tenants);
  const result = { sent: 0, failed: 0, skipped: 0 };
  for (const tenant of tenantsList) {
    try {
      const plan = await buildRetentionPlan(tenant.id, cutoff);
      if (!Object.values(rowCounts(plan)).some((count) => count > 0)) {
        result.skipped++;
        continue;
      }
      const run = await ensureRun(tenant.id, period);
      if (run.notificationStatus === "sent") {
        result.skipped++;
        continue;
      }
      try {
        await notifyTenantOwner(tenant, period, cutoff, rowCounts(plan));
        await db
          .update(dataRetentionRuns)
          .set({
            notificationStatus: "sent",
            notificationSentAt: now,
            lastError: null,
            updatedAt: now,
          })
          .where(eq(dataRetentionRuns.id, run.id));
        result.sent++;
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        await db
          .update(dataRetentionRuns)
          .set({
            notificationStatus: "failed",
            lastError: reason,
            updatedAt: now,
          })
          .where(eq(dataRetentionRuns.id, run.id));
        result.failed++;
        log.warn(`WA retensi gagal tenant=${tenant.id}: ${reason}`);
      }
    } catch (error) {
      result.failed++;
      log.error(
        `Gagal menyiapkan notifikasi retensi tenant=${tenant.id}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
  return result;
}

async function runPurges(now: Date, currentYear: number) {
  if (!isRetentionPurgeWindowOpen(now)) {
    return { archived: 0, purged: 0, failed: 0, skipped: 0 };
  }
  const candidateRuns = await db
    .select()
    .from(dataRetentionRuns)
    .where(
      and(
        eq(dataRetentionRuns.notificationStatus, "sent"),
        or(
          inArray(dataRetentionRuns.purgeStatus, ["pending", "failed"]),
          and(
            eq(dataRetentionRuns.purgeStatus, "running"),
            lt(dataRetentionRuns.updatedAt, new Date(now.getTime() - DAY_MS))
          )
        )
      )
    );
  const pendingRuns = candidateRuns.filter(
    (run) => isAnnualPeriod(run.period) && Number(run.period) <= currentYear
  );
  const result = { archived: 0, purged: 0, failed: 0, skipped: 0 };
  for (const run of pendingRuns) {
    const claimed = await db
      .update(dataRetentionRuns)
      .set({ purgeStatus: "running", lastError: null, updatedAt: now })
      .where(
        and(
          eq(dataRetentionRuns.id, run.id),
          or(
            inArray(dataRetentionRuns.purgeStatus, ["pending", "failed"]),
            and(
              eq(dataRetentionRuns.purgeStatus, "running"),
              lt(dataRetentionRuns.updatedAt, new Date(now.getTime() - DAY_MS))
            )
          )
        )
      )
      .returning({ id: dataRetentionRuns.id });
    if (!claimed.length) {
      result.skipped++;
      continue;
    }

    try {
      const tenant = await db.query.tenants.findFirst({
        where: eq(tenants.id, run.tenantId),
        columns: { id: true, namaUsaha: true, domain: true },
      });
      if (!tenant) throw new Error("Tenant tidak ditemukan saat retensi dijalankan.");
      const cutoff = cutoffForPeriod(run.period);
      const plan = await buildRetentionPlan(tenant.id, cutoff);
      const counts = rowCounts(plan);
      const hasData = Object.values(counts).some((count) => count > 0);
      const archivePath = hasData
        ? await saveRetentionArchive(tenant, run.period, cutoff, plan)
        : null;
      if (archivePath) result.archived++;
      const deletedCounts = hasData ? await deleteRetentionPlan(plan) : {};
      await db
        .update(dataRetentionRuns)
        .set({
          purgeStatus: "completed",
          archivePath,
          deletedCounts,
          lastError: null,
          updatedAt: now,
        })
        .where(eq(dataRetentionRuns.id, run.id));
      result.purged++;
      log.info(`Retensi selesai tenant=${tenant.id}, period=${run.period}`, deletedCounts);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      await db
        .update(dataRetentionRuns)
        .set({ purgeStatus: "failed", lastError: reason, updatedAt: now })
        .where(eq(dataRetentionRuns.id, run.id));
      result.failed++;
      log.error(`Purge retensi gagal tenant=${run.tenantId}: ${reason}`);
    }
  }
  return result;
}

export async function runDataRetentionCycle(now = new Date()) {
  const period = annualPeriod(now);
  const { year } = getZonedParts(now);
  const cutoff = cutoffForYear(year);
  const result = {
    period,
    notification: { sent: 0, failed: 0, skipped: 0 },
    purge: { archived: 0, purged: 0, failed: 0, skipped: 0 },
  };
  if (isRetentionNotificationWindow(now)) {
    result.notification = await runNotifications(now, period, cutoff);
  }
  result.purge = await runPurges(now, year);
  return result;
}
