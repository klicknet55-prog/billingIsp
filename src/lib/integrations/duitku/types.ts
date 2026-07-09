export interface CreateTransactionParams {
  orderId: string;
  amount: number;
  productName: string;
  customerName?: string;
  customerPhone?: string;
  tenantId?: string;
  /** Override return URL browser setelah bayar (default dari DUITKU_CALLBACK_URL). */
  returnUrl?: string;
}

export interface CreateTransactionResult {
  orderId: string;
  reference: string;
  paymentUrl: string;
  qrString?: string;
}

export interface WebhookResult {
  orderId: string;
  status: "success" | "failed";
  paymentMethod: string;
  amount: number;
}

export interface ParseWebhookOverrides {
  merchantCode?: string;
  apiKey?: string;
}

/**
 * Kontrak Payment Gateway (Duitku) untuk langganan tenant & invoice pelanggan.
 */
export interface DuitkuClient {
  createTransaction(params: CreateTransactionParams): Promise<CreateTransactionResult>;
  /** Verifikasi & parse payload webhook menjadi hasil yang ternormalisasi. */
  parseWebhook(payload: Record<string, unknown>, overrides?: ParseWebhookOverrides): WebhookResult;
  /** Hanya untuk mock: simulasikan pembayaran sukses sebuah order. */
  simulatePaid(orderId: string, amount: number): WebhookResult;
}
