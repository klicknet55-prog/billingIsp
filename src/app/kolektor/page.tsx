import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { PayTagihanPanel } from "@/features/billing/pay-tagihan-panel";
import { getTagihanSummary } from "@/features/billing/tagihan-service";
import { listOutstandingForKolektor } from "@/features/billing/tagihan-service";
import { requireUser } from "@/lib/auth";
import { DEFAULT_BRAND_NAME } from "@/lib/site";
import { getCurrentTenant } from "@/lib/tenant";

export default async function KolektorPage() {
  const user = await requireUser(["kolektor"]);
  const tenant = await getCurrentTenant();
  const rows = await listOutstandingForKolektor(user.tenantId!, user.id);

  const byPelanggan = new Map<
    string,
    {
      pelangganId: string;
      nama: string;
      wa: string;
      lat: number | null;
      lng: number | null;
      alamat: string | null;
    }
  >();
  for (const r of rows) {
    if (!byPelanggan.has(r.pelangganId)) {
      byPelanggan.set(r.pelangganId, {
        pelangganId: r.pelangganId,
        nama: r.nama,
        wa: r.wa,
        lat: r.lat,
        lng: r.lng,
        alamat: r.alamat,
      });
    }
  }

  const summaries = await Promise.all(
    [...byPelanggan.values()].map(async (p) => ({
      ...p,
      summary: await getTagihanSummary(user.tenantId!, p.pelangganId),
    }))
  );

  return (
    <>
      <PageHeader
        title="Tugas Penagihan"
        description="Tagihan belum lunas pada pelanggan area Anda."
      />
      <div className="space-y-4">
        {summaries.map((p) => (
          <Card key={p.pelangganId}>
            <CardContent className="p-4">
              <p className="mb-2 font-medium">{p.nama}</p>
              <p className="mb-3 text-xs text-muted-foreground">{p.alamat ?? p.wa}</p>
              <PayTagihanPanel
                pelangganId={p.pelangganId}
                pelangganNama={p.nama}
                bulanIniAmount={p.summary.bulanIni?.amount ?? 0}
                tunggakanTotal={p.summary.totalTunggakan}
                hasBulanIni={p.summary.hasBulanIni}
                hasTunggakan={p.summary.tunggakan.length > 0}
              />
            </CardContent>
          </Card>
        ))}
        {summaries.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Tidak ada tagihan outstanding di area Anda.
            </CardContent>
          </Card>
        )}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        {tenant?.namaUsaha ?? DEFAULT_BRAND_NAME} — Kolektor {user.nama}
      </p>
    </>
  );
}
