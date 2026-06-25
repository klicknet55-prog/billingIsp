"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/features/auth/actions";
import { requireUser } from "@/lib/auth";
import { createMessageBatch } from "@/features/messages/batch";
import { buildPelangganContext, buildTenantOwnerContext } from "@/features/messages/context";
import { renderTemplate } from "@/features/messages/render";
import {
  composePelangganMessage,
  composeTenantOwnerMessage,
  getPelangganIdsWithUnpaidInvoice,
  listRecentSendLogs,
  listTenantsForMessaging,
  sendSinglePelanggan,
  sendSingleTenantOwner,
} from "@/features/messages/send";
import {
  getTemplateBody,
  listPlatformTemplates,
  listTenantTemplates,
  savePlatformTemplates,
  saveTenantTemplates,
} from "@/features/messages/templates";
import type { MessageType } from "@/features/messages/types";
import { getBatchStatus } from "@/features/messages/batch";
import { SAMPLE_PELANGGAN_VARS, SAMPLE_TENANT_VARS } from "@/features/messages/defaults";

const ISP_ROLES = ["owner", "admin"] as const;

export async function previewPelangganMessageAction(input: {
  pelangganId: string;
  messageType: MessageType;
  customBody?: string;
}): Promise<{ message: string } | { error: string }> {
  const user = await requireUser([...ISP_ROLES]);
  if (!user.tenantId) return { error: "Tenant tidak ditemukan." };
  try {
    const { message } = await composePelangganMessage(
      user.tenantId,
      input.pelangganId,
      input.messageType,
      input.customBody
    );
    return { message };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

export async function previewTenantMessageAction(input: {
  tenantId: string;
  customBody?: string;
}): Promise<{ message: string } | { error: string }> {
  await requireUser(["superadmin"]);
  try {
    const { message } = await composeTenantOwnerMessage(input.tenantId, input.customBody);
    return { message };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

export async function sendSinglePelangganAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser([...ISP_ROLES]);
  if (!user.tenantId) return { error: "Tenant tidak ditemukan." };

  const pelangganId = String(formData.get("pelangganId") ?? "");
  const messageType = (String(formData.get("messageType") ?? "invoice") === "custom"
    ? "custom"
    : "invoice") as MessageType;
  const customBody = String(formData.get("customBody") ?? "");

  if (!pelangganId) return { fieldErrors: { pelangganId: "Pilih pelanggan." } };

  try {
    await sendSinglePelanggan({
      tenantId: user.tenantId,
      pelangganId,
      messageType,
      customBody: customBody || undefined,
      sentBy: user.email,
    });
    revalidatePath("/isp/pesan");
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

export async function startBulkPelangganAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState & { batchId?: string }> {
  const user = await requireUser([...ISP_ROLES]);
  if (!user.tenantId) return { error: "Tenant tidak ditemukan." };

  let recipientIds: string[] = [];
  try {
    recipientIds = JSON.parse(String(formData.get("recipientIds") ?? "[]")) as string[];
  } catch {
    return { error: "Data penerima tidak valid." };
  }

  const onlyUnpaid = formData.get("onlyUnpaid") === "on";
  const messageType = (String(formData.get("messageType") ?? "invoice") === "custom"
    ? "custom"
    : "invoice") as MessageType;
  const customBody = String(formData.get("customBody") ?? "");

  if (onlyUnpaid) {
    recipientIds = await getPelangganIdsWithUnpaidInvoice(user.tenantId, recipientIds);
  }

  try {
    const batchId = await createMessageBatch({
      scope: "tenant",
      tenantId: user.tenantId,
      payload: {
        recipientType: "pelanggan",
        messageType,
        customBody: customBody || undefined,
        recipientIds,
      },
      startedBy: user.email,
    });
    revalidatePath("/isp/pesan");
    return { ok: true, batchId };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

export async function sendSingleTenantAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser(["superadmin"]);
  const tenantId = String(formData.get("tenantId") ?? "");
  const customBody = String(formData.get("customBody") ?? "");
  if (!tenantId) return { fieldErrors: { tenantId: "Pilih tenant." } };

  try {
    await sendSingleTenantOwner({
      tenantId,
      customBody: customBody || undefined,
      sentBy: user.email,
    });
    revalidatePath("/superadmin/pesan");
    return { ok: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

export async function startBulkTenantAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState & { batchId?: string }> {
  const user = await requireUser(["superadmin"]);
  let recipientIds: string[] = [];
  try {
    recipientIds = JSON.parse(String(formData.get("recipientIds") ?? "[]")) as string[];
  } catch {
    return { error: "Data tenant tidak valid." };
  }
  const customBody = String(formData.get("customBody") ?? "");

  try {
    const batchId = await createMessageBatch({
      scope: "platform",
      payload: {
        recipientType: "tenant_owner",
        messageType: "custom",
        customBody: customBody || undefined,
        recipientIds,
      },
      startedBy: user.email,
    });
    revalidatePath("/superadmin/pesan");
    return { ok: true, batchId };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

export async function saveTenantTemplatesAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser([...ISP_ROLES]);
  if (!user.tenantId) return { error: "Tenant tidak ditemukan." };

  const templates: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("template_")) {
      templates[key.replace("template_", "")] = String(value);
    }
  }

  await saveTenantTemplates(user.tenantId, templates, user.email);
  revalidatePath("/isp/pesan");
  return { ok: true };
}

export async function savePlatformTemplatesAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser(["superadmin"]);
  const templates: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("template_")) {
      templates[key.replace("template_", "")] = String(value);
    }
  }
  await savePlatformTemplates(templates, user.email);
  revalidatePath("/superadmin/pesan");
  return { ok: true };
}

export async function getBatchStatusAction(batchId: string) {
  const user = await requireUser(["owner", "admin", "superadmin"]);
  const batch = await getBatchStatus(batchId);
  if (!batch) return null;
  if (user.role !== "superadmin" && batch.tenantId !== user.tenantId) return null;
  return batch;
}

export async function getTenantMessagingDataAction() {
  const user = await requireUser([...ISP_ROLES]);
  if (!user.tenantId) return null;
  const [templates, logs] = await Promise.all([
    listTenantTemplates(user.tenantId),
    listRecentSendLogs("tenant", user.tenantId),
  ]);
  return { templates, logs };
}

export async function getPlatformMessagingDataAction() {
  await requireUser(["superadmin"]);
  const [templates, logs, tenants] = await Promise.all([
    listPlatformTemplates(),
    listRecentSendLogs("platform"),
    listTenantsForMessaging(),
  ]);
  return { templates, logs, tenants };
}

export async function renderTemplatePreviewAction(scope: "tenant" | "platform", key: string) {
  if (scope === "tenant") {
    const user = await requireUser([...ISP_ROLES]);
    const body = await getTemplateBody("tenant", key, user.tenantId!);
    return renderTemplate(body, SAMPLE_PELANGGAN_VARS);
  }
  await requireUser(["superadmin"]);
  const body = await getTemplateBody("platform", key);
  return renderTemplate(body, SAMPLE_TENANT_VARS);
}

export async function buildPelangganPreviewContextAction(pelangganId: string) {
  const user = await requireUser([...ISP_ROLES]);
  if (!user.tenantId) throw new Error("Tenant tidak ditemukan.");
  return buildPelangganContext(user.tenantId, pelangganId);
}

export async function buildTenantPreviewContextAction(tenantId: string) {
  await requireUser(["superadmin"]);
  return buildTenantOwnerContext(tenantId);
}
