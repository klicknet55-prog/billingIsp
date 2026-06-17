"use client";

import { useEffect } from "react";

/** Mendaftarkan service worker untuk kapabilitas PWA/offline. */
export function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);
  return null;
}
