/**
 * Backfill integrasi per-tenant — tidak lagi menyalin kredensial platform ke tenant.
 * Setiap ISP wajib mengisi sendiri di menu Integrasi.
 *
 * Jalankan (no-op, hanya informasi):
 *   npm run db:backfill-integrations
 */
import { db } from "./index";
import { tenantDuitkuConfigs, tenantWhatsAppConfigs } from "./schema";

async function main() {
  const allTenants = await db.query.tenants.findMany();
  let duitkuRows = 0;
  let waRows = 0;

  for (const t of allTenants) {
    const duitku = await db.query.tenantDuitkuConfigs.findFirst({
      where: (c, { eq }) => eq(c.tenantId, t.id),
    });
    if (duitku) duitkuRows++;

    const wa = await db.query.tenantWhatsAppConfigs.findFirst({
      where: (c, { eq }) => eq(c.tenantId, t.id),
    });
    if (wa) waRows++;
  }

  console.log(
    `Integrasi per-tenant tidak di-backfill dari .env (isolasi kredensial). Tenant: ${allTenants.length}, sudah punya baris Duitku: ${duitkuRows}, WhatsApp: ${waRows}.`
  );
  console.log(
    "Setiap ISP mengisi kredensial sendiri di ISP → Integrasi. Platform SaaS tetap memakai .env global."
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
