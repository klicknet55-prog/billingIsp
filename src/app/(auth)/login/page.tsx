import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const qs = await searchParams;
  const errorCode = qs.error ?? "";
  const suspended = errorCode === "suspended";
  const forbidden = errorCode === "forbidden";

  return (
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
  );
}
