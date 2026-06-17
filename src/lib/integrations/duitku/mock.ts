import { createLogger } from "@/lib/logger";
import type {
  CreateTransactionParams,
  CreateTransactionResult,
  DuitkuClient,
  WebhookResult,
} from "./types";

const log = createLogger("duitku:mock");

/** Implementasi simulasi Duitku tanpa kredensial merchant. */
export const duitkuMock: DuitkuClient = {
  async createTransaction(params: CreateTransactionParams): Promise<CreateTransactionResult> {
    const reference = `MOCK-${params.orderId}`;
    log.info(`createTransaction ${params.orderId} Rp${params.amount}`);
    return {
      orderId: params.orderId,
      reference,
      // Halaman simulasi internal yang bisa "membayar" order.
      paymentUrl: `/pay/mock/${encodeURIComponent(params.orderId)}`,
      qrString: `00020101021126${reference}`,
    };
  },
  parseWebhook(payload): WebhookResult {
    return {
      orderId: String(payload.merchantOrderId ?? payload.orderId ?? ""),
      status: payload.resultCode === "00" ? "success" : "failed",
      paymentMethod: String(payload.paymentCode ?? "MOCK"),
      amount: Number(payload.amount ?? 0),
    };
  },
  simulatePaid(orderId, amount): WebhookResult {
    log.info(`simulatePaid ${orderId}`);
    return { orderId, status: "success", paymentMethod: "QRIS", amount };
  },
};
