/**
 * Backfill idempotent: isi konfigurasi integrasi per-tenant dari ENV global
 * untuk tenant yang belum punya config.
 *
 * Jalankan:
 *   npm run db:backfill-integrations
 */
import { db } from "./index";
import { encryptSecret } from "../crypto";
import { tenantDuitkuConfigs, tenantWhatsAppConfigs } from "./schema";
import { newId } from "../utils";

async function main() {
  const allTenants = await db.query.tenants.findMany();
  let duitkuInserted = 0;
  let waInserted = 0;

  for (const t of allTenants) {
    const existingDuitku = await db.query.tenantDuitkuConfigs.findFirst({
      where: (c, { eq }) => eq(c.tenantId, t.id),
    });
    if (!existingDuitku && process.env.DUITKU_MERCHANT_CODE && process.env.DUITKU_API_KEY) {
      await db.insert(tenantDuitkuConfigs).values({
        id: newId("tdk"),
        tenantId: t.id,
        merchantCode: process.env.DUITKU_MERCHANT_CODE,
        apiKeyEncrypted: encryptSecret(process.env.DUITKU_API_KEY),
        callbackUrl: process.env.DUITKU_CALLBACK_URL || null,
        inquiryUrl: process.env.DUITKU_INQUIRY_URL || null,
        paymentMethod: process.env.DUITKU_PAYMENT_METHOD || "VC",
        isEnabled: true,
      });
      duitkuInserted++;
    }

    const existingWa = await db.query.tenantWhatsAppConfigs.findFirst({
      where: (c, { eq }) => eq(c.tenantId, t.id),
    });
    if (!existingWa && process.env.WHATSAPP_API_URL && process.env.WHATSAPP_API_TOKEN) {
      await db.insert(tenantWhatsAppConfigs).values({
        id: newId("twp"),
        tenantId: t.id,
        apiUrl: process.env.WHATSAPP_API_URL,
        apiTokenEncrypted: encryptSecret(process.env.WHATSAPP_API_TOKEN),
        provider: "waba",
        isEnabled: true,
      });
      waInserted++;
    }
  }

  console.log(
    `Backfill selesai. Tenant: ${allTenants.length}, Duitku ditambah: ${duitkuInserted}, WA ditambah: ${waInserted}`
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

