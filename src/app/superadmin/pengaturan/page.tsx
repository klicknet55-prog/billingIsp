import { redirect } from "next/navigation";
import { SUPERADMIN_PENGATURAN_NAV } from "@/lib/superadmin-pengaturan-nav";

export default function SuperadminPengaturanIndexPage() {
  redirect(SUPERADMIN_PENGATURAN_NAV[0].href);
}
