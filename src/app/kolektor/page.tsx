import { PageHeader } from "@/components/layout/page-header";
import { listUnpaidInvoicesForKolektor } from "@/features/invoices/service";
import { requireUser } from "@/lib/auth";
import { DEFAULT_BRAND_NAME } from "@/lib/site";
import { getCurrentTenant } from "@/lib/tenant";
import { KolektorTasks, type Task } from "./kolektor-tasks";

export default async function KolektorPage() {
  const user = await requireUser(["kolektor"]);
  const tenant = await getCurrentTenant();
  const rows = await listUnpaidInvoicesForKolektor(user.tenantId!, user.id);

  const tasks: Task[] = rows.map((i) => ({
    id: i.id,
    noInvoice: i.noInvoice,
    pelangganNama: i.pelangganNama,
    pelangganWa: i.pelangganWa,
    total: i.totalTagihan,
    status: i.status,
    latitude: i.latitude,
    longitude: i.longitude,
    alamat: i.alamat,
  }));

  return (
    <>
      <PageHeader
        title="Tugas Penagihan"
        description="Tagihan belum lunas pada pelanggan area Anda, diurutkan dari yang terdekat."
      />
      <KolektorTasks tasks={tasks} namaUsaha={tenant?.namaUsaha ?? DEFAULT_BRAND_NAME} />
    </>
  );
}
