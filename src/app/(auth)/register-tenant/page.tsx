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

export default async function RegisterTenantPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const qs = await searchParams;
  const referralCode = qs.ref?.trim().toUpperCase() ?? "";
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
        {referralCode && (
          <p className="mb-4 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-primary">
            Anda diajak dengan kode referral <strong>{referralCode}</strong>.
          </p>
        )}
        <PackageList packages={mapped} referralCode={referralCode} />
      </CardContent>
    </Card>
  );
}
