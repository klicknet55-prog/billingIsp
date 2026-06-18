import { createHash } from "node:crypto";
import { getTenantDuitkuConfig } from "@/features/integrations/service";
import { createLogger } from "@/lib/logger";
import type {
  CreateTransactionParams,
  CreateTransactionResult,
  DuitkuClient,
  ParseWebhookOverrides,
  WebhookResult,
} from "./types";
import { resolveDuitkuReturnUrl } from "./urls";

const log = createLogger("duitku:real");

function md5(s: string): string {
  return createHash("md5").update(s).digest("hex");
}

function cfg() {
  const merchantCode = process.env.DUITKU_MERCHANT_CODE ?? "";
  const apiKey = process.env.DUITKU_API_KEY ?? "";
  const callbackUrl = process.env.DUITKU_CALLBACK_URL ?? "";
  const paymentMethod = process.env.DUITKU_PAYMENT_METHOD ?? "VC";
  // Ganti ke sandbox saat pengujian: https://sandbox.duitku.com/...
  const inquiryUrl =
    process.env.DUITKU_INQUIRY_URL ??
    "https://passport.duitku.com/webapi/api/merchant/v2/inquiry";
  return { merchantCode, apiKey, callbackUrl, inquiryUrl, paymentMethod };
}

async function resolveCfg(tenantId?: string) {
  if (!tenantId) return cfg();
  const tenantCfg = await getTenantDuitkuConfig(tenantId);
  if (!tenantCfg) return cfg();
  return {
    merchantCode: tenantCfg.merchantCode,
    apiKey: tenantCfg.apiKey,
    callbackUrl: tenantCfg.callbackUrl,
    inquiryUrl: tenantCfg.inquiryUrl,
    paymentMethod: tenantCfg.paymentMethod,
  };
}

/** Implementasi Duitku via REST API resmi. */
export const duitkuReal: DuitkuClient = {
  async createTransaction(p: CreateTransactionParams): Promise<CreateTransactionResult> {
    const { merchantCode, apiKey, callbackUrl, inquiryUrl, paymentMethod } = await resolveCfg(
      p.tenantId
    );
    if (!merchantCode || !apiKey || !callbackUrl) {
      throw new Error(
        "Konfigurasi Duitku belum lengkap (DUITKU_MERCHANT_CODE / DUITKU_API_KEY / DUITKU_CALLBACK_URL)."
      );
    }
    const returnUrl = resolveDuitkuReturnUrl(callbackUrl);
    const signature = md5(`${merchantCode}${p.orderId}${p.amount}${apiKey}`);
    const body = {
      merchantCode,
      paymentAmount: p.amount,
      merchantOrderId: p.orderId,
      productDetails: p.productName,
      customerVaName: p.customerName ?? "Pelanggan",
      phoneNumber: p.customerPhone ?? "",
      callbackUrl,
      returnUrl,
      signature,
      paymentMethod,
      expiryPeriod: 60,
    };
    const res = await fetch(inquiryUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const raw = await res.text();
      throw new Error(`Duitku inquiry gagal: ${res.status}. Detail: ${raw}`);
    }
    const data = (await res.json()) as {
      reference?: string;
      paymentUrl?: string;
      qrString?: string;
      statusMessage?: string;
    };
    if (!data.paymentUrl) throw new Error(data.statusMessage ?? "Duitku: paymentUrl kosong");
    log.info(`Transaksi dibuat ${p.orderId}`);
    return {
      orderId: p.orderId,
      reference: data.reference ?? "",
      paymentUrl: data.paymentUrl,
      qrString: data.qrString,
    };
  },

  parseWebhook(payload, overrides?: ParseWebhookOverrides): WebhookResult {
    const { merchantCode, apiKey } = {
      merchantCode: overrides?.merchantCode ?? cfg().merchantCode,
      apiKey: overrides?.apiKey ?? cfg().apiKey,
    };
    const merchantOrderId = String(payload.merchantOrderId ?? "");
    const amount = String(payload.amount ?? "");
    const expected = md5(`${merchantCode}${amount}${merchantOrderId}${apiKey}`);
    const valid = expected === String(payload.signature ?? "");
    return {
      orderId: merchantOrderId,
      status: valid && payload.resultCode === "00" ? "success" : "failed",
      paymentMethod: String(payload.paymentCode ?? ""),
      amount: Number(amount || 0),
    };
  },

  simulatePaid(): WebhookResult {
    throw new Error("simulatePaid tidak tersedia pada DUITKU_DRIVER=real");
  },
};
