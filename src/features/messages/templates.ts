import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { messageTemplates } from "@/lib/db/schema";
import { newId } from "@/lib/utils";
import {
  DEFAULT_PLATFORM_TEMPLATES,
  DEFAULT_TENANT_TEMPLATES,
} from "@/features/messages/defaults";
import type {
  MessageScope,
  PlatformTemplateKey,
  TenantTemplateKey,
} from "@/features/messages/types";

export async function getTemplateBody(
  scope: MessageScope,
  key: string,
  tenantId?: string | null
): Promise<string> {
  const row = await db.query.messageTemplates.findFirst({
    where:
      scope === "platform"
        ? and(
            eq(messageTemplates.scope, "platform"),
            isNull(messageTemplates.tenantId),
            eq(messageTemplates.key, key)
          )
        : and(
            eq(messageTemplates.scope, "tenant"),
            eq(messageTemplates.tenantId, tenantId!),
            eq(messageTemplates.key, key)
          ),
  });
  if (row?.body?.trim()) return row.body;

  if (scope === "platform" && key in DEFAULT_PLATFORM_TEMPLATES) {
    return DEFAULT_PLATFORM_TEMPLATES[key as PlatformTemplateKey];
  }
  if (scope === "tenant" && key in DEFAULT_TENANT_TEMPLATES) {
    return DEFAULT_TENANT_TEMPLATES[key as TenantTemplateKey];
  }
  return "";
}

export async function listTenantTemplates(tenantId: string) {
  const rows = await db.query.messageTemplates.findMany({
    where: and(eq(messageTemplates.scope, "tenant"), eq(messageTemplates.tenantId, tenantId)),
  });
  const map = new Map(rows.map((r) => [r.key, r.body]));
  return Object.fromEntries(
    (Object.keys(DEFAULT_TENANT_TEMPLATES) as TenantTemplateKey[]).map((key) => [
      key,
      map.get(key) ?? DEFAULT_TENANT_TEMPLATES[key],
    ])
  ) as Record<TenantTemplateKey, string>;
}

export async function listPlatformTemplates() {
  const rows = await db.query.messageTemplates.findMany({
    where: and(eq(messageTemplates.scope, "platform"), isNull(messageTemplates.tenantId)),
  });
  const map = new Map(rows.map((r) => [r.key, r.body]));
  return Object.fromEntries(
    (Object.keys(DEFAULT_PLATFORM_TEMPLATES) as PlatformTemplateKey[]).map((key) => [
      key,
      map.get(key) ?? DEFAULT_PLATFORM_TEMPLATES[key],
    ])
  ) as Record<PlatformTemplateKey, string>;
}

export async function upsertTemplate(input: {
  scope: MessageScope;
  tenantId?: string | null;
  key: string;
  body: string;
  updatedBy: string;
}) {
  const existing = await db.query.messageTemplates.findFirst({
    where:
      input.scope === "platform"
        ? and(
            eq(messageTemplates.scope, "platform"),
            isNull(messageTemplates.tenantId),
            eq(messageTemplates.key, input.key)
          )
        : and(
            eq(messageTemplates.scope, "tenant"),
            eq(messageTemplates.tenantId, input.tenantId!),
            eq(messageTemplates.key, input.key)
          ),
  });

  if (existing) {
    await db
      .update(messageTemplates)
      .set({ body: input.body, updatedBy: input.updatedBy, updatedAt: new Date() })
      .where(eq(messageTemplates.id, existing.id));
    return existing.id;
  }

  const id = newId("mtpl");
  await db.insert(messageTemplates).values({
    id,
    scope: input.scope,
    tenantId: input.scope === "tenant" ? input.tenantId! : null,
    key: input.key,
    body: input.body,
    updatedBy: input.updatedBy,
    updatedAt: new Date(),
  });
  return id;
}

export async function saveTenantTemplates(
  tenantId: string,
  templates: Record<string, string>,
  updatedBy: string
) {
  for (const [key, body] of Object.entries(templates)) {
    await upsertTemplate({ scope: "tenant", tenantId, key, body, updatedBy });
  }
}

export async function savePlatformTemplates(
  templates: Record<string, string>,
  updatedBy: string
) {
  for (const [key, body] of Object.entries(templates)) {
    await upsertTemplate({ scope: "platform", key, body, updatedBy });
  }
}
