import "server-only";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { hashPassword } from "@/lib/auth/password";
import { databaseDriver, db } from "@/lib/db";
import {
  paymentGatewayLogs,
  salesAttributionAudits,
  salesCommissions,
  salesCommissionPayoutRequests,
  salesCommissionRetentionSummaries,
  salesProfiles,
  tenantSalesAttributions,
  tenants,
  users,
} from "@/lib/db/schema";
import { createLogger } from "@/lib/logger";
import { newId } from "@/lib/utils";

const log = createLogger("sales");
const MAX_COMMISSION_RATE_BPS = 10_000;

export function percentToBasisPoints(percent: number): number {
  return Math.round(percent * 100);
}

export function basisPointsToPercent(basisPoints: number): number {
  return basisPoints / 100;
}

export function normalizeSalesReferralCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

async function generateSalesReferralCode(): Promise<string> {
  for (let attempt = 0; attempt < 12; attempt++) {
    const code = `SA-${newId().slice(-6).toUpperCase()}`;
    const existing = await db.query.salesProfiles.findFirst({
      where: eq(salesProfiles.referralCode, code),
      columns: { userId: true },
    });
    if (!existing) return code;
  }
  throw new Error("Gagal membuat kode referral sales yang unik.");
}

export async function listSalesProfiles() {
  return db
    .select({
      userId: users.id,
      nama: users.nama,
      email: users.email,
      isUserActive: users.isActive,
      referralCode: salesProfiles.referralCode,
      commissionRateBps: salesProfiles.commissionRateBps,
      isActive: salesProfiles.isActive,
      createdAt: salesProfiles.createdAt,
    })
    .from(salesProfiles)
    .innerJoin(users, eq(users.id, salesProfiles.userId))
    .orderBy(desc(salesProfiles.createdAt));
}

export async function listActiveSalesProfiles() {
  return db
    .select({
      userId: users.id,
      nama: users.nama,
      referralCode: salesProfiles.referralCode,
    })
    .from(salesProfiles)
    .innerJoin(users, eq(users.id, salesProfiles.userId))
    .where(and(eq(salesProfiles.isActive, true), eq(users.isActive, true)))
    .orderBy(users.nama);
}

export async function getActiveSalesByReferralCode(code: string) {
  const referralCode = normalizeSalesReferralCode(code);
  if (!referralCode) return null;
  return db
    .select({
      userId: users.id,
      commissionRateBps: salesProfiles.commissionRateBps,
    })
    .from(salesProfiles)
    .innerJoin(users, eq(users.id, salesProfiles.userId))
    .where(
      and(
        eq(salesProfiles.referralCode, referralCode),
        eq(salesProfiles.isActive, true),
        eq(users.isActive, true),
        eq(users.role, "sales")
      )
    )
    .then((rows) => rows[0] ?? null);
}

export async function getSalesCommissionSnapshotForTenant(tenantId: string) {
  const rows = await db
    .select({
      salesUserId: tenantSalesAttributions.salesUserId,
      commissionRateBps: salesProfiles.commissionRateBps,
    })
    .from(tenantSalesAttributions)
    .innerJoin(salesProfiles, eq(salesProfiles.userId, tenantSalesAttributions.salesUserId))
    .where(eq(tenantSalesAttributions.tenantId, tenantId))
    .limit(1);
  return rows[0] ?? null;
}

export async function createSalesAccount(input: {
  nama: string;
  email: string;
  password: string;
  commissionRateBps: number;
}) {
  if (
    !Number.isInteger(input.commissionRateBps) ||
    input.commissionRateBps < 0 ||
    input.commissionRateBps > MAX_COMMISSION_RATE_BPS
  ) {
    throw new Error("Fee sales harus antara 0% dan 100%.");
  }

  const email = input.email.trim().toLowerCase();
  const existing = await db.query.users.findFirst({
    where: eq(users.email, email),
    columns: { id: true },
  });
  if (existing) throw new Error("Email sudah terdaftar.");

  const userId = newId("usr");
  const referralCode = await generateSalesReferralCode();
  const userValues = {
      id: userId,
      tenantId: null,
      nama: input.nama.trim(),
      email,
      passwordHash: hashPassword(input.password),
      role: "sales",
      phone: null,
      isActive: true,
    } as const;
  const profileValues = {
      userId,
      referralCode,
      commissionRateBps: input.commissionRateBps,
    } as const;
  if (databaseDriver === "sqlite") {
    db.transaction((tx) => {
      tx.insert(users).values(userValues).run();
      tx.insert(salesProfiles).values(profileValues).run();
    });
  } else {
    await db.transaction(async (tx) => {
      await tx.insert(users).values(userValues);
      await tx.insert(salesProfiles).values(profileValues);
    });
  }
  log.info(`Akun sales dibuat: ${userId} (${email})`);
}

export async function updateSalesProfile(input: {
  salesUserId: string;
  commissionRateBps: number;
  isActive: boolean;
}) {
  if (
    !Number.isInteger(input.commissionRateBps) ||
    input.commissionRateBps < 0 ||
    input.commissionRateBps > MAX_COMMISSION_RATE_BPS
  ) {
    throw new Error("Fee sales harus antara 0% dan 100%.");
  }
  const profile = await db.query.salesProfiles.findFirst({
    where: eq(salesProfiles.userId, input.salesUserId),
  });
  if (!profile) throw new Error("Profil sales tidak ditemukan.");
  const profileUpdate = {
        commissionRateBps: input.commissionRateBps,
        isActive: input.isActive,
        updatedAt: new Date(),
      };
  if (databaseDriver === "sqlite") {
    db.transaction((tx) => {
      tx
        .update(salesProfiles)
        .set(profileUpdate)
        .where(eq(salesProfiles.userId, input.salesUserId))
        .run();
      tx
        .update(users)
        .set({ isActive: input.isActive })
        .where(and(eq(users.id, input.salesUserId), eq(users.role, "sales")))
        .run();
    });
  } else {
    await db.transaction(async (tx) => {
      await tx
        .update(salesProfiles)
        .set(profileUpdate)
        .where(eq(salesProfiles.userId, input.salesUserId));
      await tx
        .update(users)
        .set({ isActive: input.isActive })
        .where(and(eq(users.id, input.salesUserId), eq(users.role, "sales")));
    });
  }
  log.info(`Profil sales diperbarui: ${input.salesUserId}`);
}

export async function rotateSalesReferralCode(salesUserId: string) {
  const profile = await db.query.salesProfiles.findFirst({
    where: eq(salesProfiles.userId, salesUserId),
  });
  if (!profile) throw new Error("Profil sales tidak ditemukan.");
  const referralCode = await generateSalesReferralCode();
  await db
    .update(salesProfiles)
    .set({ referralCode, updatedAt: new Date() })
    .where(eq(salesProfiles.userId, salesUserId));
  log.info(`Kode referral sales diganti: ${salesUserId}`);
}

export async function assignTenantToSales(input: {
  tenantId: string;
  salesUserId: string;
  changedBy: string | null;
  source: "referral_code" | "manual";
  confirmed?: boolean;
  reason?: string | null;
}) {
  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, input.tenantId),
    columns: { id: true, namaUsaha: true },
  });
  if (!tenant) throw new Error("Tenant tidak ditemukan.");

  const profile = await db.query.salesProfiles.findFirst({
    where: eq(salesProfiles.userId, input.salesUserId),
    columns: { userId: true, isActive: true },
  });
  const salesUser = await db.query.users.findFirst({
    where: and(eq(users.id, input.salesUserId), eq(users.role, "sales")),
    columns: { id: true, isActive: true },
  });
  if (!profile || !salesUser || !profile.isActive || !salesUser.isActive) {
    throw new Error("Akun sales tidak ditemukan atau tidak aktif.");
  }

  const writeAttribution = (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => {
    const previous = tx
      .select()
      .from(tenantSalesAttributions)
      .where(eq(tenantSalesAttributions.tenantId, input.tenantId))
      .get();
    if (previous?.salesUserId === input.salesUserId) return false;
    if (previous && input.source === "manual" && !input.confirmed) {
      throw new Error("Konfirmasi perubahan atribusi tenant wajib diberikan.");
    }
    tx
      .insert(tenantSalesAttributions)
      .values({
        tenantId: input.tenantId,
        salesUserId: input.salesUserId,
        source: input.source,
        attributedBy: input.changedBy,
      })
      .onConflictDoUpdate({
        target: tenantSalesAttributions.tenantId,
        set: {
          salesUserId: input.salesUserId,
          source: input.source,
          attributedBy: input.changedBy,
          attributedAt: new Date(),
        },
      })
      .run();
    tx.insert(salesAttributionAudits).values({
      id: newId("saudit"),
      tenantId: input.tenantId,
      previousSalesUserId: previous?.salesUserId ?? null,
      nextSalesUserId: input.salesUserId,
      source: input.source,
      changedBy: input.changedBy,
      reason: input.reason?.trim() || null,
    }).run();
    return true;
  };
  let changed: boolean;
  if (databaseDriver === "sqlite") {
    changed = db.transaction(writeAttribution);
  } else {
    changed = await db.transaction(async (tx) => {
      const previousRows = await tx
        .select()
        .from(tenantSalesAttributions)
        .where(eq(tenantSalesAttributions.tenantId, input.tenantId))
        .limit(1);
      const previous = previousRows[0];
      if (previous?.salesUserId === input.salesUserId) return false;
      if (previous && input.source === "manual" && !input.confirmed) {
        throw new Error("Konfirmasi perubahan atribusi tenant wajib diberikan.");
      }
      await tx
        .insert(tenantSalesAttributions)
        .values({
          tenantId: input.tenantId,
          salesUserId: input.salesUserId,
          source: input.source,
          attributedBy: input.changedBy,
        })
        .onConflictDoUpdate({
          target: tenantSalesAttributions.tenantId,
          set: {
            salesUserId: input.salesUserId,
            source: input.source,
            attributedBy: input.changedBy,
            attributedAt: new Date(),
          },
        });
      await tx.insert(salesAttributionAudits).values({
        id: newId("saudit"),
        tenantId: input.tenantId,
        previousSalesUserId: previous?.salesUserId ?? null,
        nextSalesUserId: input.salesUserId,
        source: input.source,
        changedBy: input.changedBy,
        reason: input.reason?.trim() || null,
      });
      return true;
    });
  }
  if (!changed) return false;
  log.info(
    `Atribusi tenant diperbarui: ${input.tenantId} -> ${input.salesUserId} (${input.source})`
  );
  return true;
}

export async function listTenantSalesAttributions() {
  return db
    .select({
      tenantId: tenants.id,
      tenantName: tenants.namaUsaha,
      domain: tenants.domain,
      salesUserId: users.id,
      salesName: users.nama,
      salesEmail: users.email,
      source: tenantSalesAttributions.source,
      attributedAt: tenantSalesAttributions.attributedAt,
    })
    .from(tenantSalesAttributions)
    .innerJoin(tenants, eq(tenants.id, tenantSalesAttributions.tenantId))
    .innerJoin(users, eq(users.id, tenantSalesAttributions.salesUserId))
    .orderBy(desc(tenantSalesAttributions.attributedAt))
    .limit(500);
}

export async function listTenantSalesAssignmentOptions() {
  return db
    .select({
      tenantId: tenants.id,
      tenantName: tenants.namaUsaha,
      domain: tenants.domain,
    })
    .from(tenants)
    .orderBy(tenants.namaUsaha)
    .limit(500);
}

export async function listRecentSalesAttributionAudits() {
  return db
    .select({
      id: salesAttributionAudits.id,
      tenantName: tenants.namaUsaha,
      previousSalesName: sql<string | null>`(
        SELECT ${users.nama} FROM ${users}
        WHERE ${users.id} = ${salesAttributionAudits.previousSalesUserId}
      )`,
      nextSalesName: sql<string | null>`(
        SELECT ${users.nama} FROM ${users}
        WHERE ${users.id} = ${salesAttributionAudits.nextSalesUserId}
      )`,
      source: salesAttributionAudits.source,
      reason: salesAttributionAudits.reason,
      createdAt: salesAttributionAudits.createdAt,
    })
    .from(salesAttributionAudits)
    .innerJoin(tenants, eq(tenants.id, salesAttributionAudits.tenantId))
    .orderBy(desc(salesAttributionAudits.createdAt))
    .limit(100);
}

export async function recordSalesCommissionForPayment(paymentLogId: string) {
  const payment = await db.query.paymentGatewayLogs.findFirst({
    where: eq(paymentGatewayLogs.id, paymentLogId),
  });
  if (
    !payment ||
    payment.status !== "success" ||
    payment.referenceType !== "subscription" ||
    (payment.referenceId !== payment.tenantId && !payment.referenceId.startsWith("UPG:")) ||
    !payment.tenantId ||
    payment.amount <= 0
  ) {
    return false;
  }

  if (!payment.salesUserId || payment.commissionRateBps === null) return false;
  const snapshot = {
    salesUserId: payment.salesUserId,
    commissionRateBps: payment.commissionRateBps,
  };
  if (snapshot.commissionRateBps <= 0) return false;

  const amount = Math.round((payment.amount * snapshot.commissionRateBps) / 10_000);
  if (amount <= 0) return false;

  const inserted = await db
    .insert(salesCommissions)
    .values({
      id: newId("scm"),
      salesUserId: snapshot.salesUserId,
      tenantId: payment.tenantId,
      paymentGatewayLogId: payment.id,
      entryType: "commission",
      baseAmount: payment.amount,
      commissionRateBps: snapshot.commissionRateBps,
      amount,
      status: "payable",
    })
    .onConflictDoNothing()
    .returning({ id: salesCommissions.id });
  if (inserted.length) {
    log.info(
      `Komisi tercatat: payment=${payment.id}, sales=${snapshot.salesUserId}, amount=${amount}`
    );
  } else {
    log.info(`Callback komisi idempoten: payment=${payment.id}`);
  }
  return true;
}

export async function listSalesCommissions(salesUserId?: string) {
  const where = salesUserId ? eq(salesCommissions.salesUserId, salesUserId) : undefined;
  return db
    .select({
      id: salesCommissions.id,
      salesUserId: salesCommissions.salesUserId,
      salesName: users.nama,
      tenantId: salesCommissions.tenantId,
      tenantName: tenants.namaUsaha,
      paymentGatewayLogId: salesCommissions.paymentGatewayLogId,
      entryType: salesCommissions.entryType,
      baseAmount: salesCommissions.baseAmount,
      commissionRateBps: salesCommissions.commissionRateBps,
      amount: salesCommissions.amount,
      status: salesCommissions.status,
      payoutRequestId: salesCommissions.payoutRequestId,
      payoutRequestStatus: salesCommissionPayoutRequests.status,
      payoutReference: salesCommissions.payoutReference,
      reason: salesCommissions.reason,
      paidAt: salesCommissions.paidAt,
      createdAt: salesCommissions.createdAt,
    })
    .from(salesCommissions)
    .innerJoin(users, eq(users.id, salesCommissions.salesUserId))
    .innerJoin(tenants, eq(tenants.id, salesCommissions.tenantId))
    .leftJoin(
      salesCommissionPayoutRequests,
      eq(salesCommissionPayoutRequests.id, salesCommissions.payoutRequestId)
    )
    .where(where)
    .orderBy(desc(salesCommissions.createdAt))
    .limit(500);
}

export async function listSalesCommissionPayoutRequests(salesUserId?: string) {
  const where = salesUserId
    ? eq(salesCommissionPayoutRequests.salesUserId, salesUserId)
    : undefined;
  return db
    .select({
      id: salesCommissionPayoutRequests.id,
      salesUserId: salesCommissionPayoutRequests.salesUserId,
      salesName: users.nama,
      salesEmail: users.email,
      amount: salesCommissionPayoutRequests.amount,
      status: salesCommissionPayoutRequests.status,
      payoutMethod: salesCommissionPayoutRequests.payoutMethod,
      accountName: salesCommissionPayoutRequests.accountName,
      accountNumber: salesCommissionPayoutRequests.accountNumber,
      payoutReference: salesCommissionPayoutRequests.payoutReference,
      rejectionReason: salesCommissionPayoutRequests.rejectionReason,
      reviewedBy: salesCommissionPayoutRequests.reviewedBy,
      requestedAt: salesCommissionPayoutRequests.requestedAt,
      reviewedAt: salesCommissionPayoutRequests.reviewedAt,
      paidAt: salesCommissionPayoutRequests.paidAt,
    })
    .from(salesCommissionPayoutRequests)
    .innerJoin(users, eq(users.id, salesCommissionPayoutRequests.salesUserId))
    .where(where)
    .orderBy(desc(salesCommissionPayoutRequests.requestedAt))
    .limit(500);
}

export async function createSalesCommissionPayoutRequest(input: {
  salesUserId: string;
  payoutMethod: string;
  accountName: string;
  accountNumber: string;
}) {
  const payoutMethod = input.payoutMethod.trim();
  const accountName = input.accountName.trim();
  const accountNumber = input.accountNumber.trim();
  if (!payoutMethod || !accountName || !accountNumber) {
    throw new Error("Metode dan data rekening pencairan wajib diisi.");
  }

  const requestId = newId("spay");
  const requestedAt = new Date();
  const values = {
    id: requestId,
    salesUserId: input.salesUserId,
    amount: 0,
    status: "requested" as const,
    payoutMethod,
    accountName,
    accountNumber,
    requestedAt,
  };
  let amount = 0;

  if (databaseDriver === "sqlite") {
    db.transaction((tx) => {
      const available = tx
        .select({ id: salesCommissions.id, amount: salesCommissions.amount })
        .from(salesCommissions)
        .where(
          and(
            eq(salesCommissions.salesUserId, input.salesUserId),
            eq(salesCommissions.status, "payable"),
            isNull(salesCommissions.payoutRequestId)
          )
        )
        .all();
      amount = available.reduce((sum, entry) => sum + entry.amount, 0);
      if (amount <= 0 || available.length === 0) {
        throw new Error("Belum ada saldo komisi positif yang tersedia untuk dicairkan.");
      }
      tx.insert(salesCommissionPayoutRequests)
        .values({ ...values, amount })
        .run();
      const updated = tx
        .update(salesCommissions)
        .set({ payoutRequestId: requestId })
        .where(
          and(
            inArray(
              salesCommissions.id,
              available.map((entry) => entry.id)
            ),
            eq(salesCommissions.status, "payable"),
            isNull(salesCommissions.payoutRequestId)
          )
        )
        .returning({ id: salesCommissions.id })
        .all();
      if (updated.length !== available.length) {
        throw new Error("Saldo komisi berubah saat diajukan. Silakan coba kembali.");
      }
    });
  } else {
    await db.transaction(async (tx) => {
      const available = await tx
        .select({ id: salesCommissions.id, amount: salesCommissions.amount })
        .from(salesCommissions)
        .where(
          and(
            eq(salesCommissions.salesUserId, input.salesUserId),
            eq(salesCommissions.status, "payable"),
            isNull(salesCommissions.payoutRequestId)
          )
        );
      amount = available.reduce((sum, entry) => sum + entry.amount, 0);
      if (amount <= 0 || available.length === 0) {
        throw new Error("Belum ada saldo komisi positif yang tersedia untuk dicairkan.");
      }
      await tx.insert(salesCommissionPayoutRequests).values({ ...values, amount });
      const updated = await tx
        .update(salesCommissions)
        .set({ payoutRequestId: requestId })
        .where(
          and(
            inArray(
              salesCommissions.id,
              available.map((entry) => entry.id)
            ),
            eq(salesCommissions.status, "payable"),
            isNull(salesCommissions.payoutRequestId)
          )
        )
        .returning({ id: salesCommissions.id });
      if (updated.length !== available.length) {
        throw new Error("Saldo komisi berubah saat diajukan. Silakan coba kembali.");
      }
    });
  }
  log.info(`Permintaan pencairan dibuat: ${requestId}, sales=${input.salesUserId}, amount=${amount}`);
  return { id: requestId, amount };
}

export async function reviewSalesCommissionPayoutRequest(input: {
  requestId: string;
  reviewerId: string;
  decision: "approve" | "reject";
  rejectionReason?: string;
}) {
  const reviewedAt = new Date();
  const rejectionReason = input.rejectionReason?.trim() ?? "";
  if (input.decision === "reject" && !rejectionReason) {
    throw new Error("Alasan penolakan wajib diisi.");
  }

  const updateRequest = (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => {
    const updated = tx
      .update(salesCommissionPayoutRequests)
      .set({
        status: input.decision === "approve" ? "approved" : "rejected",
        reviewedBy: input.reviewerId,
        reviewedAt,
        rejectionReason: input.decision === "reject" ? rejectionReason : null,
      })
      .where(
        and(
          eq(salesCommissionPayoutRequests.id, input.requestId),
          input.decision === "approve"
            ? eq(salesCommissionPayoutRequests.status, "requested")
            : inArray(salesCommissionPayoutRequests.status, ["requested", "approved"])
        )
      )
      .returning({ id: salesCommissionPayoutRequests.id })
      .all();
    if (!updated.length) throw new Error("Permintaan tidak ditemukan atau sudah ditinjau.");
    if (input.decision === "reject") {
      tx
        .update(salesCommissions)
        .set({ payoutRequestId: null })
        .where(eq(salesCommissions.payoutRequestId, input.requestId))
        .run();
    }
  };
  if (databaseDriver === "sqlite") {
    db.transaction(updateRequest);
  } else {
    await db.transaction(async (tx) => {
      const updated = await tx
        .update(salesCommissionPayoutRequests)
        .set({
          status: input.decision === "approve" ? "approved" : "rejected",
          reviewedBy: input.reviewerId,
          reviewedAt,
          rejectionReason: input.decision === "reject" ? rejectionReason : null,
        })
        .where(
          and(
            eq(salesCommissionPayoutRequests.id, input.requestId),
            input.decision === "approve"
              ? eq(salesCommissionPayoutRequests.status, "requested")
              : inArray(salesCommissionPayoutRequests.status, ["requested", "approved"])
          )
        )
        .returning({ id: salesCommissionPayoutRequests.id });
      if (!updated.length) throw new Error("Permintaan tidak ditemukan atau sudah ditinjau.");
      if (input.decision === "reject") {
        await tx
          .update(salesCommissions)
          .set({ payoutRequestId: null })
          .where(eq(salesCommissions.payoutRequestId, input.requestId));
      }
    });
  }
  log.info(`Permintaan pencairan ${input.decision === "approve" ? "disetujui" : "ditolak"}: ${input.requestId}`);
}

export async function paySalesCommissionPayoutRequest(input: {
  requestId: string;
  payoutReference: string;
}) {
  const payoutReference = input.payoutReference.trim();
  if (!payoutReference) throw new Error("Referensi pembayaran wajib diisi.");
  const paidAt = new Date();

  if (databaseDriver === "sqlite") {
    db.transaction((tx) => {
      const request = tx
        .select({ status: salesCommissionPayoutRequests.status })
        .from(salesCommissionPayoutRequests)
        .where(eq(salesCommissionPayoutRequests.id, input.requestId))
        .get();
      if (!request || request.status !== "approved") {
        throw new Error("Hanya permintaan yang disetujui yang dapat ditandai sudah dibayar.");
      }
      const updated = tx
        .update(salesCommissions)
        .set({ status: "paid", payoutReference, paidAt })
        .where(
          and(
            eq(salesCommissions.payoutRequestId, input.requestId),
            eq(salesCommissions.status, "payable")
          )
        )
        .returning({ id: salesCommissions.id })
        .all();
      if (!updated.length) throw new Error("Permintaan tidak memiliki komisi yang dapat dibayar.");
      const requestUpdated = tx
        .update(salesCommissionPayoutRequests)
        .set({ status: "paid", payoutReference, paidAt })
        .where(
          and(
            eq(salesCommissionPayoutRequests.id, input.requestId),
            eq(salesCommissionPayoutRequests.status, "approved")
          )
        )
        .returning({ id: salesCommissionPayoutRequests.id })
        .all();
      if (!requestUpdated.length) throw new Error("Status permintaan berubah saat pembayaran dicatat.");
    });
  } else {
    await db.transaction(async (tx) => {
      const request = await tx
        .select({ status: salesCommissionPayoutRequests.status })
        .from(salesCommissionPayoutRequests)
        .where(eq(salesCommissionPayoutRequests.id, input.requestId))
        .limit(1);
      if (!request[0] || request[0].status !== "approved") {
        throw new Error("Hanya permintaan yang disetujui yang dapat ditandai sudah dibayar.");
      }
      const updated = await tx
        .update(salesCommissions)
        .set({ status: "paid", payoutReference, paidAt })
        .where(
          and(
            eq(salesCommissions.payoutRequestId, input.requestId),
            eq(salesCommissions.status, "payable")
          )
        )
        .returning({ id: salesCommissions.id });
      if (!updated.length) throw new Error("Permintaan tidak memiliki komisi yang dapat dibayar.");
      const requestUpdated = await tx
        .update(salesCommissionPayoutRequests)
        .set({ status: "paid", payoutReference, paidAt })
        .where(
          and(
            eq(salesCommissionPayoutRequests.id, input.requestId),
            eq(salesCommissionPayoutRequests.status, "approved")
          )
        )
        .returning({ id: salesCommissionPayoutRequests.id });
      if (!requestUpdated.length) throw new Error("Status permintaan berubah saat pembayaran dicatat.");
    });
  }
  log.info(`Permintaan pencairan dibayar: ${input.requestId}`);
}

export async function reverseSalesCommission(input: {
  commissionId: string;
  reason: string;
}) {
  const commission = await db.query.salesCommissions.findFirst({
    where: eq(salesCommissions.id, input.commissionId),
  });
  if (!commission || commission.entryType !== "commission" || commission.status === "reversed") {
    throw new Error("Komisi tidak ditemukan atau sudah dibalik.");
  }
  if (commission.payoutRequestId && commission.status !== "paid") {
    throw new Error("Tolak permintaan pencairan yang masih aktif sebelum membalik komisi.");
  }
  const reason = input.reason.trim();
  if (!reason) throw new Error("Alasan pembalikan komisi wajib diisi.");

  const reversalValues = {
        id: newId("scm"),
        salesUserId: commission.salesUserId,
        tenantId: commission.tenantId,
        reversalOfId: commission.id,
        entryType: "reversal",
        baseAmount: -commission.baseAmount,
        commissionRateBps: commission.commissionRateBps,
        amount: -commission.amount,
        status: commission.status === "paid" ? "payable" : "reversed",
        reason,
      } as const;
  const updateCommission = (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => {
    const updated = tx
      .update(salesCommissions)
      .set(
        commission.status === "payable"
          ? { status: "reversed", reason }
          : { reason }
      )
      .where(
        and(
          eq(salesCommissions.id, commission.id),
          eq(salesCommissions.status, commission.status)
        )
      )
      .returning({ id: salesCommissions.id })
      .all();
    if (!updated.length) throw new Error("Komisi sudah diproses oleh tindakan lain.");
    tx
      .insert(salesCommissions)
      .values(reversalValues)
      .onConflictDoNothing()
      .run();
  };
  if (databaseDriver === "sqlite") {
    db.transaction(updateCommission);
  } else {
    await db.transaction(async (tx) => {
      const updated = await tx
        .update(salesCommissions)
        .set(
          commission.status === "payable"
            ? { status: "reversed", reason }
            : { reason }
        )
        .where(
          and(
            eq(salesCommissions.id, commission.id),
            eq(salesCommissions.status, commission.status)
          )
        )
        .returning({ id: salesCommissions.id });
      if (!updated.length) throw new Error("Komisi sudah diproses oleh tindakan lain.");
      await tx
        .insert(salesCommissions)
        .values(reversalValues)
        .onConflictDoNothing();
    });
  }
  log.info(`Komisi dibalik: ${commission.id} (${commission.status})`);
}

export async function getSalesDashboard(salesUserId: string) {
  const profile = await db.query.salesProfiles.findFirst({
    where: eq(salesProfiles.userId, salesUserId),
  });
  if (!profile) throw new Error("Profil sales tidak ditemukan.");

  const tenantsBySales = await db
    .select({
      id: tenants.id,
      namaUsaha: tenants.namaUsaha,
      domain: tenants.domain,
      status: tenants.status,
      source: tenantSalesAttributions.source,
      attributedAt: tenantSalesAttributions.attributedAt,
    })
    .from(tenantSalesAttributions)
    .innerJoin(tenants, eq(tenants.id, tenantSalesAttributions.tenantId))
    .where(eq(tenantSalesAttributions.salesUserId, salesUserId))
    .orderBy(desc(tenantSalesAttributions.attributedAt))
    .limit(500);

  const commissions = await listSalesCommissions(salesUserId);
  const payoutRequests = await listSalesCommissionPayoutRequests(salesUserId);
  const [payableBalance, paidBalance, archivedPaidBalance] = await Promise.all([
    db
      .select({ amount: sql<number>`coalesce(sum(${salesCommissions.amount}), 0)` })
      .from(salesCommissions)
      .where(
        and(
          eq(salesCommissions.salesUserId, salesUserId),
          eq(salesCommissions.status, "payable"),
          isNull(salesCommissions.payoutRequestId)
        )
      ),
    db
      .select({ amount: sql<number>`coalesce(sum(${salesCommissions.amount}), 0)` })
      .from(salesCommissions)
      .where(
        and(
          eq(salesCommissions.salesUserId, salesUserId),
          eq(salesCommissions.status, "paid")
        )
      ),
    db
      .select({
        amount: sql<number>`coalesce(sum(${salesCommissionRetentionSummaries.paidAmount}), 0)`,
      })
      .from(salesCommissionRetentionSummaries)
      .where(eq(salesCommissionRetentionSummaries.salesUserId, salesUserId)),
  ]);
  return {
    profile,
    tenants: tenantsBySales,
    commissions,
    payoutRequests,
    payableAmount: Number(payableBalance[0]?.amount ?? 0),
    paidAmount:
      Number(paidBalance[0]?.amount ?? 0) + Number(archivedPaidBalance[0]?.amount ?? 0),
  };
}
