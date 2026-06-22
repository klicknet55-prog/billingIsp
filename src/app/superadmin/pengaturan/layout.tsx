import { PageHeader } from "@/components/layout/page-header";
import { SuperadminPengaturanSubNav } from "@/components/layout/superadmin-pengaturan-sub-nav";

export default function SuperadminPengaturanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <PageHeader
        title="Pengaturan"
        description="Konfigurasi platform NetManage."
      />
      <SuperadminPengaturanSubNav />
      {children}
    </>
  );
}
