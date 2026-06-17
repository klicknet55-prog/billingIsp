import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { tenants, type Tenant } from "@/lib/db/schema";
import { getCurrentActor } from "@/lib/auth";

/**
 * Resolusi tenant aktif untuk request saat ini.
 * - Staf ISP & pelanggan: tenant dari relasi miliknya.
 * - Superadmin platform: tidak terikat tenant (null).
 *
 * Catatan: untuk produksi, resolusi bisa diperluas ke subdomain
 * (mis. `acme.netmanage.app`) di middleware lalu di-inject ke sini.
 */
export async function getCurrentTenantId(): Promise<string | null> {
  const actor = await getCurrentActor();
  if (!actor) return null;
  return actor.type === "user" ? actor.user.tenantId : actor.pelanggan.tenantId;
}

export async function getCurrentTenant(): Promise<Tenant | null> {
  const tenantId = await getCurrentTenantId();
  if (!tenantId) return null;
  return (await db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) })) ?? null;
}
