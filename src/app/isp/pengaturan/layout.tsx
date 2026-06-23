import { PageHeader } from "@/components/layout/page-header";
import { IspPengaturanSubNav } from "@/components/layout/isp-pengaturan-sub-nav";

export default function IspPengaturanLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PageHeader title="Pengaturan" description="Kelola profil dan backup data ISP." />
      <IspPengaturanSubNav />
      {children}
    </>
  );
}
