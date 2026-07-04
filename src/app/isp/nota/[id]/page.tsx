import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { NotaPrintActions } from "@/components/billing/nota-print-actions";
import { NotaReceipt } from "@/components/billing/nota-receipt";
import { Button } from "@/components/ui/button";
import { getReceiptDetail } from "@/features/billing/payment-service";
import { requireUser } from "@/lib/auth";
import { toNotaDocumentData } from "@/lib/print/nota-serialize";
import { getCurrentTenant } from "@/lib/tenant";

export default async function NotaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ success?: string }>;
}) {
  const { id } = await params;
  const qs = await searchParams;
  const user = await requireUser(["owner", "admin", "teknisi", "kolektor"]);
  const tenant = await getCurrentTenant();
  const detail = await getReceiptDetail(user.tenantId!, id);
  if (!detail || !detail.pelanggan) notFound();
  const { receipt: inv, pelanggan: cust } = detail;

  const notaData = toNotaDocumentData({
    namaUsaha: tenant?.namaUsaha ?? "ISP",
    logoUrl: tenant?.logoUrl,
    noNota: inv.noInvoice,
    pelangganNama: cust.nama,
    pelangganWa: cust.noWa,
    pelangganAlamat: cust.alamat,
    tglBayar: inv.tglLunas,
    metodeBayar: inv.metodeBayar,
    lineItems: inv.lineItems ?? [],
    total: inv.totalTagihan,
  });

  return (
    <div className="mx-auto max-w-lg">
      {qs.success === "1" && (
        <div className="mb-4 rounded-md border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-800 dark:text-green-200 print:hidden">
          Pembayaran berhasil. Unduh PDF atau cetak nota di bawah.
        </div>
      )}
      <div className="mb-4 flex flex-col gap-3 print:hidden sm:flex-row sm:items-start sm:justify-between">
        <Button asChild variant="ghost" size="sm" className="w-fit">
          <Link href="/dashboard/invoice">
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
        pelangganWa={cust.noWa}
        pelangganAlamat={cust.alamat}
        tglBayar={inv.tglLunas}
        metodeBayar={inv.metodeBayar}
        lineItems={inv.lineItems ?? []}
        total={inv.totalTagihan}
      />
    </div>
  );
}
