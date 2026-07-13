"use client";

import { useEffect } from "react";
import { useMobileShell } from "@/lib/mobile/use-mobile-shell";

/** Aktifkan class html.nm-finance-mobile pada viewport mobile / shell Capacitor. */
export function FinanceMobileInit() {
  const mobile = useMobileShell();

  useEffect(() => {
    const root = document.documentElement;
    if (mobile) {
      root.classList.add("nm-finance-mobile");
    } else {
      root.classList.remove("nm-finance-mobile");
    }
    return () => root.classList.remove("nm-finance-mobile");
  }, [mobile]);

  return null;
}
