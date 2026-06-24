/**
 * Tambah kolom SQLite yang hilang (idempotent). Aman dijalankan berulang.
 * Dipakai saat deploy production jika `db:push` tidak membaca `.env` yang sama dengan app.
 */
import Database from "better-sqlite3";
import { applyColumnPatches, hasDbTable } from "./schema-patches";

const DB_PATH = process.env.DATABASE_URL ?? "./netmanage.db";

type TableInfo = { name: string };

function hasColumn(db: Database.Database, table: string, column: string) {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as TableInfo[];
  return rows.some((r) => r.name === column);
}

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

let applied = 0;

/** Tabel ODP harus ada sebelum patch pelanggan.odp_id atau kolom odp.* */
if (!hasDbTable(db, "odp")) {
  db.exec(`
    CREATE TABLE odp (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL REFERENCES tenant(id),
      kode TEXT NOT NULL,
      nama TEXT,
      latitude REAL,
      longitude REAL,
      splitter_rasio TEXT,
      redaman_input_db REAL,
      redaman_output_db REAL,
      splitter_pasif TEXT,
      kapasitas_port INTEGER NOT NULL DEFAULT 8,
      input_router_id TEXT REFERENCES router(id),
      input_odp_id TEXT REFERENCES odp(id),
      catatan TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
    CREATE UNIQUE INDEX IF NOT EXISTS odp_tenant_kode ON odp(tenant_id, kode);
  `);
  applied++;
  console.log("[ok]   tabel odp dibuat");
}

applied += applyColumnPatches(db, { log: true });

if (hasColumn(db, "paket_internet", "tipe") && hasColumn(db, "router", "tipe")) {
  const result = db
    .prepare(
      `UPDATE paket_internet
       SET tipe = (
         SELECT r.tipe FROM router r WHERE r.id = paket_internet.router_id
       )
       WHERE router_id IS NOT NULL
         AND EXISTS (
           SELECT 1 FROM router r
           WHERE r.id = paket_internet.router_id AND r.tipe IS NOT NULL
         )`
    )
    .run();
  if (result.changes > 0) {
    console.log(`[ok]   paket_internet.tipe di-backfill dari router (${result.changes} baris)`);
  }
}

if (!hasDbTable(db, "platform_settings")) {
  db.exec(`
    CREATE TABLE platform_settings (
      id TEXT PRIMARY KEY,
      brand_name TEXT NOT NULL DEFAULT 'BILLING RT-RW NET',
      brand_tagline TEXT,
      logo_url TEXT,
      owner_name TEXT,
      owner_phone TEXT,
      owner_email TEXT,
      address TEXT,
      telegram_group_url TEXT,
      tentang_title TEXT NOT NULL,
      tentang_content TEXT NOT NULL,
      kontak_title TEXT NOT NULL,
      kontak_content TEXT NOT NULL,
      kontak_whatsapp TEXT,
      tc_title TEXT NOT NULL,
      tc_content TEXT NOT NULL,
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
  `);
  applied++;
  console.log("[ok]   tabel platform_settings dibuat");
}

const platformBrandPatches: { column: string; sql: string }[] = [
  {
    column: "brand_name",
    sql: "ALTER TABLE platform_settings ADD COLUMN brand_name TEXT NOT NULL DEFAULT 'BILLING RT-RW NET'",
  },
  { column: "brand_tagline", sql: "ALTER TABLE platform_settings ADD COLUMN brand_tagline TEXT" },
  { column: "logo_url", sql: "ALTER TABLE platform_settings ADD COLUMN logo_url TEXT" },
  { column: "owner_name", sql: "ALTER TABLE platform_settings ADD COLUMN owner_name TEXT" },
  { column: "owner_phone", sql: "ALTER TABLE platform_settings ADD COLUMN owner_phone TEXT" },
  { column: "owner_email", sql: "ALTER TABLE platform_settings ADD COLUMN owner_email TEXT" },
  { column: "address", sql: "ALTER TABLE platform_settings ADD COLUMN address TEXT" },
  {
    column: "telegram_group_url",
    sql: "ALTER TABLE platform_settings ADD COLUMN telegram_group_url TEXT",
  },
];

if (hasDbTable(db, "platform_settings")) {
  for (const patch of platformBrandPatches) {
    if (hasColumn(db, "platform_settings", patch.column)) {
      console.log(`[skip] platform_settings.${patch.column} sudah ada`);
      continue;
    }
    db.exec(patch.sql);
    applied++;
    console.log(`[ok]   platform_settings.${patch.column} ditambahkan`);
  }
}

const platformRow = db
  .prepare("SELECT id FROM platform_settings WHERE id = ?")
  .get("platform") as { id: string } | undefined;

if (!platformRow && hasDbTable(db, "platform_settings")) {
  const defaults = {
    tentangTitle: "Tentang Kami",
    tentangContent:
      "NetManage adalah platform manajemen billing dan jaringan untuk ISP serta RT-RW Net.\n\nKami membantu operator mengelola pelanggan, invoice, perangkat Mikrotik, penagihan lapangan, dan portal pelanggan dalam satu sistem terintegrasi.",
    kontakTitle: "Hubungi Kami",
    kontakContent:
      "Butuh bantuan teknis, demo produk, atau informasi paket SaaS?\n\nTim support kami siap membantu melalui WhatsApp pada jam operasional.",
    kontakWhatsapp: "6281234567890",
    tcTitle: "Syarat & Ketentuan",
    tcContent:
      "1. Pengguna wajib menjaga kerahasiaan akun dashboard.\n2. Data pelanggan menjadi tanggung jawab masing-masing tenant ISP.\n3. Pembayaran langganan SaaS mengikuti paket yang dipilih saat pendaftaran.\n4. Platform dapat menangguhkan akun yang melanggar ketentuan atau menunggak langganan.\n5. Ketentuan dapat diperbarui; perubahan akan diinformasikan melalui dashboard.",
  };
  db.prepare(
    `INSERT INTO platform_settings (
      id, brand_name, brand_tagline, tentang_title, tentang_content, kontak_title, kontak_content,
      kontak_whatsapp, tc_title, tc_content, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch())`
  ).run(
    "platform",
    "BILLING RT-RW NET",
    "Kelola pelanggan, billing, perangkat Mikrotik, penagihan lapangan, dan portal pelanggan dalam satu platform.",
    defaults.tentangTitle,
    defaults.tentangContent,
    defaults.kontakTitle,
    defaults.kontakContent,
    defaults.kontakWhatsapp,
    defaults.tcTitle,
    defaults.tcContent
  );
  applied++;
  console.log("[ok]   baris default platform_settings disisipkan");
}

if (!hasDbTable(db, "password_reset")) {
  db.exec(`
    CREATE TABLE password_reset (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      token TEXT NOT NULL UNIQUE,
      expires_at INTEGER NOT NULL,
      consumed_at INTEGER,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );
  `);
  applied++;
  console.log("[ok]   tabel password_reset dibuat");
}

db.close();
console.log(applied > 0 ? `Selesai — ${applied} perubahan schema.` : "Selesai — tidak ada perubahan.");
