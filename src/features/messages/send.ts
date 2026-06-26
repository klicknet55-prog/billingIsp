import "server-only";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { hasAnyOutstanding } from "@/features/billing/tagihan-service";
import {
  messageBatches,
  messageSendLogs,
  pelanggan,
  tagihan,
  tenants,
  users,
} from "@/lib/db/schema";
import { getTenantWhatsAppConfig } from "@/features/integrations/service";
import { getWhatsAppClient } from "@/lib/integrations/whatsapp";
import { newId } from "@/lib/utils";
import { buildPelangganContext, buildTenantOwnerContext } from "@/features/messages/context";
import { renderTemplate } from "@/features/messages/render";
import { getTemplateBody } from "@/features/messages/templates";
import { paceAfterSend, waitBeforeSend } from "@/features/messages/throttle";
import type { MessageScope, MessageType } from "@/features/messages/types";

function isWhatsAppConfigured(): boolean {
  if (process.env.WHATSAPP_DRIVER !== "real") return true;
  return Boolean(process.env.WHATSAPP_API_URL?.trim() && process.env.WHATSAPP_API_TOKEN?.trim());
}

export async function assertWhatsAppReady(tenantId?: string | null) {
  if (tenantId) {
    const cfg = await getTenantWhatsAppConfig(tenantId);
    if (!cfg && process.env.WHATSAPP_DRIVER === "real") {
      throw new Error("WhatsApp tenant belum dikonfigurasi. Atur di menu Integrasi.");
    }
    return;
  }
  if (process.env.WHATSAPP_DRIVER === "real" && !isWhatsAppConfigured()) {
    throw new Error("WhatsApp platform belum dikonfigurasi di .env.");
  }
}

async function logSend(input: {
  scope: MessageScope;
  tenantId?: string | null;
  recipientType: "pelanggan" | "tenant_owner";
  recipientId: string;
  phone: string;
  message: string;
  templateKey?: string;
  batchId?: string;
  sentBy?: string;
  status: "sent" | "failed";
  error?: string;
}) {
  await db.insert(messageSendLogs).values({
    id: newId("mlog"),
    scope: input.scope,
    tenantId: input.tenantId ?? null,
    recipientType: input.recipientType,
    recipientId: input.recipientId,
    phone: input.phone,
    message: input.message,
    templateKey: input.templateKey ?? null,
    batchId: input.batchId ?? null,
    sentBy: input.sentBy ?? null,
    status: input.status,
    error: input.error ?? null,
    createdAt: new Date(),
  });
}

export async function composePelangganMessage(
  tenantId: string,
  pelangganId: string,
  messageType: MessageType,
  customBody?: string
): Promise<{ message: string; templateKey: string }> {
  if (messageType === "custom") {
    const body =
      customBody?.trim() ||
      (await getTemplateBody("tenant", "manual_custom", tenantId));
    const vars = await buildPelangganContext(tenantId, pelangganId);
    return { message: renderTemplate(body, vars), templateKey: "manual_custom" };
  }

  const outstanding = await hasAnyOutstanding(tenantId, pelangganId);
  if (!outstanding) {
    throw new Error("Tidak ada tagihan belum lunas untuk pelanggan ini.");
  }

  const body = await getTemplateBody("tenant", "manual_invoice", tenantId);
  const vars = await buildPelangganContext(tenantId, pelangganId);
  return { message: renderTemplate(body, vars), templateKey: "manual_invoice" };
}

export async function composeTenantOwnerMessage(
  tenantId: string,
  customBody?: string
): Promise<{ message: string; templateKey: string }> {
  const body =
    customBody?.trim() || (await getTemplateBody("platform", "manual_tenant"));
  const vars = await buildTenantOwnerContext(tenantId);
  return { message: renderTemplate(body, vars), templateKey: "manual_tenant" };
}

export async function sendSinglePelanggan(input: {
  tenantId: string;
  pelangganId: string;
  messageType: MessageType;
  customBody?: string;
  sentBy: string;
}) {
  await assertWhatsAppReady(input.tenantId);
  const cust = await db.query.pelanggan.findFirst({
    where: and(eq(pelanggan.tenantId, input.tenantId), eq(pelanggan.id, input.pelangganId)),
  });
  if (!cust?.noWa?.trim()) throw new Error("Pelanggan tidak punya nomor WhatsApp.");

  const { message, templateKey } = await composePelangganMessage(
    input.tenantId,
    input.pelangganId,
    input.messageType,
    input.customBody
  );

  await waitBeforeSend();
  try {
    await getWhatsAppClient().sendNotification(cust.noWa, message, input.tenantId);
    await logSend({
      scope: "tenant",
      tenantId: input.tenantId,
      recipientType: "pelanggan",
      recipientId: input.pelangganId,
      phone: cust.noWa,
      message,
      templateKey,
      sentBy: input.sentBy,
      status: "sent",
    });
    return { ok: true as const };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    await logSend({
      scope: "tenant",
      tenantId: input.tenantId,
      recipientType: "pelanggan",
      recipientId: input.pelangganId,
      phone: cust.noWa,
      message,
      templateKey,
      sentBy: input.sentBy,
      status: "failed",
      error,
    });
    throw new Error(error);
  }
}

export async function sendSingleTenantOwner(input: {
  tenantId: string;
  customBody?: string;
  sentBy: string;
}) {
  await assertWhatsAppReady(null);
  const owner = await db.query.users.findFirst({
    where: and(
      eq(users.tenantId, input.tenantId),
      eq(users.role, "owner"),
      eq(users.isActive, true)
    ),
  });
  const phone = owner?.phone?.trim();
  if (!phone) throw new Error("Owner tenant tidak punya nomor WhatsApp.");

  const { message, templateKey } = await composeTenantOwnerMessage(
    input.tenantId,
    input.customBody
  );

  await waitBeforeSend();
  try {
    await getWhatsAppClient().sendNotification(phone, message, input.tenantId);
    await logSend({
      scope: "platform",
      tenantId: input.tenantId,
      recipientType: "tenant_owner",
      recipientId: owner!.id,
      phone,
      message,
      templateKey,
      sentBy: input.sentBy,
      status: "sent",
    });
    return { ok: true as const };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    await logSend({
      scope: "platform",
      tenantId: input.tenantId,
      recipientType: "tenant_owner",
      recipientId: owner!.id,
      phone,
      message,
      templateKey,
      sentBy: input.sentBy,
      status: "failed",
      error,
    });
    throw new Error(error);
  }
}

export async function runBatchSend(batchId: string) {
  const batch = await db.query.messageBatches.findFirst({
    where: eq(messageBatches.id, batchId),
  });
  if (!batch?.payload) throw new Error("Batch tidak ditemukan.");

  const payload = batch.payload;
  await db
    .update(messageBatches)
    .set({ status: "running", startedAt: new Date() })
    .where(eq(messageBatches.id, batchId));

  let sent = 0;
  let failed = 0;

  try {
    if (batch.scope === "tenant") {
      await assertWhatsAppReady(batch.tenantId);
    } else {
      await assertWhatsAppReady(null);
    }

    for (const recipientId of payload.recipientIds) {
      try {
        if (payload.recipientType === "pelanggan") {
          const cust = await db.query.pelanggan.findFirst({
            where: and(
              eq(pelanggan.tenantId, batch.tenantId!),
              eq(pelanggan.id, recipientId)
            ),
          });
          if (!cust?.noWa?.trim()) {
            failed++;
            await logSend({
              scope: "tenant",
              tenantId: batch.tenantId,
              recipientType: "pelanggan",
              recipientId,
              phone: "",
              message: "",
              batchId,
              sentBy: batch.startedBy ?? undefined,
              status: "failed",
              error: "Nomor WA kosong",
            });
            continue;
          }

          const { message, templateKey } = await composePelangganMessage(
            batch.tenantId!,
            recipientId,
            payload.messageType,
            payload.customBody
          );

          await waitBeforeSend();
          await getWhatsAppClient().sendNotification(
            cust.noWa,
            message,
            batch.tenantId!
          );
          sent++;
          await logSend({
            scope: "tenant",
            tenantId: batch.tenantId,
            recipientType: "pelanggan",
            recipientId,
            phone: cust.noWa,
            message,
            templateKey,
            batchId,
            sentBy: batch.startedBy ?? undefined,
            status: "sent",
          });
          await paceAfterSend(sent);
        } else {
          const owner = await db.query.users.findFirst({
            where: and(
              eq(users.tenantId, recipientId),
              eq(users.role, "owner"),
              eq(users.isActive, true)
            ),
          });
          const phone = owner?.phone?.trim();
          if (!phone) {
            failed++;
            await logSend({
              scope: "platform",
              tenantId: recipientId,
              recipientType: "tenant_owner",
              recipientId: owner?.id ?? recipientId,
              phone: "",
              message: "",
              batchId,
              sentBy: batch.startedBy ?? undefined,
              status: "failed",
              error: "Owner tanpa nomor WA",
            });
            continue;
          }

          const { message, templateKey } = await composeTenantOwnerMessage(
            recipientId,
            payload.customBody
          );

          await waitBeforeSend();
          await getWhatsAppClient().sendNotification(phone, message, recipientId);
          sent++;
          await logSend({
            scope: "platform",
            tenantId: recipientId,
            recipientType: "tenant_owner",
            recipientId: owner!.id,
            phone,
            message,
            templateKey,
            batchId,
            sentBy: batch.startedBy ?? undefined,
            status: "sent",
          });
          await paceAfterSend(sent);
        }
      } catch (err) {
        failed++;
        const error = err instanceof Error ? err.message : String(err);
        await logSend({
          scope: batch.scope,
          tenantId: batch.tenantId,
          recipientType: payload.recipientType,
          recipientId,
          phone: "",
          message: "",
          batchId,
          sentBy: batch.startedBy ?? undefined,
          status: "failed",
          error,
        });
      }

      await db
        .update(messageBatches)
        .set({ sent, failed })
        .where(eq(messageBatches.id, batchId));
    }

    await db
      .update(messageBatches)
      .set({ status: "done", sent, failed, finishedAt: new Date() })
      .where(eq(messageBatches.id, batchId));
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    await db
      .update(messageBatches)
      .set({
        status: "failed",
        sent,
        failed,
        error,
        finishedAt: new Date(),
      })
      .where(eq(messageBatches.id, batchId));
    throw err;
  }
}

export async function listRecentSendLogs(scope: MessageScope, tenantId?: string | null, limit = 50) {
  return db.query.messageSendLogs.findMany({
    where:
      scope === "tenant" && tenantId
        ? and(eq(messageSendLogs.scope, "tenant"), eq(messageSendLogs.tenantId, tenantId))
        : eq(messageSendLogs.scope, "platform"),
    orderBy: [desc(messageSendLogs.createdAt)],
    limit,
  });
}

export async function getPelangganIdsWithOutstandingTagihan(tenantId: string, ids: string[]) {
  if (ids.length === 0) return [];
  const rows = await db
    .selectDistinct({ pelangganId: tagihan.pelangganId })
    .from(tagihan)
    .where(
      and(
        eq(tagihan.tenantId, tenantId),
        inArray(tagihan.status, ["open", "tunggakan"]),
        inArray(tagihan.pelangganId, ids)
      )
    );
  return rows.map((r) => r.pelangganId);
}

/** @deprecated gunakan getPelangganIdsWithOutstandingTagihan */
export async function getPelangganIdsWithUnpaidInvoice(tenantId: string, ids: string[]) {
  return getPelangganIdsWithOutstandingTagihan(tenantId, ids);
}

export async function listTenantsForMessaging() {
  const allTenants = await db.query.tenants.findMany({ orderBy: [desc(tenants.createdAt)] });
  const result = [];
  for (const tenant of allTenants) {
    const owner = await db.query.users.findFirst({
      where: and(eq(users.tenantId, tenant.id), eq(users.role, "owner"), eq(users.isActive, true)),
    });
    result.push({
      id: tenant.id,
      namaUsaha: tenant.namaUsaha,
      domain: tenant.domain,
      status: tenant.status,
      ownerNama: owner?.nama ?? null,
      ownerPhone: owner?.phone ?? null,
    });
  }
  return result;
}
