"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { MOBILE_ROOT_PATHS } from "@/lib/mobile/nav-config";
import { useMobileShell } from "@/lib/mobile/use-mobile-shell";

export function MobileBackHandler() {
  const pathname = usePathname();
  const mobile = useMobileShell();
  const lastBackRef = useRef(0);
  const toastRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!mobile || !MOBILE_ROOT_PATHS.has(pathname)) return;

    const onPopState = () => {
      const now = Date.now();
      if (now - lastBackRef.current < 2000) {
        toastRef.current?.remove();
        return;
      }
      lastBackRef.current = now;
      window.history.pushState({ mobileBackGuard: true }, "");
      showToast();
    };

    window.history.pushState({ mobileBackGuard: true }, "");
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
      toastRef.current?.remove();
    };
  }, [mobile, pathname]);

  function showToast() {
    toastRef.current?.remove();
    const el = document.createElement("div");
    el.className =
      "fixed bottom-20 left-1/2 z-[100] -translate-x-1/2 rounded-lg bg-foreground px-4 py-2 text-sm text-background shadow-lg";
    el.textContent = "Tekan lagi untuk keluar";
    document.body.appendChild(el);
    toastRef.current = el;
    setTimeout(() => {
      el.remove();
      if (toastRef.current === el) toastRef.current = null;
    }, 2000);
  }

  return null;
}
