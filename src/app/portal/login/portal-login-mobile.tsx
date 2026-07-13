"use client";

import {
  Activity,
  CreditCard,
  FileText,
  MessageSquareWarning,
} from "lucide-react";
import { useState } from "react";
import { FinanceWelcomeScreen, type FinanceQuickItem } from "@/components/mobile/finance";
import { PortalLoginForm } from "./portal-login-form";

export function PortalLoginMobile({ brandName }: { brandName: string }) {
  const [showForm, setShowForm] = useState(false);

  const fastMenu: FinanceQuickItem[] = [
    { id: "tagihan", label: "Tagihan", icon: FileText, href: "#login" },
    { id: "lapor", label: "Lapor", icon: MessageSquareWarning, href: "#login" },
    { id: "diagnostik", label: "Diagnostik", icon: Activity, href: "#login" },
    { id: "bayar", label: "Bayar", icon: CreditCard, href: "#login" },
  ];

  if (!showForm) {
    return (
      <FinanceWelcomeScreen
        brandTitle={brandName}
        greeting="Selamat Datang!"
        subtitle="Portal pelanggan WiFi — kelola tagihan & lapor gangguan."
        fastMenuItems={fastMenu.map((item) => ({
          ...item,
          onClick: () => setShowForm(true),
          href: undefined,
        }))}
        onLogin={() => setShowForm(true)}
        loginLabel="Login"
      />
    );
  }

  return (
    <div className="fm-mobile-only min-h-[100dvh] bg-background px-4 py-6">
      <div className="mx-auto max-w-sm">
        <h1 className="text-xl font-bold">Masuk Portal</h1>
        <p className="mt-1 text-sm text-muted-foreground">OTP via WhatsApp</p>
        <div className="mt-6">
          <PortalLoginForm />
        </div>
        <button
          type="button"
          className="mt-4 w-full text-center text-sm text-muted-foreground underline"
          onClick={() => setShowForm(false)}
        >
          Kembali
        </button>
      </div>
    </div>
  );
}

export function PortalLoginDesktop({ errorMessage }: { errorMessage: string | null }) {
  return (
    <>
      {errorMessage && <p className="mb-4 text-sm text-destructive">{errorMessage}</p>}
      <PortalLoginForm />
    </>
  );
}
