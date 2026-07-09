import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { getReferralDashboard } from "@/features/referrals/service";
import { requireUser } from "@/lib/auth";
import { ReferralDashboardClient } from "./referral-dashboard-client";

export default async function ReferralPage() {
  const user = await requireUser(["owner", "admin"]);
  const data = await getReferralDashboard(user.tenantId!);

  return (
    <>
      <PageHeader
        title="Program Referral"
        description="Ajak ISP lain bergabung dan dapatkan perpanjangan langganan."
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/langganan">Kelola langganan</Link>
          </Button>
        }
      />
      <ReferralDashboardClient data={data} />
    </>
  );
}
