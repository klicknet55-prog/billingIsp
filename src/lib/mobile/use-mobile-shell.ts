"use client";

import { useEffect, useState } from "react";

const NM_APP_KEY = "nm_app";

/** Simpan ?nm_app=admin|portal dari URL shell Capacitor. */
export function persistNetManageAppFromUrl(): void {
  if (typeof window === "undefined") return;
  const app = new URLSearchParams(window.location.search).get("nm_app");
  if (app === "admin" || app === "portal") {
    sessionStorage.setItem(NM_APP_KEY, app);
    return;
  }
  persistNetManageAppFromPath();
}

/** Deteksi rute portal / link bayar saat dibuka lewat App Link (tanpa query nm_app). */
export function persistNetManageAppFromPath(): void {
  if (typeof window === "undefined") return;
  const path = window.location.pathname;
  if (path.startsWith("/portal") || path.startsWith("/p/")) {
    sessionStorage.setItem(NM_APP_KEY, "portal");
  }
}

export function getNetManageApp(): "admin" | "portal" | null {
  if (typeof window === "undefined") return null;
  const v = sessionStorage.getItem(NM_APP_KEY);
  return v === "admin" || v === "portal" ? v : null;
}

function readMobileShellState(): boolean {
  if (typeof window === "undefined") return false;
  persistNetManageAppFromUrl();
  return (
    window.matchMedia("(max-width: 767px)").matches ||
    window.matchMedia("(display-mode: standalone)").matches ||
    getNetManageApp() !== null
  );
}

/** Deteksi layar mobile / PWA / shell Capacitor (untuk back handler dll.). */
export function useMobileShell(): boolean {
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setMobile(readMobileShellState());
    update();
    mq.addEventListener("change", update);
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      mq.removeEventListener("change", update);
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  return mobile;
}
