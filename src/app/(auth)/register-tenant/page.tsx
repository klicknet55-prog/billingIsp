import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { listActiveSaasPackages } from "@/features/tenants/service";
import { PackageList } from "./package-list";
import { normalizeRegisterPkg } from "./shared";

export default async function RegisterTenantPage() {
  const packages = await listActiveSaasPackages();
  const mapped = packages.map(normalizeRegisterPkg);

  return (
    <Card className="w-full max-w-5xl">
      <CardHeader>
        <CardTitle className="text-xl">Pilih Paket Langganan</CardTitle>
        <CardDescription>
          Bandingkan fitur dan harga, lalu klik Daftar pada paket yang Anda inginkan.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <PackageList packages={mapped} />
      </CardContent>
    </Card>
  );
}
