"use client";

import {
  BarChart3,
  CreditCard,
  Ticket,
  Users,
} from "lucide-react";
import { useState } from "react";
import { FinanceWelcomeScreen, type FinanceQuickItem } from "@/components/mobile/finance";
import { LoginForm } from "./login-form";
import Link from "next/link";

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
  const [showForm, setShowForm] = useState(false);

  const fastMenu: FinanceQuickItem[] = [
    { id: "pelanggan", label: "Pelanggan", icon: Users },
    { id: "tagihan", label: "Tagihan", icon: CreditCard },
    { id: "tiket", label: "Tiket", icon: Ticket },
    { id: "laporan", label: "Laporan", icon: BarChart3 },
  ];

  if (!showForm) {
    return (
      <FinanceWelcomeScreen
        brandTitle={brandName}
        greeting="Selamat Datang!"
        subtitle="Dashboard Admin ISP — kelola pelanggan & billing."
        fastMenuItems={fastMenu.map((item) => ({
          ...item,
          onClick: () => setShowForm(true),
        }))}
        onLogin={() => setShowForm(true)}
        loginLabel="Login"
      />
    );
  }

  return (
    <div className="fm-mobile-only min-h-[100dvh] bg-background px-4 py-6">
      <div className="mx-auto max-w-sm space-y-4">
        <h1 className="text-xl font-bold">Masuk Dashboard</h1>
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
        <button
          type="button"
          className="w-full text-center text-sm text-muted-foreground underline"
          onClick={() => setShowForm(false)}
        >
          Kembali
        </button>
      </div>
    </div>
  );
}
