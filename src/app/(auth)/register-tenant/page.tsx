import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getPlatformSettings } from "@/features/platform-settings/service";
import { listActiveSaasPackages } from "@/features/tenants/service";
import { RegisterForm } from "./register-form";

export default async function RegisterTenantPage() {
  const [packages, settings] = await Promise.all([
    listActiveSaasPackages(),
    getPlatformSettings(),
  ]);

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="text-xl">Daftar ISP Baru</CardTitle>
        <CardDescription>
          Bandingkan paket dan fitur yang Anda dapatkan, lalu isi data untuk langsung aktif.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RegisterForm
          tcTitle={settings.tcTitle}
          tcContent={settings.tcContent}
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
