import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { logoutAction } from "@/features/auth/actions";
import { requireUser } from "@/lib/auth";
import { DEFAULT_BRAND_NAME } from "@/lib/site";
import { getCurrentTenant } from "@/lib/tenant";

export default async function KolektorProfilPage() {
  const user = await requireUser(["kolektor"]);
  const tenant = await getCurrentTenant();

  return (
    <>
      <PageHeader title="Profil" description="Akun kolektor lapangan." />
      <Card>
        <CardContent className="space-y-4 p-4">
          <div>
            <p className="text-xs text-muted-foreground">Nama</p>
            <p className="font-medium">{user.nama}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Email</p>
            <p className="font-medium">{user.email}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">ISP</p>
            <p className="font-medium">{tenant?.namaUsaha ?? DEFAULT_BRAND_NAME}</p>
          </div>
          <form action={logoutAction}>
            <Button type="submit" variant="outline" className="w-full">
              Keluar
            </Button>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
