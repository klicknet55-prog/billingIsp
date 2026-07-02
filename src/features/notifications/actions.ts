"use server";

import { z } from "zod";
import { getCurrentActor } from "@/lib/auth";
import { registerDevicePushToken } from "./device-push-token-service";

const registerTokenSchema = z.object({
  token: z.string().trim().min(16),
  app: z.enum(["admin", "portal"]),
  platform: z.enum(["android"]).default("android"),
});

export async function registerDevicePushTokenAction(input: {
  token: string;
  app: "admin" | "portal";
  platform?: "android";
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = registerTokenSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "invalid_payload" };
  }

  const actor = await getCurrentActor();
  if (!actor) {
    return { ok: false, error: "unauthorized" };
  }

  if (actor.type === "user") {
    await registerDevicePushToken({
      tenantId: actor.user.tenantId,
      subjectType: "user",
      subjectId: actor.user.id,
      app: parsed.data.app,
      token: parsed.data.token,
      platform: parsed.data.platform,
    });
    return { ok: true };
  }

  await registerDevicePushToken({
    tenantId: actor.pelanggan.tenantId,
    subjectType: "pelanggan",
    subjectId: actor.pelanggan.id,
    app: parsed.data.app,
    token: parsed.data.token,
    platform: parsed.data.platform,
  });
  return { ok: true };
}
