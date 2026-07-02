import {
  boolean,
  doublePrecision,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/** Skema PostgreSQL — server baru (Fase 5). Nama kolom/tabel sama dengan SQLite. */

export const tenants = pgTable("tenant", {
  id: text("id").primaryKey(),
  namaUsaha: text("nama_usaha").notNull(),
  logoUrl: text("logo_url"),
  domain: text("domain").notNull().unique(),
  status: text("status", { enum: ["active", "suspended"] })
    .notNull()
    .default("active"),
  themePreset: text("theme_preset").notNull().default("default"),
  themeMode: text("theme_mode", { enum: ["light", "dark"] })
    .notNull()
    .default("light"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable("user", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").references(() => tenants.id),
  nama: text("nama").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", {
    enum: ["superadmin", "owner", "admin", "kolektor", "teknisi"],
  }).notNull(),
  phone: text("phone"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const packageTenants = pgTable("package_tenant", {
  id: text("id").primaryKey(),
  nama: text("nama").notNull(),
  hargaBulanan: integer("harga_bulanan").notNull().default(0),
  diskonTahunanPersen: integer("diskon_tahunan_persen").notNull().default(0),
  limitasi: jsonb("limitasi")
    .$type<{ maxPelanggan: number; maxRouter: number; fitur: string[] }>()
    .notNull(),
  isActive: boolean("is_active").notNull().default(true),
});

export const subscriptions = pgTable("subscription", {
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
  mulai: timestamp("mulai", { withTimezone: true }).notNull().defaultNow(),
  akhir: timestamp("akhir", { withTimezone: true }).notNull(),
  status: text("status", { enum: ["active", "expired"] })
    .notNull()
    .default("active"),
  remind7dAt: timestamp("remind_7d_at", { withTimezone: true }),
  remind1dAt: timestamp("remind_1d_at", { withTimezone: true }),
});

export const routers = pgTable("router", {
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
  isOnline: boolean("is_online").notNull().default(false),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const paketInternet = pgTable("paket_internet", {
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
  isActive: boolean("is_active").notNull().default(true),
});

export const odp = pgTable(
  "odp",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id),
    kode: text("kode").notNull(),
    nama: text("nama"),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    splitterRasio: text("splitter_rasio"),
    redamanInputDb: doublePrecision("redaman_input_db"),
    redamanOutputDb: doublePrecision("redaman_output_db"),
    splitterPasif: text("splitter_pasif"),
    kapasitasPort: integer("kapasitas_port").notNull().default(8),
    inputRouterId: text("input_router_id").references(() => routers.id),
    inputOdpId: text("input_odp_id"),
    catatan: text("catatan"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("odp_tenant_kode").on(t.tenantId, t.kode)]
);

export const pelanggan = pgTable("pelanggan", {
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
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  ipAddress: text("ip_address"),
  paketInternetId: text("paket_internet_id").references(() => paketInternet.id),
  routerId: text("router_id").references(() => routers.id),
  kolektorId: text("kolektor_id").references(() => users.id),
  odpId: text("odp_id").references(() => odp.id),
  odpPort: text("odp_port"),
  tglDaftar: timestamp("tgl_daftar", { withTimezone: true }),
  tglJatuhTempo: timestamp("tgl_jatuh_tempo", { withTimezone: true }),
  isIsolated: boolean("is_isolated").notNull().default(false),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const invoices = pgTable("invoice", {
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
  lineItems: jsonb("line_items").$type<{ periode: string; amount: number; label: string }[]>(),
  tglJatuhTempo: timestamp("tgl_jatuh_tempo", { withTimezone: true }),
  preDueRemindedAt: timestamp("pre_due_reminded_at", { withTimezone: true }),
  tglLunas: timestamp("tgl_lunas", { withTimezone: true }),
  metodeBayar: text("metode_bayar"),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tagihan = pgTable(
  "tagihan",
  {
    id: text("id").primaryKey(),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id),
    pelangganId: text("pelanggan_id")
      .notNull()
      .references(() => pelanggan.id),
    periode: text("periode").notNull(),
    amount: integer("amount").notNull(),
    dueDate: timestamp("due_date", { withTimezone: true }).notNull(),
    kind: text("kind", { enum: ["first", "recurring"] }).notNull(),
    status: text("status", { enum: ["open", "tunggakan", "processing", "paid", "partial"] })
      .notNull()
      .default("open"),
    amountPaid: integer("amount_paid").notNull().default(0),
    receiptId: text("receipt_id").references(() => invoices.id),
    preDueRemindedAt: timestamp("pre_due_reminded_at", { withTimezone: true }),
    dunningStep2At: timestamp("dunning_step2_at", { withTimezone: true }),
    dunningFinalAt: timestamp("dunning_final_at", { withTimezone: true }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    metodeBayar: text("metode_bayar"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("tagihan_tenant_pelanggan_periode").on(t.tenantId, t.pelangganId, t.periode),
  ]
);

export const receiptTagihanLinks = pgTable("receipt_tagihan_link", {
  id: text("id").primaryKey(),
  receiptId: text("receipt_id")
    .notNull()
    .references(() => invoices.id),
  tagihanId: text("tagihan_id")
    .notNull()
    .references(() => tagihan.id),
  amount: integer("amount").notNull(),
});

export const paymentAttempts = pgTable(
  "payment_attempt",
  {
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
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("payment_attempt_idempotency").on(t.tenantId, t.idempotencyKey)]
);

export const tickets = pgTable("ticket", {
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
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const ticketAssignments = pgTable("ticket_assignment", {
  id: text("id").primaryKey(),
  ticketId: text("ticket_id")
    .notNull()
    .references(() => tickets.id),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  assignedAt: timestamp("assigned_at", { withTimezone: true }).notNull().defaultNow(),
});

export const kategoriPengeluaran = pgTable("kategori_pengeluaran", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id),
  nama: text("nama").notNull(),
});

export const pengeluaran = pgTable("pengeluaran", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id),
  kategoriId: text("kategori_id").references(() => kategoriPengeluaran.id),
  jumlah: integer("jumlah").notNull().default(0),
  catatan: text("catatan"),
  tanggal: timestamp("tanggal", { withTimezone: true }).notNull().defaultNow(),
});

export const paymentGatewayLogs = pgTable("payment_gateway_log", {
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
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tenantDuitkuConfigs = pgTable("tenant_duitku_config", {
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
  isEnabled: boolean("is_enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tenantWhatsAppConfigs = pgTable("tenant_whatsapp_config", {
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
  isEnabled: boolean("is_enabled").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tenantApiKeys = pgTable("tenant_api_key", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id),
  label: text("label").notNull().default("Default"),
  keyPrefix: text("key_prefix").notNull(),
  keyHash: text("key_hash").notNull(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const tenantWebhooks = pgTable("tenant_webhook", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id")
    .notNull()
    .unique()
    .references(() => tenants.id),
  url: text("url").notNull(),
  secretEncrypted: text("secret_encrypted").notNull(),
  events: jsonb("events").$type<import("./schema.sqlite").WebhookEvent[]>().notNull().default([]),
  isEnabled: boolean("is_enabled").notNull().default(false),
  lastDeliveryAt: timestamp("last_delivery_at", { withTimezone: true }),
  failureCount: integer("failure_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const webhookDeliveryLogs = pgTable("webhook_delivery_log", {
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
  success: boolean("success").notNull().default(false),
  error: text("error"),
  durationMs: integer("duration_ms"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const pelangganImportBatches = pgTable("pelanggan_import_batch", {
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
  rowResults: jsonb("row_results").$type<import("./schema.sqlite").PelangganImportRowResult[]>(),
  error: text("error"),
  createdBy: text("created_by").references(() => users.id),
  startedAt: timestamp("started_at", { withTimezone: true }),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const platformWhatsAppConfigs = pgTable("platform_whatsapp_config", {
  id: text("id").primaryKey(),
  apiUrl: text("api_url").notNull(),
  apiTokenEncrypted: text("api_token_encrypted").notNull(),
  provider: text("provider", { enum: ["gateway", "waba", "klicknet"] }).notNull().default("waba"),
  phoneNumberId: text("phone_number_id"),
  deviceId: text("device_id"),
  basicAuthUser: text("basic_auth_user"),
  isEnabled: boolean("is_enabled").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const devicePushTokens = pgTable("device_push_token", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").references(() => tenants.id),
  subjectType: text("subject_type", { enum: ["user", "pelanggan"] }).notNull(),
  subjectId: text("subject_id").notNull(),
  app: text("app", { enum: ["admin", "portal"] }).notNull(),
  platform: text("platform", { enum: ["android"] }).notNull().default("android"),
  token: text("token").notNull().unique(),
  isActive: boolean("is_active").notNull().default(true),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const pushNotificationLogs = pgTable("push_notification_log", {
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
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable("session", {
  id: text("id").primaryKey(),
  subjectType: text("subject_type", { enum: ["user", "pelanggan"] }).notNull(),
  subjectId: text("subject_id").notNull(),
  tenantId: text("tenant_id"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const otpCodes = pgTable("otp_code", {
  id: text("id").primaryKey(),
  phone: text("phone").notNull(),
  code: text("code").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const passwordResets = pgTable("password_reset", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const portalAccessCodes = pgTable("portal_access_code", {
  code: text("code").primaryKey(),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id),
  pelangganId: text("pelanggan_id")
    .notNull()
    .references(() => pelanggan.id),
  redirect: text("redirect").notNull().default("/portal/tagihan"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const PLATFORM_SETTINGS_ID = "platform";

export const platformSettings = pgTable("platform_settings", {
  id: text("id").primaryKey(),
  brandName: text("brand_name").notNull().default("BILLING RT-RW NET"),
  brandTagline: text("brand_tagline"),
  logoUrl: text("logo_url"),
  ownerName: text("owner_name"),
  ownerPhone: text("owner_phone"),
  ownerEmail: text("owner_email"),
  address: text("address"),
  telegramGroupUrl: text("telegram_group_url"),
  tentangTitle: text("tentang_title").notNull(),
  tentangContent: text("tentang_content").notNull(),
  kontakTitle: text("kontak_title").notNull(),
  kontakContent: text("kontak_content").notNull(),
  kontakWhatsapp: text("kontak_whatsapp"),
  tcTitle: text("tc_title").notNull(),
  tcContent: text("tc_content").notNull(),
  communityDescription: text("community_description"),
  communityDonationImageUrl: text("community_donation_image_url"),
  communityApkAdminUrl: text("community_apk_admin_url"),
  communityApkPortalUrl: text("community_apk_portal_url"),
  communityWhatsappSuperadmin: text("community_whatsapp_superadmin"),
  communityTelegramUrl: text("community_telegram_url"),
  cronLastRunAt: timestamp("cron_last_run_at", { withTimezone: true }),
  cronLastResult: text("cron_last_result"),
  mapGeocodingProvider: text("map_geocoding_provider", { enum: ["nominatim", "google"] })
    .notNull()
    .default("nominatim"),
  googleGeocodingApiKeyEncrypted: text("google_geocoding_api_key_encrypted"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const messageTemplates = pgTable(
  "message_template",
  {
    id: text("id").primaryKey(),
    scope: text("scope", { enum: ["tenant", "platform"] }).notNull(),
    tenantId: text("tenant_id").references(() => tenants.id),
    key: text("key").notNull(),
    body: text("body").notNull(),
    updatedBy: text("updated_by"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("message_template_scope_key").on(t.scope, t.tenantId, t.key)]
);

export const messageSendLogs = pgTable("message_send_log", {
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
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const messageBatches = pgTable("message_batch", {
  id: text("id").primaryKey(),
  scope: text("scope", { enum: ["tenant", "platform"] }).notNull(),
  tenantId: text("tenant_id").references(() => tenants.id),
  status: text("status", { enum: ["queued", "running", "done", "failed"] }).notNull(),
  total: integer("total").notNull().default(0),
  sent: integer("sent").notNull().default(0),
  failed: integer("failed").notNull().default(0),
  payload: jsonb("payload").$type<MessageBatchPayload>(),
  startedBy: text("started_by"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type MessageBatchPayload = {
  recipientType: "pelanggan" | "tenant_owner";
  messageType: "invoice" | "custom";
  templateKey?: string;
  customBody?: string;
  recipientIds: string[];
};

export const pgSchema = {
  tenants,
  users,
  packageTenants,
  subscriptions,
  routers,
  paketInternet,
  odp,
  pelanggan,
  invoices,
  tagihan,
  receiptTagihanLinks,
  paymentAttempts,
  tickets,
  ticketAssignments,
  kategoriPengeluaran,
  pengeluaran,
  paymentGatewayLogs,
  tenantDuitkuConfigs,
  tenantWhatsAppConfigs,
  tenantApiKeys,
  tenantWebhooks,
  webhookDeliveryLogs,
  pelangganImportBatches,
  platformWhatsAppConfigs,
  devicePushTokens,
  pushNotificationLogs,
  sessions,
  otpCodes,
  passwordResets,
  portalAccessCodes,
  platformSettings,
  messageTemplates,
  messageSendLogs,
  messageBatches,
};
