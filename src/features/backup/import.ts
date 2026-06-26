import "server-only";
import { eq } from "drizzle-orm";
import { db, requireSqlite } from "@/lib/db";
import {
  invoices,
  kategoriPengeluaran,
  odp,
  paketInternet,
  pelanggan,
  pengeluaran,
  routers,
  tenantDuitkuConfigs,
  tenantWhatsAppConfigs,
  tenants,
  ticketAssignments,
  tickets,
  users,
} from "@/lib/db/schema";
import { clearTenantOperationalData } from "./export";
import { saveTenantSnapshot } from "./snapshot";
import { deserializeRow } from "./serialize";
import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  type BackupPreview,
  type RestoreMode,
  type RestoreResult,
  type TenantBackupCounts,
  type TenantBackupPayload,
} from "./types";

export function validateBackupPayload(
  raw: unknown,
  expectedTenantId: string
): TenantBackupPayload {
  if (!raw || typeof raw !== "object") throw new Error("Format backup tidak valid.");
  const b = raw as TenantBackupPayload;
  if (b.format !== BACKUP_FORMAT) throw new Error("Format backup tidak dikenali.");
  if (b.version !== BACKUP_VERSION) {
    throw new Error(`Versi backup (${b.version}) tidak didukung. Diperlukan versi ${BACKUP_VERSION}.`);
  }
  if (b.tenantId !== expectedTenantId) {
    throw new Error("Backup milik tenant lain — tidak bisa di-restore ke tenant ini.");
  }
  if (!b.data?.tenant) throw new Error("Data tenant kosong dalam backup.");
  return b;
}

export function backupToPreview(backup: TenantBackupPayload): BackupPreview {
  const tenant = backup.data.tenant;
  return {
    exportedAt: backup.exportedAt,
    tenantId: backup.tenantId,
    tenantDomain: backup.tenantDomain,
    appVersion: backup.appVersion,
    counts: backup.counts,
    namaUsaha: String(tenant.namaUsaha ?? backup.tenantDomain),
  };
}

type DbClient = typeof db;

async function insertAll(client: DbClient, backup: TenantBackupPayload, merge: boolean) {
  const d = backup.data;
  const inserted: Partial<TenantBackupCounts> = {};
  const skipped: Partial<TenantBackupCounts> = {};

  const bump = (key: keyof TenantBackupCounts, n: number) => {
    inserted[key] = (inserted[key] ?? 0) + n;
  };
  const skip = (key: keyof TenantBackupCounts, n: number) => {
    skipped[key] = (skipped[key] ?? 0) + n;
  };

  if (!merge) {
    const t = deserializeRow(d.tenant);
    await client
      .update(tenants)
      .set({
        namaUsaha: String(t.namaUsaha ?? ""),
        logoUrl: (t.logoUrl as string | null) ?? null,
        themePreset: String(t.themePreset ?? "default"),
        themeMode: (t.themeMode as "light" | "dark") ?? "light",
      })
      .where(eq(tenants.id, backup.tenantId));
  }

  const insertRows = async <K extends keyof TenantBackupCounts>(
    key: K,
    rows: Record<string, unknown>[],
    run: (row: Record<string, unknown>) => Promise<void>
  ) => {
    let ins = 0;
    let sk = 0;
    for (const row of rows) {
      try {
        await run(deserializeRow(row));
        ins++;
      } catch (err) {
        if (merge && String(err).includes("UNIQUE")) {
          sk++;
          continue;
        }
        throw err;
      }
    }
    if (ins) bump(key, ins);
    if (sk) skip(key, sk);
  };

  await insertRows("users", d.users, async (row) => {
    if (merge) {
      await client.insert(users).values(row as typeof users.$inferInsert).onConflictDoNothing();
    } else {
      await client.insert(users).values(row as typeof users.$inferInsert);
    }
  });

  await insertRows("routers", d.routers, async (row) => {
    if (merge) {
      await client.insert(routers).values(row as typeof routers.$inferInsert).onConflictDoNothing();
    } else {
      await client.insert(routers).values(row as typeof routers.$inferInsert);
    }
  });

  await insertRows("paketInternet", d.paketInternet, async (row) => {
    if (merge) {
      await client
        .insert(paketInternet)
        .values(row as typeof paketInternet.$inferInsert)
        .onConflictDoNothing();
    } else {
      await client.insert(paketInternet).values(row as typeof paketInternet.$inferInsert);
    }
  });

  await insertRows("odp", d.odp, async (row) => {
    const payload = { ...row, inputOdpId: null, inputRouterId: row.inputRouterId ?? null };
    if (merge) {
      await client.insert(odp).values(payload as typeof odp.$inferInsert).onConflictDoNothing();
    } else {
      await client.insert(odp).values(payload as typeof odp.$inferInsert);
    }
  });

  for (const row of d.odp) {
    const id = String(row.id);
    const inputOdpId = row.inputOdpId ? String(row.inputOdpId) : null;
    const inputRouterId = row.inputRouterId ? String(row.inputRouterId) : null;
    if (inputOdpId || inputRouterId) {
      await client.update(odp).set({ inputOdpId, inputRouterId }).where(eq(odp.id, id));
    }
  }

  await insertRows("pelanggan", d.pelanggan, async (row) => {
    if (merge) {
      await client.insert(pelanggan).values(row as typeof pelanggan.$inferInsert).onConflictDoNothing();
    } else {
      await client.insert(pelanggan).values(row as typeof pelanggan.$inferInsert);
    }
  });

  await insertRows("invoices", d.invoices, async (row) => {
    if (merge) {
      await client.insert(invoices).values(row as typeof invoices.$inferInsert).onConflictDoNothing();
    } else {
      await client.insert(invoices).values(row as typeof invoices.$inferInsert);
    }
  });

  await insertRows("kategoriPengeluaran", d.kategoriPengeluaran, async (row) => {
    if (merge) {
      await client
        .insert(kategoriPengeluaran)
        .values(row as typeof kategoriPengeluaran.$inferInsert)
        .onConflictDoNothing();
    } else {
      await client.insert(kategoriPengeluaran).values(row as typeof kategoriPengeluaran.$inferInsert);
    }
  });

  await insertRows("pengeluaran", d.pengeluaran, async (row) => {
    if (merge) {
      await client.insert(pengeluaran).values(row as typeof pengeluaran.$inferInsert).onConflictDoNothing();
    } else {
      await client.insert(pengeluaran).values(row as typeof pengeluaran.$inferInsert);
    }
  });

  await insertRows("tickets", d.tickets, async (row) => {
    if (merge) {
      await client.insert(tickets).values(row as typeof tickets.$inferInsert).onConflictDoNothing();
    } else {
      await client.insert(tickets).values(row as typeof tickets.$inferInsert);
    }
  });

  await insertRows("ticketAssignments", d.ticketAssignments, async (row) => {
    if (merge) {
      await client
        .insert(ticketAssignments)
        .values(row as typeof ticketAssignments.$inferInsert)
        .onConflictDoNothing();
    } else {
      await client.insert(ticketAssignments).values(row as typeof ticketAssignments.$inferInsert);
    }
  });

  if (d.tenantDuitkuConfig) {
    if (!merge) {
      await client
        .insert(tenantDuitkuConfigs)
        .values(deserializeRow(d.tenantDuitkuConfig) as typeof tenantDuitkuConfigs.$inferInsert);
    } else {
      const exists = await client.query.tenantDuitkuConfigs.findFirst({
        where: eq(tenantDuitkuConfigs.tenantId, backup.tenantId),
      });
      if (!exists) {
        await client
          .insert(tenantDuitkuConfigs)
          .values(deserializeRow(d.tenantDuitkuConfig) as typeof tenantDuitkuConfigs.$inferInsert);
      }
    }
  }

  if (d.tenantWhatsAppConfig) {
    if (!merge) {
      await client
        .insert(tenantWhatsAppConfigs)
        .values(deserializeRow(d.tenantWhatsAppConfig) as typeof tenantWhatsAppConfigs.$inferInsert);
    } else {
      const exists = await client.query.tenantWhatsAppConfigs.findFirst({
        where: eq(tenantWhatsAppConfigs.tenantId, backup.tenantId),
      });
      if (!exists) {
        await client
          .insert(tenantWhatsAppConfigs)
          .values(deserializeRow(d.tenantWhatsAppConfig) as typeof tenantWhatsAppConfigs.$inferInsert);
      }
    }
  }

  return { inserted, skipped };
}

export async function restoreTenantBackup(
  tenantId: string,
  backup: TenantBackupPayload,
  mode: Exclude<RestoreMode, "preview">
): Promise<RestoreResult> {
  validateBackupPayload(backup, tenantId);

  let snapshotPath: string | undefined;
  if (mode === "replace") {
    snapshotPath = await saveTenantSnapshot(tenantId, "pre-restore");
  }

  const sqlite = requireSqlite();
  sqlite.exec("BEGIN IMMEDIATE");
  try {
    if (mode === "replace") {
      await clearTenantOperationalData(db, tenantId);
    }
    const { inserted, skipped } = await insertAll(db, backup, mode === "merge");
    sqlite.exec("COMMIT");
    return { mode, inserted, skipped, snapshotPath };
  } catch (err) {
    try {
      sqlite.exec("ROLLBACK");
    } catch {
      /* koneksi sudah di-rollback */
    }
    throw err;
  }
}
