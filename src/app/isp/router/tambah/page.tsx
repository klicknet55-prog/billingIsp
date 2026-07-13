import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RouterCreateForm } from "@/features/routers/components/router-create-form";
import { normalizeRouterEndpoint } from "@/features/routers/endpoint";
import { requireUser } from "@/lib/auth";

export default async function TambahRouterPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    ip?: string;
    port?: string;
    connectionMode?: string;
  }>;
}) {
  const qs = await searchParams;
  const error = qs.error ? decodeURIComponent(qs.error) : "";
  const rawIp = qs.ip ? decodeURIComponent(qs.ip) : undefined;
  const rawPort = qs.port ? decodeURIComponent(qs.port) : undefined;
  const normalized = normalizeRouterEndpoint(rawIp ?? "", rawPort ?? "443");
  const connectionMode =
    qs.connectionMode === "legacy_api"
      ? "legacy_api"
      : qs.connectionMode === "rest"
        ? "rest"
        : undefined;
  await requireUser(["owner", "admin"]);

  return (
    <>
      <div className="mb-3 md:hidden">
        <Button asChild variant="ghost" size="sm" className="-ml-2 h-10 px-2">
          <Link href="/dashboard/router">
            <ChevronLeft className="size-5" />
            Kembali
          </Link>
        </Button>
      </div>

      <PageHeader title="Tambah Router" />

      {error && (
        <Card className="mb-4 border-destructive/30 bg-destructive/5">
          <CardContent className="p-3 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4 md:p-5">
          <RouterCreateForm
            cancelHref="/dashboard/router"
            defaults={{
              ipAddress: normalized.ipAddress || undefined,
              apiPort: normalized.apiPort || undefined,
              connectionMode,
            }}
          />
        </CardContent>
      </Card>
    </>
  );
}
