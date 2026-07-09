/**
 * Barrel skema — tabel Drizzle mengikuti DATABASE_DRIVER aktif (runtime).
 * Tipe TypeScript mengacu SQLite agar API query kompatibel di seluruh codebase.
 */
import { isPostgresDriver } from "./driver";
import { pgSchema } from "./schema.pg";
import * as sqlite from "./schema.sqlite";

const active = isPostgresDriver() ? pgSchema : sqlite;

export const tenants = active.tenants as typeof sqlite.tenants;
export const users = active.users as typeof sqlite.users;
export const packageTenants = active.packageTenants as typeof sqlite.packageTenants;
export const subscriptions = active.subscriptions as typeof sqlite.subscriptions;
export const routers = active.routers as typeof sqlite.routers;
export const paketInternet = active.paketInternet as typeof sqlite.paketInternet;
export const odp = active.odp as typeof sqlite.odp;
export const pelanggan = active.pelanggan as typeof sqlite.pelanggan;
export const invoices = active.invoices as typeof sqlite.invoices;
export const tagihan = active.tagihan as typeof sqlite.tagihan;
export const receiptTagihanLinks =
  active.receiptTagihanLinks as typeof sqlite.receiptTagihanLinks;
export const paymentAttempts = active.paymentAttempts as typeof sqlite.paymentAttempts;
export const tickets = active.tickets as typeof sqlite.tickets;
export const ticketAssignments = active.ticketAssignments as typeof sqlite.ticketAssignments;
export const kategoriPengeluaran =
  active.kategoriPengeluaran as typeof sqlite.kategoriPengeluaran;
export const pengeluaran = active.pengeluaran as typeof sqlite.pengeluaran;
export const paymentGatewayLogs =
  active.paymentGatewayLogs as typeof sqlite.paymentGatewayLogs;
export const tenantDuitkuConfigs =
  active.tenantDuitkuConfigs as typeof sqlite.tenantDuitkuConfigs;
export const tenantWhatsAppConfigs =
  active.tenantWhatsAppConfigs as typeof sqlite.tenantWhatsAppConfigs;
export const tenantApiKeys = active.tenantApiKeys as typeof sqlite.tenantApiKeys;
export const tenantWebhooks = active.tenantWebhooks as typeof sqlite.tenantWebhooks;
export const webhookDeliveryLogs =
  active.webhookDeliveryLogs as typeof sqlite.webhookDeliveryLogs;
export const pelangganImportBatches =
  active.pelangganImportBatches as typeof sqlite.pelangganImportBatches;
export const platformWhatsAppConfigs =
  active.platformWhatsAppConfigs as typeof sqlite.platformWhatsAppConfigs;
export const devicePushTokens = active.devicePushTokens as typeof sqlite.devicePushTokens;
export const pushNotificationLogs =
  active.pushNotificationLogs as typeof sqlite.pushNotificationLogs;
export const sessions = active.sessions as typeof sqlite.sessions;
export const otpCodes = active.otpCodes as typeof sqlite.otpCodes;
export const passwordResets = active.passwordResets as typeof sqlite.passwordResets;
export const portalAccessCodes = active.portalAccessCodes as typeof sqlite.portalAccessCodes;
export const referralRewards = active.referralRewards as typeof sqlite.referralRewards;
export const platformSettings = active.platformSettings as typeof sqlite.platformSettings;
export const messageTemplates = active.messageTemplates as typeof sqlite.messageTemplates;
export const messageSendLogs = active.messageSendLogs as typeof sqlite.messageSendLogs;
export const messageBatches = active.messageBatches as typeof sqlite.messageBatches;

export { PLATFORM_SETTINGS_ID } from "./schema.sqlite";
export type MessageBatchPayload = sqlite.MessageBatchPayload;
export type Tenant = typeof sqlite.tenants.$inferSelect;
export type User = typeof sqlite.users.$inferSelect;
export type PackageTenant = typeof sqlite.packageTenants.$inferSelect;
export type Subscription = typeof sqlite.subscriptions.$inferSelect;
export type Router = typeof sqlite.routers.$inferSelect;
export type PaketInternet = typeof sqlite.paketInternet.$inferSelect;
export type Odp = typeof sqlite.odp.$inferSelect;
export type Pelanggan = typeof sqlite.pelanggan.$inferSelect;
export type Invoice = typeof sqlite.invoices.$inferSelect;
export type Ticket = typeof sqlite.tickets.$inferSelect;
export type Pengeluaran = typeof sqlite.pengeluaran.$inferSelect;
export type KategoriPengeluaran = typeof sqlite.kategoriPengeluaran.$inferSelect;
export type PaymentGatewayLog = typeof sqlite.paymentGatewayLogs.$inferSelect;
export type TenantDuitkuConfig = typeof sqlite.tenantDuitkuConfigs.$inferSelect;
export type TenantWhatsAppConfig = typeof sqlite.tenantWhatsAppConfigs.$inferSelect;
export type TenantApiKey = typeof sqlite.tenantApiKeys.$inferSelect;
export type TenantWebhook = typeof sqlite.tenantWebhooks.$inferSelect;
export type WebhookDeliveryLog = typeof sqlite.webhookDeliveryLogs.$inferSelect;
export type PelangganImportRowResult = sqlite.PelangganImportRowResult;
export type PelangganImportBatch = typeof sqlite.pelangganImportBatches.$inferSelect;
export type WebhookEvent = sqlite.WebhookEvent;
export { WEBHOOK_EVENTS } from "./schema.sqlite";
export type Session = typeof sqlite.sessions.$inferSelect;
export type PlatformSettings = typeof sqlite.platformSettings.$inferSelect;
export type MessageTemplate = typeof sqlite.messageTemplates.$inferSelect;
export type MessageSendLog = typeof sqlite.messageSendLogs.$inferSelect;
export type MessageBatch = typeof sqlite.messageBatches.$inferSelect;
export type DevicePushToken = typeof sqlite.devicePushTokens.$inferSelect;
export type PushNotificationLog = typeof sqlite.pushNotificationLogs.$inferSelect;
export type ReferralReward = typeof sqlite.referralRewards.$inferSelect;
