import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { hashPassword } from "@/lib/auth/password";
import { PLATFORM_SETTINGS_ID } from "@/lib/db/schema.pg";
import {
  packageTenants,
  platformSettings,
  users,
} from "@/lib/db/schema.pg";
import { DEFAULT_PLATFORM_SETTINGS } from "@/features/platform-settings/defaults";
import { newId } from "@/lib/utils";
import type { SuperadminInput } from "./types";

async function withPg<T>(databaseUrl: string, fn: (db: ReturnType<typeof drizzle>) => Promise<T>): Promise<T> {
  const client = postgres(databaseUrl, { max: 1 });
  const db = drizzle(client);
  try {
    return await fn(db);
  } finally {
    await client.end({ timeout: 10 });
  }
}

export async function seedFreshPlatformData(databaseUrl: string): Promise<void> {
  await withPg(databaseUrl, async (db) => {
    const existingPkg = await db.select({ id: packageTenants.id }).from(packageTenants).limit(1);
    if (existingPkg.length === 0) {
      await db.insert(packageTenants).values([
        {
          id: newId("pkg"),
          nama: "Free",
          hargaBulanan: 0,
          diskonTahunanPersen: 0,
          limitasi: { maxPelanggan: 25, maxRouter: 1, fitur: ["pelanggan", "invoice"] },
        },
        {
          id: newId("pkg"),
          nama: "Standard",
          hargaBulanan: 149000,
          diskonTahunanPersen: 10,
          limitasi: {
            maxPelanggan: 250,
            maxRouter: 5,
            fitur: ["pelanggan", "invoice", "tiket", "api_mikrotik"],
          },
        },
        {
          id: newId("pkg"),
          nama: "Premium",
          hargaBulanan: 399000,
          diskonTahunanPersen: 15,
          limitasi: {
            maxPelanggan: 2000,
            maxRouter: 50,
            fitur: ["pelanggan", "invoice", "tiket", "api_mikrotik", "laporan_keuangan"],
          },
        },
      ]);
    }

    const existingSettings = await db
      .select({ id: platformSettings.id })
      .from(platformSettings)
      .where(eq(platformSettings.id, PLATFORM_SETTINGS_ID))
      .limit(1);

    if (existingSettings.length === 0) {
      await db
        .insert(platformSettings)
        .values({
          id: PLATFORM_SETTINGS_ID,
          brandName: DEFAULT_PLATFORM_SETTINGS.brandName,
          brandTagline: DEFAULT_PLATFORM_SETTINGS.brandTagline,
          logoUrl: DEFAULT_PLATFORM_SETTINGS.logoUrl,
          ownerName: DEFAULT_PLATFORM_SETTINGS.ownerName,
          ownerPhone: DEFAULT_PLATFORM_SETTINGS.ownerPhone,
          ownerEmail: DEFAULT_PLATFORM_SETTINGS.ownerEmail,
          address: DEFAULT_PLATFORM_SETTINGS.address,
          telegramGroupUrl: DEFAULT_PLATFORM_SETTINGS.telegramGroupUrl,
          tentangTitle: DEFAULT_PLATFORM_SETTINGS.tentangTitle,
          tentangContent: DEFAULT_PLATFORM_SETTINGS.tentangContent,
          kontakTitle: DEFAULT_PLATFORM_SETTINGS.kontakTitle,
          kontakContent: DEFAULT_PLATFORM_SETTINGS.kontakContent,
          kontakWhatsapp: DEFAULT_PLATFORM_SETTINGS.kontakWhatsapp,
          tcTitle: DEFAULT_PLATFORM_SETTINGS.tcTitle,
          tcContent: DEFAULT_PLATFORM_SETTINGS.tcContent,
        })
        .onConflictDoNothing({ target: platformSettings.id });
    }
  });
}

export async function createSuperadminUser(
  databaseUrl: string,
  input: SuperadminInput
): Promise<string> {
  const email = input.email.trim().toLowerCase();
  if (!email.includes("@")) throw new Error("Email tidak valid.");
  if (input.password.length < 8) throw new Error("Password minimal 8 karakter.");

  return withPg(databaseUrl, async (db) => {
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (existing.length > 0) {
      throw new Error(`Email ${email} sudah terdaftar.`);
    }

    const id = newId("usr");
    await db.insert(users).values({
      id,
      tenantId: null,
      nama: input.nama.trim() || "Super Admin",
      email,
      passwordHash: hashPassword(input.password),
      role: "superadmin",
      phone: input.phone?.trim() || null,
    });
    return email;
  });
}
