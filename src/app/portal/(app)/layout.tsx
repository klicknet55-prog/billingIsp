import { requirePelanggan } from "@/lib/auth";
import { getCurrentTenant } from "@/lib/tenant";
import { PortalNav } from "./portal-nav";

export default async function PortalAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requirePelanggan();
  const tenant = await getCurrentTenant();
  return (
    <div className="min-h-screen">
      <PortalNav namaUsaha={tenant?.namaUsaha ?? "NetManage"} />
      <main className="mx-auto max-w-3xl p-4">{children}</main>
    </div>
  );
}
