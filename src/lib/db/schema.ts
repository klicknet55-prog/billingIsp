import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Skema database NetManage (multi-tenant).
 * Semua tabel bisnis WAJIB punya `tenantId` untuk isolasi data antar ISP.
 * Dialek: SQLite (dev). Tipe sengaja netral agar mudah migrasi ke PostgreSQL.
 */

const now = sql`(unixepoch())`;

// ---------------------------------------------------------------------------
// Platform: Tenant, User, Paket SaaS, Subscription
// ---------------------------------------------------------------------------

export const tenants = sqliteTable("tenant", {
  id: text("id").primaryKey(),
  namaUsaha: text("nama_usaha").notNull(),
  logoUrl: text("logo_url"),
  domain: text("domain").notNull().unique(),
  status: text("status", { enum: ["active", "suspended"] })
    .notNull()
    .default("active"),
  // Preferensi tema warna per tenant (dipakai sebagai default lintas device).
  themePreset: text("theme_preset").notNull().default("default"),
  themeMode: text("theme_mode", { enum: ["light", "dark"] })
    .notNull()
    .default("light"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(now),
});

export const users = sqliteTable("user", {
  id: text("id").primaryKey(),
  // superadmin platform tidak terikat tenant (tenantId null).
  tenantId: text("tenant_id").references(() => tenants.id),
  nama: text("nama").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", {
    enum: ["superadmin", "owner", "admin", "kolektor", "teknisi"],
  }).notNull(),
  phone: text("phone"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(now),
});

export const packageTenants = sqliteTable("package_tenant", {
  id: text("id").primaryKey(),
  nama: text("nama").notNull(),
  hargaBulanan: integer("harga_bulanan").notNull().default(0),
  // limitasi: { maxPelanggan, maxRouter, fitur: string[] }
  limitasi: text("limitasi", { mode: "json" })
    .$type<{ maxPelanggan: number; maxRouter: number; fitur: string[] }>()
    .notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
});

export const subscriptions = sqliteTable("subscription", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id),
  packageTenantId: text("package_tenant_id")
    .notNull()
    .references(() => packageTenants.id),
  mulai: integer("mulai", { mode: "timestamp" }).notNull().default(now),
  akhir: integer("akhir", { mode: "timestamp" }).notNull(),
  status: text("status", { enum: ["active", "expired"] })
    .notNull()
    .default("active"),
});

// ---------------------------------------------------------------------------
// ISP: Router, Paket Internet, Pelanggan, Invoice
// ---------------------------------------------------------------------------

export const routers = sqliteTable("router", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id),
  nama: text("nama").notNull(),
  ipAddress: text("ip_address").notNull(),
  apiPort: text("api_port").notNull().default("8728"),
  username: text("username").notNull(),
  passwordEncrypted: text("password_encrypted").notNull(),
  tipe: text("tipe", { enum: ["pppoe", "hotspot"] })
    .notNull()
    .default("pppoe"),
  isOnline: integer("is_online", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(now),
});

export const paketInternet = sqliteTable("paket_internet", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id),
  nama: text("nama").notNull(),
  kecepatan: text("kecepatan").notNull(),
  hargaBulanan: integer("harga_bulanan").notNull().default(0),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
});

export const pelanggan = sqliteTable("pelanggan", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id),
  nama: text("nama").notNull(),
  noWa: text("no_wa").notNull(),
  alamat: text("alamat"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  ipAddress: text("ip_address"),
  paketInternetId: text("paket_internet_id").references(() => paketInternet.id),
  routerId: text("router_id").references(() => routers.id),
  tglJatuhTempo: integer("tgl_jatuh_tempo", { mode: "timestamp" }),
  isIsolated: integer("is_isolated", { mode: "boolean" }).notNull().default(false),
  createdBy: text("created_by").references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(now),
});

export const invoices = sqliteTable("invoice", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id),
  pelangganId: text("pelanggan_id")
    .notNull()
    .references(() => pelanggan.id),
  noInvoice: text("no_invoice").notNull(),
  totalTagihan: integer("total_tagihan").notNull().default(0),
  status: text("status", { enum: ["unpaid", "paid", "overdue"] })
    .notNull()
    .default("unpaid"),
  tglJatuhTempo: integer("tgl_jatuh_tempo", { mode: "timestamp" }),
  tglLunas: integer("tgl_lunas", { mode: "timestamp" }),
  metodeBayar: text("metode_bayar"),
  createdBy: text("created_by").references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(now),
});

// ---------------------------------------------------------------------------
// Helpdesk: Ticket & penugasan
// ---------------------------------------------------------------------------

export const tickets = sqliteTable("ticket", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id),
  pelangganId: text("pelanggan_id")
    .notNull()
    .references(() => pelanggan.id),
  judul: text("judul").notNull(),
  deskripsi: text("deskripsi"),
  fotoUrl: text("foto_url"),
  status: text("status", { enum: ["open", "in_progress", "resolved"] })
    .notNull()
    .default("open"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(now),
});

export const ticketAssignments = sqliteTable("ticket_assignment", {
  id: text("id").primaryKey(),
  ticketId: text("ticket_id")
    .notNull()
    .references(() => tickets.id),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  assignedAt: integer("assigned_at", { mode: "timestamp" }).notNull().default(now),
});

// ---------------------------------------------------------------------------
// Keuangan: Kategori pengeluaran & pengeluaran
// ---------------------------------------------------------------------------

export const kategoriPengeluaran = sqliteTable("kategori_pengeluaran", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id),
  nama: text("nama").notNull(),
});

export const pengeluaran = sqliteTable("pengeluaran", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id),
  kategoriId: text("kategori_id").references(() => kategoriPengeluaran.id),
  jumlah: integer("jumlah").notNull().default(0),
  catatan: text("catatan"),
  tanggal: integer("tanggal", { mode: "timestamp" }).notNull().default(now),
});

// ---------------------------------------------------------------------------
// Payment gateway log (polimorfik: subscription | invoice)
// ---------------------------------------------------------------------------

export const paymentGatewayLogs = sqliteTable("payment_gateway_log", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").references(() => tenants.id),
  referenceType: text("reference_type", {
    enum: ["subscription", "invoice"],
  }).notNull(),
  referenceId: text("reference_id").notNull(),
  duitkuOrderId: text("duitku_order_id"),
  status: text("status", { enum: ["pending", "success", "failed"] })
    .notNull()
    .default("pending"),
  amount: integer("amount").notNull().default(0),
  paymentMethod: text("payment_method"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(now),
});

// ---------------------------------------------------------------------------
// Integrasi per-tenant (credential milik masing-masing ISP)
// ---------------------------------------------------------------------------

export const tenantDuitkuConfigs = sqliteTable("tenant_duitku_config", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id")
    .notNull()
    .unique()
    .references(() => tenants.id),
  merchantCode: text("merchant_code").notNull(),
  apiKeyEncrypted: text("api_key_encrypted").notNull(),
  callbackUrl: text("callback_url"),
  inquiryUrl: text("inquiry_url"),
  paymentMethod: text("payment_method").notNull().default("VC"),
  isEnabled: integer("is_enabled", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(now),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(now),
});

export const tenantWhatsAppConfigs = sqliteTable("tenant_whatsapp_config", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id")
    .notNull()
    .unique()
    .references(() => tenants.id),
  apiUrl: text("api_url").notNull(),
  apiTokenEncrypted: text("api_token_encrypted").notNull(),
  provider: text("provider", { enum: ["gateway", "waba"] }).notNull().default("gateway"),
  phoneNumberId: text("phone_number_id"),
  isEnabled: integer("is_enabled", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(now),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(now),
});

// ---------------------------------------------------------------------------
// Auth: session & OTP (mendukung password staf + OTP pelanggan)
// ---------------------------------------------------------------------------

export const sessions = sqliteTable("session", {
  id: text("id").primaryKey(),
  // Pemilik session: staf (user) atau pelanggan.
  subjectType: text("subject_type", { enum: ["user", "pelanggan"] }).notNull(),
  subjectId: text("subject_id").notNull(),
  tenantId: text("tenant_id"),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(now),
});

export const otpCodes = sqliteTable("otp_code", {
  id: text("id").primaryKey(),
  phone: text("phone").notNull(),
  code: text("code").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  consumedAt: integer("consumed_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(now),
});

// ---------------------------------------------------------------------------
// Tipe turunan (untuk dipakai di service & komponen)
// ---------------------------------------------------------------------------

export type Tenant = typeof tenants.$inferSelect;
export type User = typeof users.$inferSelect;
export type PackageTenant = typeof packageTenants.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type Router = typeof routers.$inferSelect;
export type PaketInternet = typeof paketInternet.$inferSelect;
export type Pelanggan = typeof pelanggan.$inferSelect;
export type Invoice = typeof invoices.$inferSelect;
export type Ticket = typeof tickets.$inferSelect;
export type Pengeluaran = typeof pengeluaran.$inferSelect;
export type KategoriPengeluaran = typeof kategoriPengeluaran.$inferSelect;
export type PaymentGatewayLog = typeof paymentGatewayLogs.$inferSelect;
export type TenantDuitkuConfig = typeof tenantDuitkuConfigs.$inferSelect;
export type TenantWhatsAppConfig = typeof tenantWhatsAppConfigs.$inferSelect;
export type Session = typeof sessions.$inferSelect;
