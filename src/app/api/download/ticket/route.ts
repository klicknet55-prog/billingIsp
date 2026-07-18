import { getCurrentActor, requireUser } from "@/lib/auth";
import { getReceiptDetail } from "@/features/billing/payment-service";
import { signDownloadTicket } from "@/lib/download/signed-download-ticket";
import { ensureUrlScheme } from "@/lib/site";
import { getAppOrigin } from "@/lib/site-server";

export type TicketRequestBody =
  | {
      kind: "laporan";
      format: "pdf" | "xlsx";
      period?: string;
      from?: string;
      to?: string;
    }
  | {
      kind: "nota";
      receiptId: string;
    };

/** Mint URL unduhan sekali pakai (untuk dibuka di browser bawaan HP). */
export async function POST(req: Request) {
  let body: TicketRequestBody;
  try {
    body = (await req.json()) as TicketRequestBody;
  } catch {
    return Response.json({ ok: false, message: "Payload tidak valid." }, { status: 400 });
  }

  let token: string;

  if (body.kind === "laporan") {
    const user = await requireUser(["owner", "admin", "teknisi"]);
    if (!user.tenantId) {
      return Response.json({ ok: false, message: "Tenant tidak ditemukan." }, { status: 403 });
    }
    if (body.format !== "pdf" && body.format !== "xlsx") {
      return Response.json({ ok: false, message: "Format tidak didukung." }, { status: 400 });
    }
    token = signDownloadTicket({
      kind: "laporan",
      tid: user.tenantId,
      uid: user.id,
      format: body.format,
      period: body.period,
      from: body.from,
      to: body.to,
    });
  } else if (body.kind === "nota") {
    if (!body.receiptId?.trim()) {
      return Response.json({ ok: false, message: "receiptId wajib." }, { status: 400 });
    }
    const actor = await getCurrentActor();
    if (!actor) {
      return Response.json({ ok: false, message: "Silakan login ulang." }, { status: 401 });
    }

    const receiptId = body.receiptId.trim();
    if (actor.type === "user") {
      if (!actor.user.tenantId) {
        return Response.json({ ok: false, message: "Tenant tidak ditemukan." }, { status: 403 });
      }
      const detail = await getReceiptDetail(actor.user.tenantId, receiptId);
      if (!detail) {
        return Response.json({ ok: false, message: "Nota tidak ditemukan." }, { status: 404 });
      }
      token = signDownloadTicket({
        kind: "nota",
        tid: actor.user.tenantId,
        uid: actor.user.id,
        rid: receiptId,
      });
    } else {
      const detail = await getReceiptDetail(actor.pelanggan.tenantId, receiptId);
      if (!detail || detail.receipt.pelangganId !== actor.pelanggan.id) {
        return Response.json({ ok: false, message: "Nota tidak ditemukan." }, { status: 404 });
      }
      token = signDownloadTicket({
        kind: "nota",
        tid: actor.pelanggan.tenantId,
        uid: actor.pelanggan.id,
        rid: receiptId,
      });
    }
  } else {
    return Response.json({ ok: false, message: "Jenis unduhan tidak dikenal." }, { status: 400 });
  }

  const origin =
    (await getAppOrigin()) ||
    (process.env.NEXT_PUBLIC_APP_URL?.trim()
      ? ensureUrlScheme(process.env.NEXT_PUBLIC_APP_URL.trim())
      : "");
  if (!origin) {
    return Response.json({ ok: false, message: "NEXT_PUBLIC_APP_URL belum diset." }, { status: 500 });
  }

  const url = `${origin.replace(/\/$/, "")}/api/download/file?t=${encodeURIComponent(token)}`;
  return Response.json({
    ok: true,
    url,
    message: "Dibuka di browser. File masuk ke Download HP.",
  });
}
