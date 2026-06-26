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
  advancePelangganDueDate,
  getTagihanSummary,
  resolvePayableTagihan,
  type PaymentSelection,
} from "@/features/billing/tagihan-service";
import { createLogger } from "@/lib/logger";
import { newId } from "@/lib/utils";

const log = createLogger("billing:payment");

export interface PayTagihanResult {
  receiptId: string;
  noNota: string;
  total: number;
}

export async function payTagihan(input: {
  tenantId: string;
  pelangganId: string;
  selection: PaymentSelection;
  metode: string;
  idempotencyKey: string;
  createdBy?: string | null;
  kolektorUserId?: string;
}): Promise<PayTagihanResult> {
  const key = input.idempotencyKey.trim();
  if (!key) throw new Error("Kunci idempotency wajib diisi.");

  const existingAttempt = await db.query.paymentAttempts.findFirst({
    where: and(
      eq(paymentAttempts.tenantId, input.tenantId),
      eq(paymentAttempts.idempotencyKey, key)
    ),
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
      };
    }
  }
  if (existingAttempt?.status === "pending") {
    throw new Error("Pembayaran sedang diproses. Tunggu sebentar.");
  }

  if (input.kolektorUserId) {
    const cust = await db.query.pelanggan.findFirst({
      where: and(
        eq(pelanggan.tenantId, input.tenantId),
        eq(pelanggan.id, input.pelangganId)
      ),
    });
    if (!cust || cust.kolektorId !== input.kolektorUserId) {
      throw new Error("Pelanggan ini bukan area penagihan Anda.");
    }
  }

  const summary = await getTagihanSummary(input.tenantId, input.pelangganId);
  const payable = resolvePayableTagihan(summary, input.selection);

  if (payable.length === 0) {
    if (input.selection === "bulan_ini") {
      throw new Error("Tidak ada tagihan bulan ini yang dapat dibayar.");
    }
    throw new Error("Tidak ada tagihan yang dapat dibayar.");
  }

  const attemptId = newId("pay");
  await db.insert(paymentAttempts).values({
    id: attemptId,
    tenantId: input.tenantId,
    pelangganId: input.pelangganId,
    idempotencyKey: key,
    selection: input.selection,
    status: "pending",
  });

  const tagihanIds = payable.map((t) => t.id);
  const locked = await db
    .update(tagihan)
    .set({ status: "processing" })
    .where(
      and(
        eq(tagihan.tenantId, input.tenantId),
        inArray(tagihan.id, tagihanIds),
        inArray(tagihan.status, ["open", "tunggakan"])
      )
    )
    .returning({ id: tagihan.id });

  if (locked.length !== tagihanIds.length) {
    await db
      .update(paymentAttempts)
      .set({ status: "failed" })
      .where(eq(paymentAttempts.id, attemptId));
    throw new Error("Tagihan sudah dibayar atau sedang diproses.");
  }

  const now = new Date();
  const total = payable.reduce((s, t) => s + t.amount, 0);
  const lineItems = payable.map((t) => ({
    periode: t.periode,
    amount: t.amount,
    label: summary.tunggakan.some((x) => x.id === t.id)
      ? `Tunggakan ${t.periode}`
      : `Tagihan ${t.periode}`,
  }));

  const count = await db.$count(invoices, eq(invoices.tenantId, input.tenantId));
  const receiptId = newId("inv");
  const noNota = `NOTA-${String(count + 1).padStart(4, "0")}`;

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

    for (const t of payable) {
      await db
        .update(tagihan)
        .set({
          status: "paid",
          receiptId,
          paidAt: now,
          metodeBayar: input.metode,
        })
        .where(eq(tagihan.id, t.id));

      await db.insert(receiptTagihanLinks).values({
        id: newId("rtl"),
        receiptId,
        tagihanId: t.id,
        amount: t.amount,
      });
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

    const paidCurrentPeriod = payable.some(
      (t) => summary.bulanIni && t.id === summary.bulanIni.id
    );
    if (paidCurrentPeriod) {
      await advancePelangganDueDate(input.tenantId, input.pelangganId);
    }

    const stillOutstanding = await getTagihanSummary(input.tenantId, input.pelangganId);
    if (!stillOutstanding.hasBulanIni && stillOutstanding.tunggakan.length === 0) {
      await setIsolasi(input.tenantId, input.pelangganId, false);
    }

    await db
      .update(paymentAttempts)
      .set({ status: "completed", receiptId })
      .where(eq(paymentAttempts.id, attemptId));

    log.info(`Pembayaran ${noNota} lunas Rp${total} via ${input.metode}`);
    return { receiptId, noNota, total };
  } catch (err) {
    for (const t of payable) {
      await db
        .update(tagihan)
        .set({ status: summary.tunggakan.some((x) => x.id === t.id) ? "tunggakan" : "open" })
        .where(
          and(eq(tagihan.id, t.id), eq(tagihan.status, "processing"))
        );
    }
    await db
      .update(paymentAttempts)
      .set({ status: "failed" })
      .where(eq(paymentAttempts.id, attemptId));
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
