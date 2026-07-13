"use client";

import {
  BarChart3,
  CreditCard,
  Ticket,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import {
  FinanceMobileSheet,
  FinanceWelcomeScreen,
  type FinanceQuickItem,
} from "@/components/mobile/finance";
import { LoginForm } from "./login-form";

export function StaffLoginMobile({
  brandName = "NetManage",
  suspended,
  forbidden,
  resetOk,
}: {
  brandName?: string;
  suspended?: boolean;
  forbidden?: boolean;
  resetOk?: boolean;
}) {
  const [loginOpen, setLoginOpen] = useState(false);

  const openLogin = () => setLoginOpen(true);

  const fastMenu: FinanceQuickItem[] = [
    { id: "pelanggan", label: "Pelanggan", icon: Users },
    { id: "tagihan", label: "Tagihan", icon: CreditCard },
    { id: "tiket", label: "Tiket", icon: Ticket },
    { id: "laporan", label: "Laporan", icon: BarChart3 },
  ];

  return (
    <>
      <FinanceWelcomeScreen
        layout="fullscreen"
        brandTitle={brandName}
        greeting="Selamat Datang!"
        subtitle="Dashboard Admin ISP — kelola pelanggan & billing."
        fastMenuItems={fastMenu.map((item) => ({
          ...item,
          onClick: openLogin,
        }))}
        onLogin={openLogin}
        loginLabel="Login"
      />

      <FinanceMobileSheet
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        title="Masuk Dashboard"
      >
        <div className="space-y-4 px-4 py-4">
          {suspended && (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              Akun ISP ditangguhkan. Hubungi support platform.
            </p>
          )}
          {forbidden && (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              Anda tidak memiliki akses ke halaman tersebut.
            </p>
          )}
          {resetOk && (
            <p className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm text-primary">
              Kata sandi berhasil diubah. Silakan masuk.
            </p>
          )}
          <LoginForm />
          <p className="text-center text-sm text-muted-foreground">
            Pelanggan?{" "}
            <Link href="/portal/login" className="text-primary hover:underline">
              Masuk portal
            </Link>
          </p>
        </div>
      </FinanceMobileSheet>
    </>
  );
}
