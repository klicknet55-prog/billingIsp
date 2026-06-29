import type { WebhookEvent } from "@/lib/db/schema";

export const QUEUE_NAME = "netmanage";

export type JobName =
  | "cron.run"
  | "messages.batch"
  | "webhook.deliver"
  | "pelanggan.import";

export type CronRunJobData = Record<string, never>;

export type MessagesBatchJobData = {
  batchId: string;
};

export type WebhookDeliverJobData = {
  tenantId: string;
  event: WebhookEvent;
  data: Record<string, unknown>;
};

export type PelangganImportJobData = {
  batchId: string;
};

export type JobDataMap = {
  "cron.run": CronRunJobData;
  "messages.batch": MessagesBatchJobData;
  "webhook.deliver": WebhookDeliverJobData;
  "pelanggan.import": PelangganImportJobData;
};
