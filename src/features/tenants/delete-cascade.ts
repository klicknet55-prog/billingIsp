import "server-only";
import { eq, inArray, or } from "drizzle-orm";
import type { db } from "@/lib/db";
import {
  devicePushTokens,
  invoices,
  kategoriPengeluaran,
  messageBatches,
  messageSendLogs,
  messageTemplates,
  odp,
  paketInternet,
  paymentAttempts,
  paymentGatewayLogs,
  pelanggan,
  pelangganImportBatches,
  pengeluaran,
  portalAccessCodes,
  pushNotificationLogs,
  communityDonations,
  referralRewards,
  receiptTagihanLinks,
  routers,
  sessions,
  subscriptions,
  tagihan,
  tenantApiKeys,
  tenantDuitkuConfigs,
  tenantWebhooks,
  tenantWhatsAppConfigs,
  ticketAssignments,
  tickets,
  users,
  webhookDeliveryLogs,
} from "@/lib/db/schema";

type DbClient = Pick<typeof db, "query" | "delete">;

/** Hapus semua data operasional tenant (urutan aman FK PostgreSQL). */
export async function deleteTenantRelatedData(
  client: DbClient,
  tenantId: string,
  opts?: { keepSubscriptions?: boolean }
) {
  const tenantUsers = await client.query.users.findMany({
    where: eq(users.tenantId, tenantId),
    columns: { id: true },
  });
  const userIds = tenantUsers.map((u) => u.id);

  const tenantTickets = await client.query.tickets.findMany({
    where: eq(tickets.tenantId, tenantId),
    columns: { id: true },
  });
  const ticketIds = tenantTickets.map((t) => t.id);

  const tenantInvoices = await client.query.invoices.findMany({
    where: eq(invoices.tenantId, tenantId),
    columns: { id: true },
  });
  const invoiceIds = tenantInvoices.map((i) => i.id);

  const tenantTagihan = await client.query.tagihan.findMany({
    where: eq(tagihan.tenantId, tenantId),
    columns: { id: true },
  });
  const tagihanIds = tenantTagihan.map((t) => t.id);

  if (tagihanIds.length > 0) {
    await client
      .delete(receiptTagihanLinks)
      .where(inArray(receiptTagihanLinks.tagihanId, tagihanIds));
  }
  if (invoiceIds.length > 0) {
    await client
      .delete(receiptTagihanLinks)
      .where(inArray(receiptTagihanLinks.receiptId, invoiceIds));
  }

  await client.delete(webhookDeliveryLogs).where(eq(webhookDeliveryLogs.tenantId, tenantId));
  await client.delete(tenantWebhooks).where(eq(tenantWebhooks.tenantId, tenantId));
  await client.delete(tenantApiKeys).where(eq(tenantApiKeys.tenantId, tenantId));
  await client.delete(pelangganImportBatches).where(eq(pelangganImportBatches.tenantId, tenantId));
  await client.delete(paymentAttempts).where(eq(paymentAttempts.tenantId, tenantId));
  await client.delete(messageSendLogs).where(eq(messageSendLogs.tenantId, tenantId));
  await client.delete(messageBatches).where(eq(messageBatches.tenantId, tenantId));
  await client.delete(messageTemplates).where(eq(messageTemplates.tenantId, tenantId));
  await client.delete(portalAccessCodes).where(eq(portalAccessCodes.tenantId, tenantId));
  await client.delete(devicePushTokens).where(eq(devicePushTokens.tenantId, tenantId));
  await client.delete(pushNotificationLogs).where(eq(pushNotificationLogs.tenantId, tenantId));

  if (ticketIds.length > 0) {
    await client.delete(ticketAssignments).where(inArray(ticketAssignments.ticketId, ticketIds));
  }
  if (userIds.length > 0) {
    await client.delete(ticketAssignments).where(inArray(ticketAssignments.userId, userIds));
  }

  await client.delete(tickets).where(eq(tickets.tenantId, tenantId));
  await client.delete(tagihan).where(eq(tagihan.tenantId, tenantId));
  await client.delete(invoices).where(eq(invoices.tenantId, tenantId));
  await client.delete(pelanggan).where(eq(pelanggan.tenantId, tenantId));
  await client.delete(odp).where(eq(odp.tenantId, tenantId));
  await client.delete(pengeluaran).where(eq(pengeluaran.tenantId, tenantId));
  await client.delete(kategoriPengeluaran).where(eq(kategoriPengeluaran.tenantId, tenantId));
  await client.delete(paketInternet).where(eq(paketInternet.tenantId, tenantId));
  await client.delete(routers).where(eq(routers.tenantId, tenantId));
  if (!opts?.keepSubscriptions) {
    await client.delete(subscriptions).where(eq(subscriptions.tenantId, tenantId));
  }
  await client.delete(paymentGatewayLogs).where(eq(paymentGatewayLogs.tenantId, tenantId));
  await client.delete(tenantDuitkuConfigs).where(eq(tenantDuitkuConfigs.tenantId, tenantId));
  await client.delete(tenantWhatsAppConfigs).where(eq(tenantWhatsAppConfigs.tenantId, tenantId));
  await client.delete(referralRewards).where(
    or(
      eq(referralRewards.referrerTenantId, tenantId),
      eq(referralRewards.refereeTenantId, tenantId)
    )
  );
  await client.delete(communityDonations).where(eq(communityDonations.tenantId, tenantId));
  await client.delete(sessions).where(eq(sessions.tenantId, tenantId));
  await client.delete(users).where(eq(users.tenantId, tenantId));
}
