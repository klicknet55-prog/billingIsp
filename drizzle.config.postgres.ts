import type { Config } from "drizzle-kit";

/** Dipakai saat Fase 5: `npm run db:generate:pg` / `db:migrate:pg` */
export default {
  schema: "./src/lib/db/schema.pg.ts",
  out: "./drizzle/pg",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
