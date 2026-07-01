import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PaketForm } from "@/app/isp/paket/paket-form";
import { listRouters } from "@/features/routers/service";
import { requireUser } from "@/lib/auth";

export default async function TambahPaketPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const qs = await searchParams;
  const error = qs.error ? decodeURIComponent(qs.error) : "";
  const user = await requireUser(["owner", "admin"]);
  const routerRows = await listRouters(user.tenantId!);
  const routerOptions = routerRows.map((r) => ({ id: r.id, nama: r.nama }));

  return (
    <>
      <div className="mb-3 md:hidden">
        <Button asChild variant="ghost" size="sm" className="-ml-2 h-10 px-2">
          <Link href="/dashboard/paket">
            <ChevronLeft className="size-5" />
            Kembali
          </Link>
        </Button>
      </div>

      <PageHeader
        title="Tambah Paket"
        description="Buat paket layanan baru."
      />

      {error && (
        <Card className="mb-4 border-destructive/30 bg-destructive/5">
          <CardContent className="p-3 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4 md:p-5">
          <PaketForm routers={routerOptions} cancelHref="/dashboard/paket" />
        </CardContent>
      </Card>
    </>
  );
}
