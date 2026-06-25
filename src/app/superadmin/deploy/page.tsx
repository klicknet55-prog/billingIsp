import Link from "next/link";
import { Rocket } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getDeployInfo } from "@/features/platform-deploy/service";
import { DeployPanel } from "./deploy-panel";

export default async function SuperadminDeployPage() {
  const info = await getDeployInfo();

  return (
    <>
      <PageHeader
        title="Update Aplikasi"
        description="Deploy manual dari GitHub ke server production (superadmin only)."
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/superadmin">← Dashboard</Link>
          </Button>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Rocket className="size-5" />
            Deploy Production
          </CardTitle>
          <CardDescription>
            Hanya superadmin. Pastikan perubahan sudah di-push ke branch{" "}
            <code className="rounded bg-muted px-1">{info.git.branch ?? "main"}</code> sebelum
            menekan update.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DeployPanel initialInfo={info} />
        </CardContent>
      </Card>
    </>
  );
}
