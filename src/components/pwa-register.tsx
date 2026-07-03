"use client";

import { useEffect } from "react";
import { getNetManageApp, persistNetManageAppFromUrl } from "@/lib/mobile/use-mobile-shell";

/** Mendaftarkan service worker untuk kapabilitas PWA/offline. */
export function PwaRegister() {
  useEffect(() => {
    persistNetManageAppFromUrl();
    if (getNetManageApp()) return;
    if (/mywificapacitorshell|netmanagecapacitorshell/i.test(navigator.userAgent)) return;
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
