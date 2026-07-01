import { Activity, ChevronRight } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { logoutPortalAction } from "@/features/auth/actions";
import { requirePelanggan } from "@/lib/auth";
import { DEFAULT_BRAND_NAME } from "@/lib/site";
import { getCurrentTenant } from "@/lib/tenant";
import { formatDate } from "@/lib/utils";

export default async function PortalAkunPage() {
  const cust = await requirePelanggan();
  const tenant = await getCurrentTenant();
  const brandName = tenant?.namaUsaha ?? DEFAULT_BRAND_NAME;

  return (
    <div className="space-y-4">
      <PageHeader title="Akun saya" description="Profil pelanggan dan pengaturan." />

      <Card>
        <CardContent className="flex items-center gap-4 p-4">
          <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
            {cust.nama
              .split(/\s+/)
              .slice(0, 2)
              .map((w) => w[0])
              .join("")
              .toUpperCase()}
          </div>
          <div>
            <p className="font-semibold">{cust.nama}</p>
            <p className="text-sm text-muted-foreground">{cust.noWa}</p>
            {cust.alamat && (
              <p className="mt-1 text-sm text-muted-foreground">{cust.alamat}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="divide-y p-0">
          <Link
            href="/portal"
            className="flex items-center justify-between px-4 py-3 text-sm hover:bg-accent"
          >
            Paket &amp; langganan
            <ChevronRight className="size-4 text-muted-foreground" />
          </Link>
          <Link
            href="/portal/diagnostik"
            className="flex items-center justify-between px-4 py-3 text-sm hover:bg-accent"
          >
            <span className="flex items-center gap-2">
              <Activity className="size-4 text-muted-foreground" />
              Cek koneksi
            </span>
            <ChevronRight className="size-4 text-muted-foreground" />
          </Link>
          <a
            href={`https://wa.me/${cust.noWa.replace(/\D/g, "")}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between px-4 py-3 text-sm hover:bg-accent"
          >
            Hubungi {brandName}
            <ChevronRight className="size-4 text-muted-foreground" />
          </a>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        Jatuh tempo: {formatDate(cust.tglJatuhTempo)}
      </p>

      <form action={logoutPortalAction}>
        <Button type="submit" variant="outline" className="w-full">
          Keluar
        </Button>
      </form>
    </div>
  );
}
