import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { KolektorTasksClient } from "@/features/kolektor/kolektor-tasks-client";
import { getTagihanSummary } from "@/features/billing/tagihan-service";
import { listOutstandingForKolektor } from "@/features/billing/tagihan-service";
import { requireUser } from "@/lib/auth";
import { DEFAULT_BRAND_NAME } from "@/lib/site";
import { getCurrentTenant } from "@/lib/tenant";
import { KolektorMobileHome } from "./kolektor-mobile-home";

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

  const tasks = summaries.map((p) => ({
    pelangganId: p.pelangganId,
    nama: p.nama,
    wa: p.wa,
    lat: p.lat,
    lng: p.lng,
    alamat: p.alamat,
    bulanIniAmount: p.summary.bulanIni?.amount ?? 0,
    tunggakanTotal: p.summary.totalTunggakan,
    hasBulanIni: p.summary.hasBulanIni,
    hasTunggakan: p.summary.tunggakan.length > 0,
  }));

  const totalTunggakan = tasks.reduce(
    (sum, t) => sum + (t.hasTunggakan ? t.tunggakanTotal : 0) + (t.hasBulanIni ? t.bulanIniAmount : 0),
    0
  );
  const bulanIniTotal = tasks.reduce((sum, t) => sum + (t.hasBulanIni ? t.bulanIniAmount : 0), 0);
  const terkumpulEstimate = Math.max(0, bulanIniTotal);

  return (
    <>
      <KolektorMobileHome
        totalTunggakan={totalTunggakan}
        taskCount={tasks.length}
        bulanIniTotal={bulanIniTotal}
        terkumpulEstimate={terkumpulEstimate}
      />

      <div className="fm-desktop-only">
        <PageHeader
          title="Tugas Penagihan"
          description="Tagihan belum lunas pada pelanggan area Anda."
        />
      </div>
      <h1 className="fm-mobile-only mb-4 text-lg font-bold" id="tugas-kolektor">
        Daftar Tugas
      </h1>
      <Suspense fallback={<Card><CardContent className="p-8 text-center text-muted-foreground">Memuat...</CardContent></Card>}>
        <KolektorTasksClient
          tasks={tasks}
          namaUsaha={tenant?.namaUsaha ?? DEFAULT_BRAND_NAME}
          kolektorNama={user.nama}
        />
      </Suspense>
    </>
  );
}
