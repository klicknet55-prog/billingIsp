import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getPlatformSettings } from "@/features/platform-settings/service";
import { listActiveSaasPackages } from "@/features/tenants/service";
import { RegisterForm } from "../register-form";
import { normalizeBillingPeriod, normalizeRegisterPkg } from "../shared";

export default async function RegisterTenantFormPage({
  searchParams,
}: {
  searchParams: Promise<{ packageId?: string; billingPeriod?: string; ref?: string }>;
}) {
  const qs = await searchParams;
  const packageId = qs.packageId?.trim() ?? "";
  if (!packageId) notFound();
  const referralCode = qs.ref?.trim().toUpperCase() ?? "";

  const [packages, settings] = await Promise.all([
    listActiveSaasPackages(),
    getPlatformSettings(),
  ]);

  const pkg = packages.find((p) => p.id === packageId);
  if (!pkg) notFound();

  const selected = normalizeRegisterPkg(pkg);
  const billingPeriod = normalizeBillingPeriod(qs.billingPeriod, selected);

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-xl">Form Pendaftaran ISP</CardTitle>
            <CardDescription className="mt-1">
              Paket <strong>{selected.nama}</strong> — isi data usaha dan akun admin.
            </CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/register-tenant">Ganti paket</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <RegisterForm
          key={selected.id}
          pkg={selected}
          billingPeriod={billingPeriod}
          referralCode={referralCode}
          tcTitle={settings.tcTitle}
          tcContent={settings.tcContent}
        />
      </CardContent>
    </Card>
  );
}
