"use client";

import { useEffect } from "react";
import { getNetManageApp, persistNetManageAppFromUrl } from "@/lib/mobile/use-mobile-shell";

function shouldRegisterServiceWorker(): boolean {
  if (typeof window === "undefined") return false;
  const { hostname, protocol } = window.location;
  // Dev lokal: hindari SW men-cache respons gagal / sertifikat tidak valid.
  if (hostname === "localhost" || hostname === "127.0.0.1") return false;
  if (protocol !== "https:") return false;
  return true;
}

/** Mendaftarkan service worker untuk kapabilitas PWA/offline. */
export function PwaRegister() {
  useEffect(() => {
    persistNetManageAppFromUrl();
    if (getNetManageApp()) return;
    if (/mywificapacitorshell|netmanagecapacitorshell/i.test(navigator.userAgent)) return;
    if (!("serviceWorker" in navigator)) return;

    if (!shouldRegisterServiceWorker()) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => r.unregister());
      });
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
