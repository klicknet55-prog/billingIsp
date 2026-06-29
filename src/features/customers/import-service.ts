import "server-only";
import { and, eq } from "drizzle-orm";
import { normalizePhone } from "@/lib/auth/otp";
import { db } from "@/lib/db";
import { odp, paketInternet, pelanggan, pelangganImportBatches, routers } from "@/lib/db/schema";
import { parseLocalDate, nextDueDateFromBillingDay } from "@/features/jobs/due-date";
import { newId } from "@/lib/utils";
import { parseCsvText, type CsvImportRow } from "./csv-import";
import { createPelanggan, type PelangganInput } from "./service";

export type ImportMode = "skip" | "stop";

export type ImportPreviewRow = {
  line: number;
  nama: string;
  noWa: string;
  valid: boolean;
  errors: string[];
  warnings: string[];
};

export type ImportRunResult = {
  batchId?: string;
  queued?: boolean;
  total: number;
  success: number;
  failed: number;
  rows: Array<{
    line: number;
    nama: string;
    noWa: string;
    ok: boolean;
    error?: string;
    warning?: string;
    pelangganId?: string;
  }>;
  stoppedEarly?: boolean;
};

type TenantLookups = {
  paketByName: Map<string, { id: string; routerId: string | null; tipe: "pppoe" | "hotspot" }>;
  routerByName: Map<string, string>;
  odpByKode: Map<string, string>;
  existingWa: Set<string>;
};

async function loadTenantLookups(tenantId: string): Promise<TenantLookups> {
  const [pakets, routerRows, odpRows, existing] = await Promise.all([
    db.query.paketInternet.findMany({ where: eq(paketInternet.tenantId, tenantId) }),
    db.query.routers.findMany({ where: eq(routers.tenantId, tenantId) }),
    db.query.odp.findMany({ where: eq(odp.tenantId, tenantId) }),
    db.query.pelanggan.findMany({
      where: eq(pelanggan.tenantId, tenantId),
      columns: { noWa: true },
    }),
  ]);

  const paketByName = new Map<string, { id: string; routerId: string | null; tipe: "pppoe" | "hotspot" }>();
  for (const p of pakets) {
    const entry = {
      id: p.id,
      routerId: p.routerId,
      tipe: p.tipe,
    };
    paketByName.set(p.nama.trim().toLowerCase(), entry);
    const speed = p.kecepatan?.trim().toLowerCase();
    if (speed && !paketByName.has(speed)) {
      paketByName.set(speed, entry);
    }
  }

  const routerByName = new Map<string, string>();
  for (const r of routerRows) {
    routerByName.set(r.nama.trim().toLowerCase(), r.id);
  }

  const odpByKode = new Map<string, string>();
  for (const o of odpRows) {
    odpByKode.set(o.kode.trim().toLowerCase(), o.id);
  }

  const existingWa = new Set(existing.map((e) => normalizePhone(e.noWa)));

  return { paketByName, routerByName, odpByKode, existingWa };
}

function defaultUsername(nama: string, noWa: string): string {
  const base =
    nama
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .slice(0, 10) || "user";
  return `${base}${noWa.replace(/\D/g, "").slice(-4)}`;
}

function defaultPassword(): string {
  return Math.random().toString(36).slice(2, 10);
}

function validateRow(
  row: CsvImportRow,
  lookups: TenantLookups,
  seenWa: Set<string>
): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!row.nama.trim()) errors.push("Nama wajib diisi.");

  let phone = "";
  try {
    phone = row.noWa.trim() ? normalizePhone(row.noWa) : "";
    if (!phone) errors.push("Nomor WhatsApp wajib diisi.");
  } catch {
    errors.push("Format nomor WhatsApp tidak valid.");
  }

  if (phone) {
    if (lookups.existingWa.has(phone)) errors.push("Nomor WA sudah terdaftar.");
    if (seenWa.has(phone)) errors.push("Nomor WA duplikat dalam file CSV.");
    else seenWa.add(phone);
  }

  if (row.paket?.trim()) {
    const paket = lookups.paketByName.get(row.paket.trim().toLowerCase());
    if (!paket) {
      errors.push(`Paket "${row.paket}" tidak ditemukan (cocokkan nama atau kecepatan paket).`);
    } else if (row.router?.trim()) {
      const routerId = lookups.routerByName.get(row.router.trim().toLowerCase());
      if (!routerId) {
        errors.push(`Router "${row.router}" tidak ditemukan.`);
      } else if (paket.routerId && paket.routerId !== routerId) {
        errors.push(
          `Router "${row.router}" tidak sesuai paket "${row.paket}". Kosongkan kolom router — router mengikuti paket.`
        );
      }
    }
  } else if (row.router?.trim()) {
    if (!lookups.routerByName.has(row.router.trim().toLowerCase())) {
      errors.push(`Router "${row.router}" tidak ditemukan.`);
    }
  }

  if (row.odp?.trim()) {
    if (!lookups.odpByKode.has(row.odp.trim().toLowerCase())) {
      errors.push(`ODP "${row.odp}" tidak ditemukan.`);
    }
  }

  if (row.billingDay?.trim()) {
    const day = Number(row.billingDay);
    if (!Number.isInteger(day) || day < 1 || day > 28) {
      errors.push("billingDay harus angka 1–28.");
    }
  }

  if (row.connectionType?.trim()) {
    const t = row.connectionType.trim().toLowerCase();
    if (t !== "pppoe" && t !== "hotspot") {
      errors.push("connectionType harus pppoe atau hotspot.");
    }
  }

  if (row.tglDaftar?.trim() && !parseLocalDate(row.tglDaftar.trim())) {
    errors.push("tglDaftar harus format YYYY-MM-DD.");
  }

  if (!row.username?.trim() || !row.password?.trim()) {
    warnings.push("Username/password kosong — akan di-generate otomatis.");
  }

  return { errors, warnings };
}

export async function previewPelangganCsvImport(
  tenantId: string,
  csvText: string
): Promise<{ rows: ImportPreviewRow[]; validCount: number; errorCount: number }> {
  const parsed = parseCsvText(csvText);
  if (parsed.length === 0) throw new Error("File CSV kosong atau tidak valid.");

  const lookups = await loadTenantLookups(tenantId);
  const seenWa = new Set<string>();

  const rows: ImportPreviewRow[] = parsed.map((row) => {
    const { errors, warnings } = validateRow(row, lookups, seenWa);
    return {
      line: row.line,
      nama: row.nama.trim(),
      noWa: row.noWa.trim(),
      valid: errors.length === 0,
      errors,
      warnings,
    };
  });

  return {
    rows,
    validCount: rows.filter((r) => r.valid).length,
    errorCount: rows.filter((r) => !r.valid).length,
  };
}

function rowToPelangganInput(row: CsvImportRow, lookups: TenantLookups): PelangganInput {
  const phone = normalizePhone(row.noWa);
  let paketInternetId: string | null = null;
  let routerId: string | null = null;
  let connectionType: "pppoe" | "hotspot" =
    row.connectionType?.trim().toLowerCase() === "hotspot" ? "hotspot" : "pppoe";

  if (row.paket?.trim()) {
    const paket = lookups.paketByName.get(row.paket.trim().toLowerCase());
    if (paket) {
      paketInternetId = paket.id;
      routerId = paket.routerId;
      connectionType = paket.tipe;
    }
  }

  // Router kolom CSV hanya dipakai bila paket tidak diisi (router mengikuti paket).
  if (!paketInternetId && row.router?.trim()) {
    routerId = lookups.routerByName.get(row.router.trim().toLowerCase()) ?? routerId;
  }

  const tglDaftar = row.tglDaftar?.trim()
    ? parseLocalDate(row.tglDaftar.trim()) ?? new Date()
    : new Date();

  let tglJatuhTempo: Date | null = null;
  if (row.billingDay?.trim()) {
    const day = Number(row.billingDay);
    if (Number.isInteger(day) && day >= 1 && day <= 28) {
      tglJatuhTempo = nextDueDateFromBillingDay(day, tglDaftar);
    }
  }

  const username = row.username?.trim() || defaultUsername(row.nama, phone);
  const password = row.password?.trim() || defaultPassword();

  let odpId: string | null = null;
  if (row.odp?.trim()) {
    odpId = lookups.odpByKode.get(row.odp.trim().toLowerCase()) ?? null;
  }

  return {
    nama: row.nama.trim(),
    noWa: phone,
    connectionType,
    connectionUsername: username,
    connectionPassword: password,
    alamat: row.alamat?.trim() || null,
    paketInternetId,
    routerId,
    odpId,
    tglDaftar,
    tglJatuhTempo,
  };
}

export async function runPelangganCsvImport(input: {
  tenantId: string;
  createdBy: string;
  csvText: string;
  mode: ImportMode;
  batchId?: string;
}): Promise<ImportRunResult> {
  const parsed = parseCsvText(input.csvText);
  const lookups = await loadTenantLookups(input.tenantId);
  const seenWa = new Set<string>();

  const results: ImportRunResult["rows"] = [];
  let success = 0;
  let failed = 0;
  let stoppedEarly = false;

  for (const row of parsed) {
    const { errors } = validateRow(row, lookups, seenWa);
    if (errors.length > 0) {
      failed++;
      results.push({
        line: row.line,
        nama: row.nama,
        noWa: row.noWa,
        ok: false,
        error: errors.join(" "),
      });
      if (input.mode === "stop") {
        stoppedEarly = true;
        break;
      }
      continue;
    }

    try {
      const pelInput = rowToPelangganInput(row, lookups);
      const created = await createPelanggan(input.tenantId, pelInput, input.createdBy);
      lookups.existingWa.add(pelInput.noWa);
      success++;
      results.push({
        line: row.line,
        nama: row.nama,
        noWa: row.noWa,
        ok: true,
        pelangganId: created.id,
        warning: created.mikrotikWarning,
      });
    } catch (err) {
      failed++;
      results.push({
        line: row.line,
        nama: row.nama,
        noWa: row.noWa,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
      if (input.mode === "stop") {
        stoppedEarly = true;
        break;
      }
    }
  }

  const payload: ImportRunResult = {
    batchId: input.batchId,
    total: parsed.length,
    success,
    failed,
    rows: results,
    stoppedEarly,
  };

  if (input.batchId) {
    await db
      .update(pelangganImportBatches)
      .set({
        status: "completed",
        success,
        failed,
        rowResults: results,
        finishedAt: new Date(),
      })
      .where(eq(pelangganImportBatches.id, input.batchId));
  }

  return payload;
}

export async function createImportBatch(input: {
  tenantId: string;
  createdBy: string;
  csvText: string;
  mode: ImportMode;
  total: number;
}) {
  const id = newId("pimp");
  await db.insert(pelangganImportBatches).values({
    id,
    tenantId: input.tenantId,
    status: "queued",
    mode: input.mode,
    total: input.total,
    success: 0,
    failed: 0,
    csvPayload: input.csvText,
    createdBy: input.createdBy,
  });
  return id;
}

export async function getImportBatchStatus(tenantId: string, batchId: string) {
  return db.query.pelangganImportBatches.findFirst({
    where: and(eq(pelangganImportBatches.tenantId, tenantId), eq(pelangganImportBatches.id, batchId)),
  });
}

export async function markImportBatchRunning(batchId: string) {
  await db
    .update(pelangganImportBatches)
    .set({ status: "running", startedAt: new Date() })
    .where(eq(pelangganImportBatches.id, batchId));
}

export async function markImportBatchFailed(batchId: string, error: string) {
  await db
    .update(pelangganImportBatches)
    .set({ status: "failed", error, finishedAt: new Date() })
    .where(eq(pelangganImportBatches.id, batchId));
}

export async function runImportBatchById(batchId: string) {
  const batch = await db.query.pelangganImportBatches.findFirst({
    where: eq(pelangganImportBatches.id, batchId),
  });
  if (!batch) throw new Error("Batch import tidak ditemukan.");

  await markImportBatchRunning(batchId);
  try {
    return await runPelangganCsvImport({
      tenantId: batch.tenantId,
      createdBy: batch.createdBy ?? batch.tenantId,
      csvText: batch.csvPayload,
      mode: batch.mode,
      batchId,
    });
  } catch (err) {
    await markImportBatchFailed(
      batchId,
      err instanceof Error ? err.message : String(err)
    );
    throw err;
  }
}
