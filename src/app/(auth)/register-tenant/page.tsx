import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { listPackages } from "@/features/tenants/service";
import { RegisterForm } from "./register-form";

export default async function RegisterTenantPage() {
  const packages = await listPackages();

  return (
    <Card className="w-full max-w-3xl">
      <CardHeader>
        <CardTitle className="text-xl">Daftar ISP Baru</CardTitle>
        <CardDescription>
          Pilih paket, isi data, dan langsung aktif. Pembayaran disimulasikan (mode mock).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RegisterForm
          packages={packages.map((p) => ({
            id: p.id,
            nama: p.nama,
            hargaBulanan: p.hargaBulanan,
            limitasi: p.limitasi,
          }))}
        />
      </CardContent>
    </Card>
  );
}
