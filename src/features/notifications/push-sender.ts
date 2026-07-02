import "server-only";
import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { devicePushTokens, pushNotificationLogs, users } from "@/lib/db/schema";
import { createLogger } from "@/lib/logger";
import { PUSH_PATHS } from "@/lib/mobile/push-navigation";

const log = createLogger("notif:push");
const FCM_URL = "https://fcm.googleapis.com/fcm/send";

type TargetApp = "admin" | "portal";
type SubjectType = "user" | "pelanggan";

type PushEnvelope = {
  tenantId: string | null;
  subjectType: SubjectType;
  subjectId: string;
  app: TargetApp;
  eventType: string;
  title: string;
  body: string;
  data?: Record<string, string>;
};

function getServerKey(): string {
  return process.env.FCM_SERVER_KEY?.trim() ?? "";
}

async function sendToFcmToken(
  token: string,
  title: string,
  body: string,
  data: Record<string, string> | undefined
): Promise<{ ok: boolean; attempts: number; response?: string; error?: string }> {
  const serverKey = getServerKey();
  if (!serverKey) {
    return { ok: false, attempts: 0, error: "FCM_SERVER_KEY belum diatur." };
  }

  const payload = {
    to: token,
    notification: { title, body },
    data: {
      ...(data ?? {}),
      title,
      body,
    },
    priority: "high",
  };

  let lastError = "";
  let lastResponse = "";

  for (let i = 1; i <= 2; i++) {
    try {
      const res = await fetch(FCM_URL, {
        method: "POST",
        headers: {
          Authorization: `key=${serverKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const text = await res.text();
      lastResponse = text;
      if (res.ok) return { ok: true, attempts: i, response: text };
      lastError = `HTTP ${res.status}`;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
  }

  return { ok: false, attempts: 2, error: lastError, response: lastResponse };
}

async function logPush(input: PushEnvelope & { token: string; status: "sent" | "failed" | "skipped"; attemptCount: number; response?: string; error?: string }) {
  await db.insert(pushNotificationLogs).values({
    id: randomUUID(),
    tenantId: input.tenantId,
    subjectType: input.subjectType,
    subjectId: input.subjectId,
    app: input.app,
    eventType: input.eventType,
    title: input.title,
    body: input.body,
    token: input.token,
    status: input.status,
    attemptCount: input.attemptCount,
    response: input.response ?? null,
    error: input.error ?? null,
    createdAt: new Date(),
  });
}

export async function sendPushToSubject(input: PushEnvelope): Promise<void> {
  const tokens = await db.query.devicePushTokens.findMany({
    where: and(
      eq(devicePushTokens.subjectType, input.subjectType),
      eq(devicePushTokens.subjectId, input.subjectId),
      eq(devicePushTokens.app, input.app),
      eq(devicePushTokens.isActive, true)
    ),
    columns: { token: true },
  });

  if (tokens.length === 0) return;

  for (const row of tokens) {
    const sent = await sendToFcmToken(row.token, input.title, input.body, input.data);
    if (sent.ok) {
      await logPush({
        ...input,
        token: row.token,
        status: "sent",
        attemptCount: sent.attempts,
        response: sent.response,
      });
      continue;
    }
    await logPush({
      ...input,
      token: row.token,
      status: getServerKey() ? "failed" : "skipped",
      attemptCount: sent.attempts,
      response: sent.response,
      error: sent.error,
    });
  }
}

export async function sendPushToTenantRoles(input: {
  tenantId: string;
  roles: Array<"owner" | "admin" | "teknisi" | "kolektor">;
  eventType: string;
  title: string;
  body: string;
  app?: TargetApp;
  data?: Record<string, string>;
}): Promise<void> {
  const roleUsers = await db.query.users.findMany({
    where: and(
      eq(users.tenantId, input.tenantId),
      eq(users.isActive, true),
      inArray(users.role, input.roles)
    ),
    columns: { id: true },
  });

  for (const user of roleUsers) {
    await sendPushToSubject({
      tenantId: input.tenantId,
      subjectType: "user",
      subjectId: user.id,
      app: input.app ?? "admin",
      eventType: input.eventType,
      title: input.title,
      body: input.body,
      data: input.data,
    });
  }
}

export async function notifyPaymentSuccess(input: {
  tenantId: string;
  pelangganId: string;
  pelangganNama: string;
  noNota: string;
  total: number;
}): Promise<void> {
  const title = "Pembayaran berhasil";
  const body = `${input.pelangganNama} membayar ${input.noNota} (Rp${input.total.toLocaleString("id-ID")}).`;

  await sendPushToTenantRoles({
    tenantId: input.tenantId,
    roles: ["owner", "admin"],
    eventType: "payment.success",
    title,
    body,
    app: "admin",
    data: {
      eventType: "payment.success",
      path: PUSH_PATHS.adminTagihanPelanggan(input.pelangganId),
      pelangganId: input.pelangganId,
      receiptNo: input.noNota,
    },
  });

  await sendPushToSubject({
    tenantId: input.tenantId,
    subjectType: "pelanggan",
    subjectId: input.pelangganId,
    app: "portal",
    eventType: "payment.success.portal",
    title: "Pembayaran diterima",
    body: `Pembayaran ${input.noNota} sudah kami terima.`,
    data: {
      eventType: "payment.success.portal",
      path: PUSH_PATHS.portalTagihan,
      receiptNo: input.noNota,
    },
  });
}

export async function notifyTicketEvent(input: {
  tenantId: string;
  pelangganNama: string;
  ticketId: string;
  title: string;
  body: string;
}): Promise<void> {
  await sendPushToTenantRoles({
    tenantId: input.tenantId,
    roles: ["owner", "admin", "teknisi"],
    eventType: "ticket.event",
    title: input.title,
    body: `${input.pelangganNama}: ${input.body}`,
    app: "admin",
    data: {
      eventType: "ticket.event",
      path: PUSH_PATHS.adminTiket,
      ticketId: input.ticketId,
    },
  });
}

export async function notifyWhatsAppIntegrationError(input: {
  tenantId: string;
  message: string;
}): Promise<void> {
  const msg = input.message.slice(0, 180);
  await sendPushToTenantRoles({
    tenantId: input.tenantId,
    roles: ["owner", "admin"],
    eventType: "whatsapp.integration.error",
    title: "Error integrasi WhatsApp",
    body: msg,
    app: "admin",
    data: {
      eventType: "whatsapp.integration.error",
      path: PUSH_PATHS.adminIntegrasi,
    },
  });
  log.warn("WhatsApp integration error push emitted", { tenantId: input.tenantId, message: msg });
}
