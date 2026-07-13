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
  const initials = cust.nama
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div className="space-y-4">
      <div className="fm-desktop-only">
        <PageHeader title="Akun saya" description="Profil pelanggan dan pengaturan." />
      </div>
      <h1 className="fm-mobile-only text-lg font-bold">Akun Saya</h1>

      <Card className="fm-surface-card overflow-hidden">
        <CardContent className="bg-gradient-to-br from-primary/10 to-transparent p-5">
          <div className="flex items-center gap-4">
            <div className="flex size-14 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground">
              {initials}
            </div>
            <div>
              <p className="text-lg font-semibold">{cust.nama}</p>
              <p className="text-sm text-muted-foreground">{cust.noWa}</p>
              {cust.alamat && (
                <p className="mt-1 text-sm text-muted-foreground">{cust.alamat}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="fm-surface-card">
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
        <Button type="submit" variant="outline" className="w-full rounded-full">
          Keluar
        </Button>
      </form>
    </div>
  );
}
