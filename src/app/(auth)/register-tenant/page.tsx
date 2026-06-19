import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { listActiveSaasPackages } from "@/features/tenants/service";
import { RegisterForm } from "./register-form";

export default async function RegisterTenantPage() {
  const packages = await listActiveSaasPackages();

  return (
    <Card className="w-full max-w-3xl">
      <CardHeader>
        <CardTitle className="text-xl">Daftar ISP Baru</CardTitle>
        <CardDescription>
          Pilih paket, isi data, dan langsung aktif.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RegisterForm
          packages={packages.map((p) => ({
            id: p.id,
            nama: p.nama,
            hargaBulanan: p.hargaBulanan,
            diskonTahunanPersen: p.diskonTahunanPersen,
            limitasi: p.limitasi,
          }))}
        />
      </CardContent>
    </Card>
  );
}
