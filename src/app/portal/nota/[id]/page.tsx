import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { NotaPrintActions } from "@/components/billing/nota-print-actions";
import { NotaReceipt } from "@/components/billing/nota-receipt";
import { Button } from "@/components/ui/button";
import { buildNotaDocumentForReceipt } from "@/features/billing/nota-document-builder";
import { getReceiptDetail } from "@/features/billing/payment-service";
import { requirePelanggan } from "@/lib/auth";
import { DEFAULT_BRAND_NAME } from "@/lib/site";
import { getCurrentTenant } from "@/lib/tenant";

export default async function PortalNotaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cust = await requirePelanggan();
  const tenant = await getCurrentTenant();

  const detail = await getReceiptDetail(cust.tenantId, id);
  if (!detail || detail.receipt.pelangganId !== cust.id) notFound();

  const notaData = await buildNotaDocumentForReceipt({
    tenantId: cust.tenantId,
    receiptId: id,
    tenant: {
      namaUsaha: tenant?.namaUsaha ?? DEFAULT_BRAND_NAME,
      logoUrl: tenant?.logoUrl,
      alamat: tenant?.alamat,
      phone: tenant?.phone,
    },
    compactPelanggan: true,
  });
  if (!notaData) notFound();

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-4 flex flex-col gap-3 print:hidden sm:flex-row sm:items-start sm:justify-between">
        <Button asChild variant="ghost" size="sm" className="w-fit">
          <Link href="/portal/tagihan">
            <ArrowLeft /> Kembali
          </Link>
        </Button>
        <NotaPrintActions data={notaData} documentTitle={`Nota ${notaData.noNota}`} />
      </div>

      <NotaReceipt {...notaData} />
    </div>
  );
}
