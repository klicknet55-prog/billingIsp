import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FinanceMobileInit } from "@/components/mobile/finance";
import { redirectIfAuthenticatedFromStaffLogin } from "@/lib/auth";
import { DEFAULT_BRAND_NAME } from "@/lib/site";
import { getPlatformBrand } from "@/features/platform-settings/service";
import { LoginForm } from "./login-form";
import { StaffLoginMobile } from "./staff-login-mobile";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; reset?: string }>;
}) {
  await redirectIfAuthenticatedFromStaffLogin();

  const qs = await searchParams;
  const errorCode = qs.error ?? "";
  const suspended = errorCode === "suspended";
  const forbidden = errorCode === "forbidden";
  const resetOk = qs.reset === "ok";
  const brand = await getPlatformBrand();
  const brandName = brand.name ?? DEFAULT_BRAND_NAME;

  return (
    <>
      <FinanceMobileInit />
      <StaffLoginMobile
        brandName={brandName}
        suspended={suspended}
        forbidden={forbidden}
        resetOk={resetOk}
      />

      <div className="fm-desktop-only flex w-full justify-center">
        <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">Masuk Dashboard</CardTitle>
          <CardDescription>Untuk Super Admin, Owner/Admin ISP, dan Kolektor.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {suspended && (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              Akun ISP ditangguhkan karena langganan platform berakhir. Hubungi support platform
              untuk perpanjangan manual.
            </p>
          )}
          {forbidden && (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              Anda tidak memiliki akses ke halaman tersebut.
            </p>
          )}
          {resetOk && (
            <p className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm text-primary">
              Kata sandi berhasil diubah. Silakan masuk dengan kata sandi baru.
            </p>
          )}
          <LoginForm />
          <p className="text-center text-sm text-muted-foreground">
            Pelanggan?{" "}
            <Link href="/portal/login" className="text-primary hover:underline">
              Masuk portal
            </Link>
          </p>
          <p className="text-center text-sm text-muted-foreground">
            Belum punya akun ISP?{" "}
            <Link href="/register-tenant" className="text-primary hover:underline">
              Daftar
            </Link>
          </p>
          <p className="text-center text-xs text-muted-foreground">
            Daftarkan RT-RW Net atau ISP Anda,Gratis!!
          </p>
        </CardContent>
      </Card>
      </div>
    </>
  );
}
