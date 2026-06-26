export type DatabaseDriver = "sqlite" | "postgres";

/** Default sqlite — production server lama tidak perlu ubah .env. */
export function getDatabaseDriver(): DatabaseDriver {
  const raw = process.env.DATABASE_DRIVER?.trim().toLowerCase();
  if (raw === "postgres" || raw === "postgresql") return "postgres";
  return "sqlite";
}

export function isPostgresDriver(): boolean {
  return getDatabaseDriver() === "postgres";
}

export function isSqliteDriver(): boolean {
  return getDatabaseDriver() === "sqlite";
}
