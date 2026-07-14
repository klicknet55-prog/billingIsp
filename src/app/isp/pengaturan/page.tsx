import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { tenants } from "@/lib/db/schema";
import { DEFAULT_BRAND_NAME } from "@/lib/site";
import { eq } from "drizzle-orm";
import { AdminProfileForm, CompanyProfileForm } from "./settings-forms";

export default async function PengaturanPage() {
  const user = await requireUser(["owner", "admin"]);
  const tenant = user.tenantId
    ? await db.query.tenants.findFirst({ where: eq(tenants.id, user.tenantId) })
    : null;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Profil Admin</CardTitle>
            <CardDescription>Data akun Anda yang tampil di dashboard.</CardDescription>
          </CardHeader>
          <CardContent>
            <AdminProfileForm
              defaults={{ nama: user.nama, email: user.email, phone: user.phone }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Profil Perusahaan</CardTitle>
            <CardDescription>
              Nama, alamat, no. HP, dan logo untuk header laporan.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CompanyProfileForm
              defaults={{
                namaUsaha: tenant?.namaUsaha ?? DEFAULT_BRAND_NAME,
                alamat: tenant?.alamat ?? null,
                phone: tenant?.phone ?? null,
                logoUrl: tenant?.logoUrl ?? null,
              }}
            />
          </CardContent>
      </Card>
    </div>
  );
}

