import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Skema SQLite — production server lama + default dev.
 * PostgreSQL: schema.pg.ts
 */

const now = sql`(unixepoch())`;

// ---------------------------------------------------------------------------
// Platform: Tenant, User, Paket SaaS, Subscription
// ---------------------------------------------------------------------------

export const tenants = sqliteTable("tenant", {
  id: text("id").primaryKey(),
  namaUsaha: text("nama_usaha").notNull(),
  logoUrl: text("logo_url"),
  /** Alamat perusahaan untuk header laporan / nota. */
  alamat: text("alamat"),
  /** No. HP / WA perusahaan untuk header laporan. */
  phone: text("phone"),
  domain: text("domain").notNull().unique(),
  status: text("status", { enum: ["active", "suspended"] })
    .notNull()
    .default("active"),
  // Preferensi tema warna per tenant (dipakai sebagai default lintas device).
  themePreset: text("theme_preset").notNull().default("default"),
  themeMode: text("theme_mode", { enum: ["light", "dark"] })
    .notNull()
    .default("light"),
  referralCode: text("referral_code").unique(),
  referredByTenantId: text("referred_by_tenant_id"),
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
  /** Koordinat terakhir teknisi (untuk auto-assign tiket). */
  latitude: real("latitude"),
  longitude: real("longitude"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(now),
});

export const packageTenants = sqliteTable("package_tenant", {
  id: text("id").primaryKey(),
  nama: text("nama").notNull(),
  hargaBulanan: integer("harga_bulanan").notNull().default(0),
  diskonTahunanPersen: integer("diskon_tahunan_persen").notNull().default(0),
  // limitasi: { maxPelanggan, maxRouter, maxVpn?, fitur: string[] }
  limitasi: text("limitasi", { mode: "json" })
    .$type<{ maxPelanggan: number; maxRouter: number; maxVpn?: number; fitur: string[] }>()
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
  billingPeriod: text("billing_period", { enum: ["monthly", "yearly"] })
    .notNull()
    .default("monthly"),
  mulai: integer("mulai", { mode: "timestamp" }).notNull().default(now),
  akhir: integer("akhir", { mode: "timestamp" }).notNull(),
  status: text("status", { enum: ["active", "expired"] })
    .notNull()
    .default("active"),
  remind7dAt: integer("remind_7d_at", { mode: "timestamp" }),
  remind1dAt: integer("remind_1d_at", { mode: "timestamp" }),
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
  connectionMode: text("connection_mode", { enum: ["rest", "legacy_api"] })
    .notNull()
    .default("rest"),
  ipAddress: text("ip_address").notNull(),
  apiPort: text("api_port").notNull().default("8728"),
  username: text("username").notNull(),
  passwordEncrypted: text("password_encrypted").notNull(),
  isOnline: integer("is_online", { mode: "boolean" }).notNull().default(false),
  latitude: real("latitude"),
  longitude: real("longitude"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(now),
});

export const paketInternet = sqliteTable("paket_internet", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id),
  routerId: text("router_id").references(() => routers.id),
  tipe: text("tipe", { enum: ["pppoe", "hotspot"] }).notNull().default("pppoe"),
  nama: text("nama").notNull(),
  kecepatan: text("kecepatan").notNull(),
  mikrotikProfilePppoe: text("mikrotik_profile_pppoe"),
  mikrotikProfileHotspot: text("mikrotik_profile_hotspot"),
  hargaBulanan: integer("harga_bulanan").notNull().default(0),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
});

export const odp = sqliteTable("odp", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id),
  kode: text("kode").notNull(),
  nama: text("nama"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  splitterRasio: text("splitter_rasio"),
  redamanInputDb: real("redaman_input_db"),
  redamanOutputDb: real("redaman_output_db"),
  splitterPasif: text("splitter_pasif"),
  kapasitasPort: integer("kapasitas_port").notNull().default(8),
  /** Sumber input fiber: router/server (titik awal) */
  inputRouterId: text("input_router_id").references(() => routers.id),
  /** Sumber input fiber: ODP induk (cabang dari ODP lain) */
  inputOdpId: text("input_odp_id"),
  catatan: text("catatan"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(now),
});

export const pelanggan = sqliteTable("pelanggan", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id),
  nama: text("nama").notNull(),
  noWa: text("no_wa").notNull(),
  connectionType: text("connection_type", { enum: ["pppoe", "hotspot"] })
    .notNull()
    .default("pppoe"),
  connectionUsername: text("connection_username"),
  connectionPassword: text("connection_password"),
  alamat: text("alamat"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  ipAddress: text("ip_address"),
  paketInternetId: text("paket_internet_id").references(() => paketInternet.id),
  routerId: text("router_id").references(() => routers.id),
  /** Kolektor penagihan yang ditugaskan ke pelanggan ini. */
  kolektorId: text("kolektor_id").references(() => users.id),
  odpId: text("odp_id").references(() => odp.id),
  odpPort: text("odp_port"),
  /** Tanggal pendaftaran pelanggan — anchor billing (default = hari dibuat). */
  tglDaftar: integer("tgl_daftar", { mode: "timestamp" }),
  tglJatuhTempo: integer("tgl_jatuh_tempo", { mode: "timestamp" }),
  isIsolated: integer("is_isolated", { mode: "boolean" }).notNull().default(false),
  createdBy: text("created_by").references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(now),
});

/** Nota pembayaran — dibuat setelah bayar sukses. Status legacy unpaid/overdue untuk migrasi. */
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
    .default("paid"),
  lineItems: text("line_items", { mode: "json" })
    .$type<{ periode: string; amount: number; label: string }[]>(),
  tglJatuhTempo: integer("tgl_jatuh_tempo", { mode: "timestamp" }),
  preDueRemindedAt: integer("pre_due_reminded_at", { mode: "timestamp" }),
  tglLunas: integer("tgl_lunas", { mode: "timestamp" }),
  metodeBayar: text("metode_bayar"),
  createdBy: text("created_by").references(() => users.id),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(now),
});

/** Kewajiban bayar per periode — bukan nota. */
export const tagihan = sqliteTable("tagihan", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id),
  pelangganId: text("pelanggan_id")
    .notNull()
    .references(() => pelanggan.id),
  periode: text("periode").notNull(),
  amount: integer("amount").notNull(),
  dueDate: integer("due_date", { mode: "timestamp" }).notNull(),
  kind: text("kind", { enum: ["first", "recurring"] }).notNull(),
  status: text("status", { enum: ["open", "tunggakan", "processing", "paid", "partial"] })
    .notNull()
    .default("open"),
  amountPaid: integer("amount_paid").notNull().default(0),
  receiptId: text("receipt_id").references(() => invoices.id),
  preDueRemindedAt: integer("pre_due_reminded_at", { mode: "timestamp" }),
  dunningStep2At: integer("dunning_step2_at", { mode: "timestamp" }),
  dunningFinalAt: integer("dunning_final_at", { mode: "timestamp" }),
  paidAt: integer("paid_at", { mode: "timestamp" }),
  metodeBayar: text("metode_bayar"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(now),
});

export const receiptTagihanLinks = sqliteTable("receipt_tagihan_link", {
  id: text("id").primaryKey(),
  receiptId: text("receipt_id")
    .notNull()
    .references(() => invoices.id),
  tagihanId: text("tagihan_id")
    .notNull()
    .references(() => tagihan.id),
  amount: integer("amount").notNull(),
});

export const paymentAttempts = sqliteTable("payment_attempt", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id),
  pelangganId: text("pelanggan_id")
    .notNull()
    .references(() => pelanggan.id),
  idempotencyKey: text("idempotency_key").notNull(),
  selection: text("selection", { enum: ["bulan_ini", "tunggakan", "keduanya"] }).notNull(),
  status: text("status", { enum: ["pending", "completed", "failed"] }).notNull(),
  receiptId: text("receipt_id"),
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
    enum: ["subscription", "invoice", "donation"],
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
  provider: text("provider", { enum: ["gateway", "waba", "klicknet"] }).notNull().default("waba"),
  phoneNumberId: text("phone_number_id"),
  deviceId: text("device_id"),
  basicAuthUser: text("basic_auth_user"),
  isEnabled: integer("is_enabled", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(now),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(now),
});

export const tenantVpnAccounts = sqliteTable(
  "tenant_vpn_account",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id),
    label: text("label"),
    vpnUsername: text("vpn_username").notNull().unique(),
    passwordEncrypted: text("password_encrypted").notNull(),
    staticIp: text("static_ip").notNull(),
    portForwardName: text("port_forward_name").notNull().unique(),
    listenPort: integer("listen_port").notNull().unique(),
    destinationPort: integer("destination_port").notNull(),
    status: text("status", { enum: ["active", "disabled"] })
      .notNull()
      .default("active"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(now),
    updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(now),
  }
);

/** API key tenant untuk REST API v1 (hash only, plain key shown once at create). */
export const tenantApiKeys = sqliteTable("tenant_api_key", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id),
  label: text("label").notNull().default("Default"),
  keyPrefix: text("key_prefix").notNull(),
  keyHash: text("key_hash").notNull(),
  lastUsedAt: integer("last_used_at", { mode: "timestamp" }),
  revokedAt: integer("revoked_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(now),
});

export const tenantWebhooks = sqliteTable("tenant_webhook", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id")
    .notNull()
    .unique()
    .references(() => tenants.id),
  url: text("url").notNull(),
  secretEncrypted: text("secret_encrypted").notNull(),
  events: text("events", { mode: "json" }).$type<WebhookEvent[]>().notNull().default([]),
  isEnabled: integer("is_enabled", { mode: "boolean" }).notNull().default(false),
  lastDeliveryAt: integer("last_delivery_at", { mode: "timestamp" }),
  failureCount: integer("failure_count").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(now),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(now),
});

export const webhookDeliveryLogs = sqliteTable("webhook_delivery_log", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id),
  webhookId: text("webhook_id")
    .notNull()
    .references(() => tenantWebhooks.id),
  event: text("event").notNull(),
  requestUrl: text("request_url").notNull(),
  requestBody: text("request_body").notNull(),
  statusCode: integer("status_code"),
  responseBody: text("response_body"),
  success: integer("success", { mode: "boolean" }).notNull().default(false),
  error: text("error"),
  durationMs: integer("duration_ms"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(now),
});

export type PelangganImportRowResult = {
  line: number;
  nama: string;
  noWa: string;
  ok: boolean;
  error?: string;
  warning?: string;
  pelangganId?: string;
};

export const pelangganImportBatches = sqliteTable("pelanggan_import_batch", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id),
  status: text("status", { enum: ["queued", "running", "completed", "failed"] })
    .notNull()
    .default("queued"),
  mode: text("mode", { enum: ["skip", "stop"] }).notNull().default("skip"),
  total: integer("total").notNull().default(0),
  success: integer("success").notNull().default(0),
  failed: integer("failed").notNull().default(0),
  csvPayload: text("csv_payload").notNull(),
  rowResults: text("row_results", { mode: "json" }).$type<PelangganImportRowResult[]>(),
  error: text("error"),
  createdBy: text("created_by").references(() => users.id),
  startedAt: integer("started_at", { mode: "timestamp" }),
  finishedAt: integer("finished_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(now),
});

export type WebhookEvent =
  | "tagihan.paid"
  | "tagihan.partial_paid"
  | "pelanggan.isolated"
  | "pelanggan.activated"
  | "webhook.test";

export const WEBHOOK_EVENTS: WebhookEvent[] = [
  "tagihan.paid",
  "tagihan.partial_paid",
  "pelanggan.isolated",
  "pelanggan.activated",
];

export const platformWhatsAppConfigs = sqliteTable("platform_whatsapp_config", {
  id: text("id").primaryKey(),
  apiUrl: text("api_url").notNull(),
  apiTokenEncrypted: text("api_token_encrypted").notNull(),
  provider: text("provider", { enum: ["gateway", "waba", "klicknet"] }).notNull().default("waba"),
  phoneNumberId: text("phone_number_id"),
  deviceId: text("device_id"),
  basicAuthUser: text("basic_auth_user"),
  isEnabled: integer("is_enabled", { mode: "boolean" }).notNull().default(true),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(now),
});

export const devicePushTokens = sqliteTable("device_push_token", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").references(() => tenants.id),
  subjectType: text("subject_type", { enum: ["user", "pelanggan"] }).notNull(),
  subjectId: text("subject_id").notNull(),
  app: text("app", { enum: ["admin", "portal"] }).notNull(),
  platform: text("platform", { enum: ["android"] }).notNull().default("android"),
  token: text("token").notNull().unique(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  lastSeenAt: integer("last_seen_at", { mode: "timestamp" }).notNull().default(now),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(now),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(now),
});

export const pushNotificationLogs = sqliteTable("push_notification_log", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").references(() => tenants.id),
  subjectType: text("subject_type", { enum: ["user", "pelanggan"] }).notNull(),
  subjectId: text("subject_id").notNull(),
  app: text("app", { enum: ["admin", "portal"] }).notNull(),
  eventType: text("event_type").notNull(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  token: text("token").notNull(),
  status: text("status", { enum: ["sent", "failed", "skipped"] }).notNull(),
  attemptCount: integer("attempt_count").notNull().default(1),
  response: text("response"),
  error: text("error"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(now),
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

export const passwordResets = sqliteTable("password_reset", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  token: text("token").notNull().unique(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  consumedAt: integer("consumed_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(now),
});

/** Kode pendek magic link portal (link bayar WA) — lookup by code + expiry. */
export const portalAccessCodes = sqliteTable("portal_access_code", {
  code: text("code").primaryKey(),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id),
  pelangganId: text("pelanggan_id")
    .notNull()
    .references(() => pelanggan.id),
  redirect: text("redirect").notNull().default("/portal/tagihan"),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(now),
});

// ---------------------------------------------------------------------------
// Platform: halaman statis (Tentang, Kontak, Syarat & Ketentuan)
// ---------------------------------------------------------------------------

export const PLATFORM_SETTINGS_ID = "platform";

export const platformSettings = sqliteTable("platform_settings", {
  id: text("id").primaryKey(),
  /** Nama brand platform (homepage, title browser, dll.) */
  brandName: text("brand_name").notNull().default("BILLING RT-RW NET"),
  /** Tagline / deskripsi singkat di homepage & metadata */
  brandTagline: text("brand_tagline"),
  /** URL logo platform (public/uploads/platform-logo/...) */
  logoUrl: text("logo_url"),
  ownerName: text("owner_name"),
  ownerPhone: text("owner_phone"),
  ownerEmail: text("owner_email"),
  address: text("address"),
  /** Link invite grup Telegram (https://t.me/...) */
  telegramGroupUrl: text("telegram_group_url"),
  tentangTitle: text("tentang_title").notNull(),
  tentangContent: text("tentang_content").notNull(),
  kontakTitle: text("kontak_title").notNull(),
  kontakContent: text("kontak_content").notNull(),
  /** Nomor WA support platform (format 628xxx) untuk tombol wa.me */
  kontakWhatsapp: text("kontak_whatsapp"),
  tcTitle: text("tc_title").notNull(),
  tcContent: text("tc_content").notNull(),
  communityDescription: text("community_description"),
  communityDonationImageUrl: text("community_donation_image_url"),
  communityApkAdminUrl: text("community_apk_admin_url"),
  communityApkPortalUrl: text("community_apk_portal_url"),
  communityWhatsappSuperadmin: text("community_whatsapp_superadmin"),
  communityTelegramUrl: text("community_telegram_url"),
  cronLastRunAt: integer("cron_last_run_at", { mode: "timestamp" }),
  cronLastResult: text("cron_last_result"),
  /** Pencarian tempat di peta: nominatim (default) atau google — diatur superadmin. */
  mapGeocodingProvider: text("map_geocoding_provider", { enum: ["nominatim", "google"] })
    .notNull()
    .default("nominatim"),
  googleGeocodingApiKeyEncrypted: text("google_geocoding_api_key_encrypted"),
  referralEnabled: integer("referral_enabled", { mode: "boolean" }).notNull().default(false),
  referralRewardDays: integer("referral_reward_days").notNull().default(7),
  referralMaxPerTenant: integer("referral_max_per_tenant").notNull().default(10),
  freeRenewalDonationMin: integer("free_renewal_donation_min").notNull().default(10000),
  freeRenewalExtensionDays: integer("free_renewal_extension_days").notNull().default(30),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(now),
});

export const referralRewards = sqliteTable("referral_reward", {
  id: text("id").primaryKey(),
  referrerTenantId: text("referrer_tenant_id")
    .notNull()
    .references(() => tenants.id),
  refereeTenantId: text("referee_tenant_id")
    .notNull()
    .unique()
    .references(() => tenants.id),
  referralCode: text("referral_code").notNull(),
  rewardDays: integer("reward_days").notNull().default(0),
  status: text("status", { enum: ["pending", "rewarded", "rejected"] }).notNull(),
  rejectReason: text("reject_reason"),
  rewardedAt: integer("rewarded_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(now),
});

export const communityDonations = sqliteTable("community_donation", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  amount: integer("amount").notNull(),
  status: text("status", { enum: ["pending", "success", "failed"] }).notNull(),
  duitkuOrderId: text("duitku_order_id").notNull().unique(),
  paymentMethod: text("payment_method"),
  namaUsaha: text("nama_usaha").notNull(),
  domain: text("domain").notNull(),
  donorNama: text("donor_nama").notNull(),
  donorRole: text("donor_role", {
    enum: ["owner", "admin", "kolektor", "teknisi"],
  }).notNull(),
  logoUrl: text("logo_url"),
  paidAt: integer("paid_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(now),
});

// ---------------------------------------------------------------------------
// Pesan: template, log kirim, batch massal
// ---------------------------------------------------------------------------

export const messageTemplates = sqliteTable("message_template", {
  id: text("id").primaryKey(),
  scope: text("scope", { enum: ["tenant", "platform"] }).notNull(),
  tenantId: text("tenant_id").references(() => tenants.id),
  key: text("key").notNull(),
  body: text("body").notNull(),
  updatedBy: text("updated_by"),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().default(now),
});

export const messageSendLogs = sqliteTable("message_send_log", {
  id: text("id").primaryKey(),
  scope: text("scope", { enum: ["tenant", "platform"] }).notNull(),
  tenantId: text("tenant_id").references(() => tenants.id),
  recipientType: text("recipient_type", { enum: ["pelanggan", "tenant_owner"] }).notNull(),
  recipientId: text("recipient_id").notNull(),
  phone: text("phone").notNull(),
  message: text("message").notNull(),
  templateKey: text("template_key"),
  batchId: text("batch_id"),
  sentBy: text("sent_by"),
  status: text("status", { enum: ["sent", "failed"] }).notNull(),
  error: text("error"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(now),
});

export const messageBatches = sqliteTable("message_batch", {
  id: text("id").primaryKey(),
  scope: text("scope", { enum: ["tenant", "platform"] }).notNull(),
  tenantId: text("tenant_id").references(() => tenants.id),
  status: text("status", { enum: ["queued", "running", "done", "failed"] }).notNull(),
  total: integer("total").notNull().default(0),
  sent: integer("sent").notNull().default(0),
  failed: integer("failed").notNull().default(0),
  payload: text("payload", { mode: "json" }).$type<MessageBatchPayload>(),
  startedBy: text("started_by"),
  startedAt: integer("started_at", { mode: "timestamp" }),
  finishedAt: integer("finished_at", { mode: "timestamp" }),
  error: text("error"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().default(now),
});

export type MessageBatchPayload = {
  recipientType: "pelanggan" | "tenant_owner";
  messageType: "invoice" | "custom";
  templateKey?: string;
  customBody?: string;
  recipientIds: string[];
};

// ---------------------------------------------------------------------------
// Tipe turunan (untuk dipakai di service & komponen)
// ---------------------------------------------------------------------------

export type Tenant = typeof tenants.$inferSelect;
export type User = typeof users.$inferSelect;
export type PackageTenant = typeof packageTenants.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type Router = typeof routers.$inferSelect;
export type PaketInternet = typeof paketInternet.$inferSelect;
export type Odp = typeof odp.$inferSelect;
export type Pelanggan = typeof pelanggan.$inferSelect;
export type Invoice = typeof invoices.$inferSelect;
export type Ticket = typeof tickets.$inferSelect;
export type Pengeluaran = typeof pengeluaran.$inferSelect;
export type KategoriPengeluaran = typeof kategoriPengeluaran.$inferSelect;
export type PaymentGatewayLog = typeof paymentGatewayLogs.$inferSelect;
export type TenantDuitkuConfig = typeof tenantDuitkuConfigs.$inferSelect;
export type TenantWhatsAppConfig = typeof tenantWhatsAppConfigs.$inferSelect;
export type TenantVpnAccount = typeof tenantVpnAccounts.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type PlatformSettings = typeof platformSettings.$inferSelect;
export type MessageTemplate = typeof messageTemplates.$inferSelect;
export type MessageSendLog = typeof messageSendLogs.$inferSelect;
export type MessageBatch = typeof messageBatches.$inferSelect;
export type DevicePushToken = typeof devicePushTokens.$inferSelect;
export type PushNotificationLog = typeof pushNotificationLogs.$inferSelect;
