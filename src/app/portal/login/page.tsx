import { Network } from "lucide-react";
import Link from "next/link";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PortalLoginForm } from "./portal-login-form";

export default function PortalLoginPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Network className="text-primary" />
          NetManage
        </Link>
        <ThemeSwitcher />
      </header>
      <main className="flex flex-1 items-center justify-center p-6">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-xl">Portal Pelanggan</CardTitle>
            <CardDescription>Masuk tanpa password menggunakan OTP WhatsApp.</CardDescription>
          </CardHeader>
          <CardContent>
            <PortalLoginForm />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
