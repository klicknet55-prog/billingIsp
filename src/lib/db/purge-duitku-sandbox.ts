/**
 * Hapus kredensial Duitku tenant yang tersalin dari env platform (biasanya sandbox).
 *
 * Catatan: pembayaran platform (SUB-/SUP-/DON-) hanya pakai .env, BUKAN tabel ini.
 *
 *   npm run db:purge-duitku-sandbox              # hapus baris dengan URL sandbox
 *   npm run db:purge-duitku-sandbox -- --dry-run # lihat saja, tidak hapus
 *   npm run db:purge-duitku-sandbox -- --all     # hapus SEMUA baris tenant_duitku_config
 */
import { ilike, or } from "drizzle-orm";
import { db } from "./index";
import { tenantDuitkuConfigs } from "./schema";

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const deleteAll = process.argv.includes("--all");

  if (deleteAll) {
    const rows = await db.query.tenantDuitkuConfigs.findMany();
    console.log(
      dryRun
        ? `[dry-run] Akan hapus ${rows.length} baris tenant_duitku_config (semua).`
        : `Menghapus ${rows.length} baris tenant_duitku_config (semua)...`
    );
    if (!dryRun) {
      await db.delete(tenantDuitkuConfigs);
    }
    for (const r of rows) {
      console.log(`  - tenant ${r.tenantId} | merchant ${r.merchantCode} | inquiry ${r.inquiryUrl ?? "(kosong)"}`);
    }
    return;
  }

  const sandboxRows = await db.query.tenantDuitkuConfigs.findMany({
    where: or(
      ilike(tenantDuitkuConfigs.inquiryUrl, "%sandbox%"),
      ilike(tenantDuitkuConfigs.callbackUrl, "%localhost%")
    ),
  });

  if (sandboxRows.length === 0) {
    console.log("Tidak ada baris tenant_duitku_config dengan URL sandbox/localhost.");
    console.log(
      "Kredensial Duitku superadmin (SUB/SUP/DON) hanya di .env — periksa DUITKU_* di server, bukan database."
    );
    return;
  }

  console.log(
    dryRun
      ? `[dry-run] Akan hapus ${sandboxRows.length} baris sandbox:`
      : `Menghapus ${sandboxRows.length} baris sandbox dari tenant_duitku_config...`
  );
  for (const r of sandboxRows) {
    console.log(`  - tenant ${r.tenantId} | merchant ${r.merchantCode} | inquiry ${r.inquiryUrl ?? "(kosong)"}`);
  }

  if (!dryRun) {
    await db
      .delete(tenantDuitkuConfigs)
      .where(
        or(
          ilike(tenantDuitkuConfigs.inquiryUrl, "%sandbox%"),
          ilike(tenantDuitkuConfigs.callbackUrl, "%localhost%")
        )
      );
    console.log("Selesai. Setiap ISP isi ulang Duitku sendiri di ISP → Integrasi jika perlu PG aktif.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
