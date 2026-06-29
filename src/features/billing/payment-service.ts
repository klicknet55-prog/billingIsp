import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  invoices,
  paymentAttempts,
  paymentGatewayLogs,
  pelanggan,
  receiptTagihanLinks,
  tagihan,
} from "@/lib/db/schema";
import { setIsolasi } from "@/features/customers/service";
import {
  OUTSTANDING_TAGIHAN_STATUSES,
  resolveTagihanStatusAfterPayment,
  tagihanBalance,
} from "@/features/billing/tagihan-balance";
import {
  advancePelangganDueDate,
  getTagihanSummary,
  resolvePayableTagihan,
  type PaymentSelection,
} from "@/features/billing/tagihan-service";
import { emitWebhookEvent } from "@/features/webhooks/dispatch";
import { startOfDay } from "@/features/jobs/due-date";
import { createLogger } from "@/lib/logger";
import { newId } from "@/lib/utils";

const log = createLogger("billing:payment");

export interface PayTagihanResult {
  receiptId: string;
  noNota: string;
  total: number;
  partial?: boolean;
}

type PayInputBase = {
  tenantId: string;
  pelangganId: string;
  metode: string;
  idempotencyKey: string;
  createdBy?: string | null;
  kolektorUserId?: string;
};

async function assertKolektorScope(
  tenantId: string,
  pelangganId: string,
  kolektorUserId?: string
) {
  if (!kolektorUserId) return;
  const cust = await db.query.pelanggan.findFirst({
    where: and(eq(pelanggan.tenantId, tenantId), eq(pelanggan.id, pelangganId)),
  });
  if (!cust || cust.kolektorId !== kolektorUserId) {
    throw new Error("Pelanggan ini bukan area penagihan Anda.");
  }
}

async function checkIdempotency(tenantId: string, key: string) {
  const existingAttempt = await db.query.paymentAttempts.findFirst({
    where: and(eq(paymentAttempts.tenantId, tenantId), eq(paymentAttempts.idempotencyKey, key)),
  });
  if (existingAttempt?.status === "completed" && existingAttempt.receiptId) {
    const receipt = await db.query.invoices.findFirst({
      where: eq(invoices.id, existingAttempt.receiptId),
    });
    if (receipt) {
      return {
        receiptId: receipt.id,
        noNota: receipt.noInvoice,
        total: receipt.totalTagihan,
      } satisfies PayTagihanResult;
    }
  }
  if (existingAttempt?.status === "pending") {
    throw new Error("Pembayaran sedang diproses. Tunggu sebentar.");
  }
  return null;
}

async function createReceiptNo(tenantId: string) {
  const count = await db.$count(invoices, eq(invoices.tenantId, tenantId));
  const receiptId = newId("inv");
  const noNota = `NOTA-${String(count + 1).padStart(4, "0")}`;
  return { receiptId, noNota };
}

async function finalizePaymentSideEffects(input: {
  tenantId: string;
  pelangganId: string;
  payable: (typeof tagihan.$inferSelect)[];
  summary: Awaited<ReturnType<typeof getTagihanSummary>>;
  custWasIsolated: boolean;
}) {
  const paidCurrentPeriod = input.payable.some(
    (t) => input.summary.bulanIni && t.id === input.summary.bulanIni.id && t.status === "paid"
  );
  if (paidCurrentPeriod) {
    await advancePelangganDueDate(input.tenantId, input.pelangganId);
  }

  const stillOutstanding = await getTagihanSummary(input.tenantId, input.pelangganId);
  let reactivated = false;
  if (!stillOutstanding.hasBulanIni && stillOutstanding.tunggakan.length === 0) {
    if (input.custWasIsolated) reactivated = true;
    await setIsolasi(input.tenantId, input.pelangganId, false);
  }
  return { reactivated };
}

export async function payTagihan(
  input: PayInputBase & {
    selection: PaymentSelection;
  }
): Promise<PayTagihanResult> {
  const key = input.idempotencyKey.trim();
  if (!key) throw new Error("Kunci idempotency wajib diisi.");

  const cached = await checkIdempotency(input.tenantId, key);
  if (cached) return cached;

  await assertKolektorScope(input.tenantId, input.pelangganId, input.kolektorUserId);

  const summary = await getTagihanSummary(input.tenantId, input.pelangganId);
  const payable = resolvePayableTagihan(summary, input.selection);

  if (payable.length === 0) {
    if (input.selection === "bulan_ini") {
      throw new Error("Tidak ada tagihan bulan ini yang dapat dibayar.");
    }
    throw new Error("Tidak ada tagihan yang dapat dibayar.");
  }

  const payments = payable.map((t) => ({
    tagihan: t,
    amount: tagihanBalance(t),
  }));

  return executeTagihanPayments({
    ...input,
    payments,
    selection: input.selection,
    summary,
  });
}

export async function payPartialTagihan(
  input: PayInputBase & {
    tagihanId: string;
    amount: number;
  }
): Promise<PayTagihanResult> {
  const key = input.idempotencyKey.trim();
  if (!key) throw new Error("Kunci idempotency wajib diisi.");
  if (!Number.isInteger(input.amount) || input.amount <= 0) {
    throw new Error("Nominal pembayaran tidak valid.");
  }

  const cached = await checkIdempotency(input.tenantId, key);
  if (cached) return cached;

  await assertKolektorScope(input.tenantId, input.pelangganId, input.kolektorUserId);

  const row = await db.query.tagihan.findFirst({
    where: and(
      eq(tagihan.tenantId, input.tenantId),
      eq(tagihan.pelangganId, input.pelangganId),
      eq(tagihan.id, input.tagihanId)
    ),
  });
  if (!row || !OUTSTANDING_TAGIHAN_STATUSES.includes(row.status as (typeof OUTSTANDING_TAGIHAN_STATUSES)[number])) {
    throw new Error("Tagihan tidak ditemukan atau sudah lunas.");
  }

  const balance = tagihanBalance(row);
  if (input.amount > balance) {
    throw new Error(`Nominal melebihi sisa tagihan (${balance}).`);
  }

  const summary = await getTagihanSummary(input.tenantId, input.pelangganId);

  return executeTagihanPayments({
    tenantId: input.tenantId,
    pelangganId: input.pelangganId,
    metode: input.metode,
    idempotencyKey: key,
    createdBy: input.createdBy,
    kolektorUserId: input.kolektorUserId,
    payments: [{ tagihan: row, amount: input.amount }],
    selection: "bulan_ini",
    summary,
    partial: input.amount < balance,
  });
}

async function executeTagihanPayments(input: {
  tenantId: string;
  pelangganId: string;
  metode: string;
  idempotencyKey: string;
  createdBy?: string | null;
  kolektorUserId?: string;
  payments: Array<{ tagihan: typeof tagihan.$inferSelect; amount: number }>;
  selection: PaymentSelection;
  summary: Awaited<ReturnType<typeof getTagihanSummary>>;
  partial?: boolean;
}): Promise<PayTagihanResult> {
  const custBefore = await db.query.pelanggan.findFirst({
    where: and(
      eq(pelanggan.tenantId, input.tenantId),
      eq(pelanggan.id, input.pelangganId)
    ),
    columns: { isIsolated: true },
  });

  const attemptId = newId("pay");
  await db.insert(paymentAttempts).values({
    id: attemptId,
    tenantId: input.tenantId,
    pelangganId: input.pelangganId,
    idempotencyKey: input.idempotencyKey,
    selection: input.selection,
    status: "pending",
  });

  const tagihanIds = input.payments.map((p) => p.tagihan.id);
  const locked = await db
    .update(tagihan)
    .set({ status: "processing" })
    .where(
      and(
        eq(tagihan.tenantId, input.tenantId),
        inArray(tagihan.id, tagihanIds),
        inArray(tagihan.status, [...OUTSTANDING_TAGIHAN_STATUSES])
      )
    )
    .returning();

  if (locked.length !== tagihanIds.length) {
    await db.update(paymentAttempts).set({ status: "failed" }).where(eq(paymentAttempts.id, attemptId));
    throw new Error("Tagihan sudah dibayar atau sedang diproses.");
  }

  const freshRows = await db.query.tagihan.findMany({
    where: inArray(tagihan.id, tagihanIds),
  });
  const freshById = new Map(freshRows.map((r) => [r.id, r]));

  const now = new Date();
  const total = input.payments.reduce((s, p) => s + p.amount, 0);
  const lineItems = input.payments.map((p) => {
    const t = freshById.get(p.tagihan.id)!;
    const labelBase = input.summary.tunggakan.some((x) => x.id === t.id)
      ? `Tunggakan ${t.periode}`
      : `Tagihan ${t.periode}`;
    const partialLabel = p.amount < tagihanBalance(t) ? " (sebagian)" : "";
    return {
      periode: t.periode,
      amount: p.amount,
      label: `${labelBase}${partialLabel}`,
    };
  });

  const { receiptId, noNota } = await createReceiptNo(input.tenantId);

  try {
    await db.insert(invoices).values({
      id: receiptId,
      tenantId: input.tenantId,
      pelangganId: input.pelangganId,
      noInvoice: noNota,
      totalTagihan: total,
      status: "paid",
      lineItems,
      tglLunas: now,
      metodeBayar: input.metode,
      createdBy: input.createdBy ?? null,
    });

    const updatedTagihan: (typeof tagihan.$inferSelect)[] = [];

    for (const p of input.payments) {
      const t = freshById.get(p.tagihan.id)!;
      const wasTunggakan = t.status === "tunggakan" || startOfDay(t.dueDate) < startOfDay(now);
      const newPaid = (t.amountPaid ?? 0) + p.amount;
      const newStatus = resolveTagihanStatusAfterPayment(
        { amount: t.amount, amountPaid: newPaid },
        wasTunggakan
      );

      await db
        .update(tagihan)
        .set({
          status: newStatus,
          amountPaid: newPaid,
          receiptId: newStatus === "paid" ? receiptId : t.receiptId,
          paidAt: newStatus === "paid" ? now : t.paidAt,
          metodeBayar: input.metode,
        })
        .where(eq(tagihan.id, t.id));

      await db.insert(receiptTagihanLinks).values({
        id: newId("rtl"),
        receiptId,
        tagihanId: t.id,
        amount: p.amount,
      });

      updatedTagihan.push({ ...t, status: newStatus, amountPaid: newPaid });
    }

    await db.insert(paymentGatewayLogs).values({
      id: newId("pgl"),
      tenantId: input.tenantId,
      referenceType: "invoice",
      referenceId: receiptId,
      duitkuOrderId: `NOTA-${receiptId}`,
      status: "success",
      amount: total,
      paymentMethod: input.metode,
    });

    const { reactivated } = await finalizePaymentSideEffects({
      tenantId: input.tenantId,
      pelangganId: input.pelangganId,
      payable: updatedTagihan,
      summary: input.summary,
      custWasIsolated: !!custBefore?.isIsolated,
    });

    await db
      .update(paymentAttempts)
      .set({ status: "completed", receiptId })
      .where(eq(paymentAttempts.id, attemptId));

    for (const p of input.payments) {
      const t = updatedTagihan.find((x) => x.id === p.tagihan.id)!;
      const event = t.status === "paid" ? "tagihan.paid" : "tagihan.partial_paid";
      emitWebhookEvent(input.tenantId, event, {
        tagihanId: t.id,
        pelangganId: input.pelangganId,
        amount: p.amount,
        amountPaid: t.amountPaid,
        balance: tagihanBalance(t),
        paidAt: now.toISOString(),
        metode: input.metode,
      });
    }
    if (reactivated) {
      emitWebhookEvent(input.tenantId, "pelanggan.activated", {
        pelangganId: input.pelangganId,
      });
    }

    const kind = input.partial ? "sebagian" : "lunas";
    log.info(`Pembayaran ${noNota} ${kind} Rp${total} via ${input.metode}`);
    return { receiptId, noNota, total, partial: input.partial };
  } catch (err) {
    for (const p of input.payments) {
      const orig = p.tagihan;
      const revertStatus =
        orig.amountPaid && orig.amountPaid > 0
          ? "partial"
          : startOfDay(orig.dueDate) < startOfDay(now)
            ? "tunggakan"
            : "open";
      await db
        .update(tagihan)
        .set({ status: revertStatus })
        .where(and(eq(tagihan.id, orig.id), eq(tagihan.status, "processing")));
    }
    await db.update(paymentAttempts).set({ status: "failed" }).where(eq(paymentAttempts.id, attemptId));
    throw err;
  }
}

export async function getReceiptDetail(tenantId: string, receiptId: string) {
  const inv = await db.query.invoices.findFirst({
    where: and(eq(invoices.tenantId, tenantId), eq(invoices.id, receiptId)),
  });
  if (!inv || inv.status !== "paid") return null;

  const cust = await db.query.pelanggan.findFirst({
    where: and(eq(pelanggan.tenantId, tenantId), eq(pelanggan.id, inv.pelangganId)),
  });

  const links = await db.query.receiptTagihanLinks.findMany({
    where: eq(receiptTagihanLinks.receiptId, receiptId),
  });

  return { receipt: inv, pelanggan: cust, links };
}
