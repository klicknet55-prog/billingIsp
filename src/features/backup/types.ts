export const BACKUP_FORMAT = "netmanage-tenant-backup" as const;
export const BACKUP_VERSION = 1 as const;
export const MAX_BACKUP_UPLOAD_BYTES = 50 * 1024 * 1024;
export const MAX_RESTORE_PER_DAY = 3;

export type RestoreMode = "preview" | "merge" | "replace";

export interface TenantBackupCounts {
  users: number;
  routers: number;
  paketInternet: number;
  odp: number;
  pelanggan: number;
  invoices: number;
  tagihan: number;
  receiptTagihanLinks: number;
  tickets: number;
  ticketAssignments: number;
  kategoriPengeluaran: number;
  pengeluaran: number;
}

export interface TenantBackupPayload {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  tenantId: string;
  tenantDomain: string;
  appVersion: string;
  counts: TenantBackupCounts;
  data: TenantBackupData;
}

export interface TenantBackupData {
  tenant: Record<string, unknown>;
  users: Record<string, unknown>[];
  routers: Record<string, unknown>[];
  paketInternet: Record<string, unknown>[];
  odp: Record<string, unknown>[];
  pelanggan: Record<string, unknown>[];
  invoices: Record<string, unknown>[];
  /** Opsional pada backup lama (sebelum tagihan terpisah). */
  tagihan?: Record<string, unknown>[];
  receiptTagihanLinks?: Record<string, unknown>[];
  tickets: Record<string, unknown>[];
  ticketAssignments: Record<string, unknown>[];
  kategoriPengeluaran: Record<string, unknown>[];
  pengeluaran: Record<string, unknown>[];
  tenantDuitkuConfig: Record<string, unknown> | null;
  tenantWhatsAppConfig: Record<string, unknown> | null;
}

export interface RestoreResult {
  mode: RestoreMode;
  inserted: Partial<TenantBackupCounts>;
  skipped: Partial<TenantBackupCounts>;
  snapshotPath?: string;
}

export interface BackupPreview {
  exportedAt: string;
  tenantId: string;
  tenantDomain: string;
  appVersion: string;
  counts: TenantBackupCounts;
  namaUsaha: string;
}
