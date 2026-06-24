import "server-only";
import { createLogger } from "@/lib/logger";

const log = createLogger("email");

export interface SendEmailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface EmailClient {
  send(input: SendEmailInput): Promise<void>;
}

class MockEmailClient implements EmailClient {
  async send(input: SendEmailInput) {
    log.info(`[mock] To: ${input.to} | ${input.subject}\n${input.text}`);
  }
}

class SmtpEmailClient implements EmailClient {
  async send(input: SendEmailInput) {
    log.info(
      `[smtp] To: ${input.to} | ${input.subject} (set SMTP via env; pasang nodemailer/resend untuk produksi)\n${input.text}`
    );
  }
}

export function getEmailClient(): EmailClient {
  const driver = process.env.EMAIL_DRIVER?.trim() || "mock";
  if (driver === "smtp") return new SmtpEmailClient();
  return new MockEmailClient();
}

export async function sendWelcomeEmail(input: {
  to: string;
  ownerName: string;
  tenantName: string;
  loginUrl: string;
}) {
  const subject = `Selamat datang di NetManage — ${input.tenantName}`;
  const text = [
    `Halo ${input.ownerName},`,
    "",
    `Akun ISP "${input.tenantName}" sudah aktif.`,
    `Masuk ke dashboard: ${input.loginUrl}`,
    "",
    "Langkah awal: atur router, paket internet, dan tambahkan pelanggan pertama.",
    "",
    "Salam,",
    "Tim NetManage",
  ].join("\n");

  await getEmailClient().send({
    to: input.to,
    subject,
    text,
    html: text.replace(/\n/g, "<br/>"),
  });
}
