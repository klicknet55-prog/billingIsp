import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { NotaPrintActions } from "@/components/billing/nota-print-actions";
import { NotaReceipt } from "@/components/billing/nota-receipt";
import { Button } from "@/components/ui/button";
import { getReceiptDetail } from "@/features/billing/payment-service";
import { requirePelanggan } from "@/lib/auth";
import { toNotaDocumentData } from "@/lib/print/nota-serialize";
import { getCurrentTenant } from "@/lib/tenant";

export default async function PortalNotaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cust = await requirePelanggan();
  const tenant = await getCurrentTenant();
  const detail = await getReceiptDetail(cust.tenantId, id);
  if (!detail || detail.receipt.pelangganId !== cust.id) notFound();
  const { receipt: inv } = detail;

  const notaData = toNotaDocumentData({
    namaUsaha: tenant?.namaUsaha ?? "ISP",
    logoUrl: tenant?.logoUrl,
    noNota: inv.noInvoice,
    pelangganNama: cust.nama,
    tglBayar: inv.tglLunas,
    metodeBayar: inv.metodeBayar,
    lineItems: inv.lineItems ?? [],
    total: inv.totalTagihan,
    compactPelanggan: true,
  });

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-4 flex flex-col gap-3 print:hidden sm:flex-row sm:items-start sm:justify-between">
        <Button asChild variant="ghost" size="sm" className="w-fit">
          <Link href="/portal/tagihan">
            <ArrowLeft /> Kembali
          </Link>
        </Button>
        <NotaPrintActions data={notaData} documentTitle={`Nota ${inv.noInvoice}`} />
      </div>

      <NotaReceipt
        namaUsaha={tenant?.namaUsaha ?? "ISP"}
        logoUrl={tenant?.logoUrl}
        noNota={inv.noInvoice}
        pelangganNama={cust.nama}
        tglBayar={inv.tglLunas}
        metodeBayar={inv.metodeBayar}
        lineItems={inv.lineItems ?? []}
        total={inv.totalTagihan}
        compactPelanggan
      />
    </div>
  );
}
