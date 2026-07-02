import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MOBILE_APP_NAMES } from "@/lib/mobile/app-names";

export function WrongAppScreen({
  variant,
}: {
  variant: "admin-for-pelanggan" | "portal-for-staff";
}) {
  const isAdmin = variant === "admin-for-pelanggan";

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-primary/10 text-2xl">
        {isAdmin ? "📱" : "🛠️"}
      </div>
      <h1 className="text-xl font-semibold">
        {isAdmin
          ? `Akun pelanggan tidak bisa digunakan di ${MOBILE_APP_NAMES.admin}`
          : `Akun staf tidak bisa digunakan di ${MOBILE_APP_NAMES.portal}`}
      </h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        {isAdmin
          ? `Unduh atau buka aplikasi ${MOBILE_APP_NAMES.portal} untuk cek tagihan dan bayar.`
          : `Untuk mengelola ISP, gunakan aplikasi ${MOBILE_APP_NAMES.admin} atau dashboard web.`}
      </p>
      <div className="mt-6 flex w-full max-w-xs flex-col gap-2">
        <Button asChild>
          <Link href={isAdmin ? "/portal/login" : "/login"}>
            {isAdmin ? `Buka ${MOBILE_APP_NAMES.portal}` : `Buka ${MOBILE_APP_NAMES.admin}`}
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={isAdmin ? "/login" : "/portal/login"}>Kembali login</Link>
        </Button>
      </div>
    </div>
  );
}
