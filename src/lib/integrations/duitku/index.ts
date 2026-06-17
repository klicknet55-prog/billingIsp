import { duitkuMock } from "./mock";
import { duitkuReal } from "./real";
import type { DuitkuClient } from "./types";

export type {
  CreateTransactionParams,
  CreateTransactionResult,
  DuitkuClient,
  ParseWebhookOverrides,
  WebhookResult,
} from "./types";

export function getDuitkuClient(): DuitkuClient {
  switch (process.env.DUITKU_DRIVER) {
    case "real":
      return duitkuReal;
    case "mock":
    default:
      return duitkuMock;
  }
}
