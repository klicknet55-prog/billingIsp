/** Kontrak pengiriman pesan WhatsApp (OTP & notifikasi). */
export interface WhatsAppClient {
  sendOtp(phone: string, code: string, tenantId?: string): Promise<void>;
  sendNotification(phone: string, message: string, tenantId?: string): Promise<void>;
}
