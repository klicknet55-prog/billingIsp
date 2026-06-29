import { runBillingCycle } from "@/features/jobs/service";
import { runSaasSubscriptionLifecycle } from "@/features/jobs/saas-subscription";
import { runBatchSend } from "@/features/messages/send";
import { executeWebhookDelivery } from "@/features/webhooks/deliver";
import { runImportBatchById } from "@/features/customers/import-service";
import { recordCronRun } from "@/features/platform-health/service";
import { createLogger } from "@/lib/logger";
import type { JobDataMap, JobName } from "./types";

const log = createLogger("queue:processor");

export async function processQueueJob(name: JobName, data: JobDataMap[JobName]) {
  switch (name) {
    case "cron.run": {
      const saas = await runSaasSubscriptionLifecycle();
      const billing = await runBillingCycle();
      const payload = { ok: true as const, billing, saas };
      await recordCronRun(payload);
      log.info(`cron.run selesai: tagihan+${billing.tagihanCreated} isolir+${billing.isolated}`);
      return payload;
    }
    case "messages.batch": {
      const { batchId } = data as JobDataMap["messages.batch"];
      await runBatchSend(batchId);
      log.info(`messages.batch ${batchId} selesai`);
      return { batchId, ok: true };
    }
    case "webhook.deliver": {
      const payload = data as JobDataMap["webhook.deliver"];
      const result = await executeWebhookDelivery(
        payload.tenantId,
        payload.event,
        payload.data
      );
      if (result.skipped) {
        log.info(`webhook.deliver skipped: ${result.skipped}`);
        return result;
      }
      if (!result.delivered) {
        throw new Error(result.error ?? "Webhook delivery failed");
      }
      return result;
    }
    case "pelanggan.import": {
      const { batchId } = data as JobDataMap["pelanggan.import"];
      const result = await runImportBatchById(batchId);
      log.info(`pelanggan.import ${batchId}: ${result.success}/${result.total} sukses`);
      return result;
    }
    default: {
      const _exhaustive: never = name;
      throw new Error(`Job tidak dikenal: ${_exhaustive}`);
    }
  }
}
