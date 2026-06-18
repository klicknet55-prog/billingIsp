import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-xl">Masuk Dashboard</CardTitle>
        <CardDescription>Untuk Super Admin, Owner/Admin ISP, dan Kolektor.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
