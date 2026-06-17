import { whatsappMock } from "./mock";
import { whatsappReal } from "./real";
import type { WhatsAppClient } from "./types";

export type { WhatsAppClient } from "./types";

export function getWhatsAppClient(): WhatsAppClient {
  switch (process.env.WHATSAPP_DRIVER) {
    case "real":
      return whatsappReal;
    case "mock":
    default:
      return whatsappMock;
  }
}
