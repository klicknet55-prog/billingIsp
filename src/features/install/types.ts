export type RequirementStatus = "ok" | "warn" | "fail";

export type RequirementCheck = {
  id: string;
  label: string;
  status: RequirementStatus;
  detail: string;
};

export type InstallEnvInput = {
  databaseUrl: string;
  authSecret: string;
  appUrl: string;
  appTimezone: string;
  cronSecret?: string;
};

export type SuperadminInput = {
  nama: string;
  email: string;
  password: string;
  phone?: string;
};

export type DataSourceMode = "fresh" | "sqlite";

export type SqliteMigrationSummary = {
  totalRows: number;
  tables: { name: string; rows: number }[];
};

export type InstallActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; error: string };
