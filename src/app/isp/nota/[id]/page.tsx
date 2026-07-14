import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { NotaPrintActions } from "@/components/billing/nota-print-actions";
import { NotaReceipt } from "@/components/billing/nota-receipt";
import { Button } from "@/components/ui/button";
import { buildNotaDocumentForReceipt } from "@/features/billing/nota-document-builder";
import { requireUser } from "@/lib/auth";
import { DEFAULT_BRAND_NAME } from "@/lib/site";
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
  const notaData = await buildNotaDocumentForReceipt({
    tenantId: user.tenantId!,
    receiptId: id,
    tenant: {
      namaUsaha: tenant?.namaUsaha ?? DEFAULT_BRAND_NAME,
      logoUrl: tenant?.logoUrl,
      alamat: tenant?.alamat,
      phone: tenant?.phone,
    },
  });
  if (!notaData) notFound();

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
        <NotaPrintActions data={notaData} documentTitle={`Nota ${notaData.noNota}`} />
      </div>

      <NotaReceipt {...notaData} />
    </div>
  );
}
