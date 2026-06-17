import { createLogger } from "@/lib/logger";
import type { WhatsAppClient } from "./types";

const log = createLogger("whatsapp:mock");

/**
 * Implementasi simulasi WhatsApp. OTP & notifikasi dicetak ke console
 * sehingga developer bisa membaca kode OTP saat pengujian.
 */
export const whatsappMock: WhatsAppClient = {
  async sendOtp(phone, code) {
    log.info(`OTP untuk ${phone}: ${code}`);
  },
  async sendNotification(phone, message) {
    log.info(`Notif ke ${phone}: ${message}`);
  },
};
