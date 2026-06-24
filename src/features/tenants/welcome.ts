import "server-only";
import { sendWelcomeEmail } from "@/lib/integrations/email";
import { getWhatsAppClient } from "@/lib/integrations/whatsapp";
import { createLogger } from "@/lib/logger";
import type { Tenant, User } from "@/lib/db/schema";

const log = createLogger("tenant:welcome");

export async function notifyNewTenantWelcome(
  tenant: Tenant,
  owner: Pick<User, "nama" | "email" | "phone">
) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";
  const loginUrl = `${baseUrl}/login`;

  try {
    await sendWelcomeEmail({
      to: owner.email,
      ownerName: owner.nama,
      tenantName: tenant.namaUsaha,
      loginUrl,
    });
  } catch (err) {
    log.warn(`Welcome email gagal: ${err instanceof Error ? err.message : err}`);
  }

  if (owner.phone?.trim()) {
    try {
      await getWhatsAppClient().sendNotification(
        owner.phone.trim(),
        `Selamat datang di NetManage, ${owner.nama}! Akun ISP "${tenant.namaUsaha}" sudah aktif. Masuk: ${loginUrl}`,
        tenant.id
      );
    } catch (err) {
      log.warn(`Welcome WA gagal: ${err instanceof Error ? err.message : err}`);
    }
  }
}
