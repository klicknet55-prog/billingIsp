import "server-only";
import { and, eq } from "drizzle-orm";
import { formatTagihanPeriode } from "@/features/billing/format-periode";
import { getReceiptDetail } from "@/features/billing/payment-service";
import { db } from "@/lib/db";
import { paketInternet, users } from "@/lib/db/schema";
import type { NotaDocumentData } from "@/lib/print/nota-document";

function isGatewayMetode(metode: string | null | undefined): boolean {
  if (!metode) return false;
  const m = metode.trim().toLowerCase();
  if (!m) return false;
  if (m === "tunai" || m === "cash" || m.includes("transfer") || m.includes("kolektor")) {
    return false;
  }
  return (
    m.includes("duitku") ||
    m.includes("qris") ||
    m.includes("va") ||
    m.includes("gateway") ||
    m.includes("online") ||
    m.includes("ewallet") ||
    m.includes("ovo") ||
    m.includes("dana") ||
    m.includes("gopay")
  );
}

function formatJenisLayanan(connectionType: string | null | undefined): string {
  if (connectionType === "hotspot") return "Hotspot";
  if (connectionType === "pppoe") return "PPPoE";
  return connectionType?.trim().toUpperCase() || "-";
}

/** Bangun payload nota lengkap (format PHPNuxBill-compatible). */
export async function buildNotaDocumentForReceipt(input: {
  tenantId: string;
  receiptId: string;
  tenant: {
    namaUsaha: string;
    logoUrl?: string | null;
    alamat?: string | null;
    phone?: string | null;
  };
  compactPelanggan?: boolean;
}): Promise<NotaDocumentData | null> {
  const detail = await getReceiptDetail(input.tenantId, input.receiptId);
  if (!detail?.pelanggan) return null;

  const { receipt, pelanggan: cust } = detail;

  const [paket, admin] = await Promise.all([
    cust.paketInternetId
      ? db.query.paketInternet.findFirst({
          where: and(
            eq(paketInternet.tenantId, input.tenantId),
            eq(paketInternet.id, cust.paketInternetId)
          ),
        })
      : Promise.resolve(null),
    receipt.createdBy
      ? db.query.users.findFirst({
          where: eq(users.id, receipt.createdBy),
        })
      : Promise.resolve(null),
  ]);

  const lineItems = receipt.lineItems ?? [];
  const periodeList = [
    ...new Set(
      lineItems
        .map((li) => (li.periode ? formatTagihanPeriode(li.periode) : ""))
        .filter(Boolean)
    ),
  ];

  const metode = receipt.metodeBayar?.trim() || "Tunai";
  const gateway = isGatewayMetode(metode);
  const adminNama = admin?.nama?.trim() || "-";

  return {
    namaUsaha: input.tenant.namaUsaha,
    logoUrl: input.tenant.logoUrl ?? null,
    alamat: input.tenant.alamat?.trim() || "-",
    phone: input.tenant.phone?.trim() || "-",
    noNota: receipt.noInvoice,
    pelangganNama: cust.nama,
    pelangganWa: cust.noWa,
    pelangganAlamat: cust.alamat,
    tglBayar: receipt.tglLunas ? receipt.tglLunas.toISOString() : null,
    metodeBayar: metode,
    adminNama,
    operatorLabel: gateway ? "Payment Gateway" : adminNama,
    jenisLayanan: formatJenisLayanan(cust.connectionType),
    paketNama: paket?.nama?.trim() || "-",
    username: cust.connectionUsername?.trim() || "-",
    dibuatPada: receipt.tglLunas ? receipt.tglLunas.toISOString() : null,
    kedaluwarsaPada: cust.tglJatuhTempo ? cust.tglJatuhTempo.toISOString() : null,
    periodeList,
    lineItems,
    total: receipt.totalTagihan,
    footerNote: "TERIMA KASIH",
    compactPelanggan: input.compactPelanggan,
  };
}
