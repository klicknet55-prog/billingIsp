"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { isNativeCapacitor } from "@/lib/mobile/capacitor-runtime";
import { MOBILE_ROOT_PATHS } from "@/lib/mobile/nav-config";
import { useMobileShell } from "@/lib/mobile/use-mobile-shell";

type AppPlugin = {
  addListener: (
    event: "backButton",
    cb: (data: { canGoBack: boolean }) => void
  ) => Promise<{ remove: () => void } | { remove: () => Promise<void> }>;
  exitApp?: () => Promise<void>;
  minimizeApp?: () => Promise<void>;
};

async function loadAppPlugin(): Promise<AppPlugin | null> {
  if (typeof window === "undefined") return null;
  try {
    const mod = await import("@capacitor/app");
    return mod.App as unknown as AppPlugin;
  } catch {
    const cap = window as Window & { Capacitor?: { Plugins?: { App?: AppPlugin } } };
    return cap.Capacitor?.Plugins?.App ?? null;
  }
}

function parentFallbackPath(pathname: string): string {
  if (pathname.startsWith("/portal")) return "/portal";
  if (pathname.startsWith("/kolektor")) return "/kolektor";
  if (pathname.startsWith("/dashboard/nota")) return "/dashboard/invoice";
  if (pathname.startsWith("/dashboard/laporan")) return "/dashboard/menu";
  if (pathname.startsWith("/dashboard/")) return "/dashboard";
  return "/dashboard";
}

/**
 * Tombol kembali Android:
 * - Bukan root → history.back() atau navigasi ke parent (hindari keluar APK)
 * - Root → "tekan lagi untuk keluar"
 */
export function MobileBackHandler() {
  const pathname = usePathname();
  const router = useRouter();
  const mobile = useMobileShell();
  const lastBackRef = useRef(0);
  const toastRef = useRef<HTMLDivElement | null>(null);
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    if (!mobile) return;

    let cancelled = false;
    let removeCapListener: (() => void) | undefined;
    let onPopState: (() => void) | undefined;

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

    async function exitOrMinimize() {
      const app = await loadAppPlugin();
      try {
        if (app?.minimizeApp) {
          await app.minimizeApp();
          return;
        }
        if (app?.exitApp) {
          await app.exitApp();
          return;
        }
      } catch {
        /* ignore */
      }
      window.history.go(-(window.history.length - 1));
    }

    function handleRootBack() {
      const now = Date.now();
      if (now - lastBackRef.current < 2000) {
        toastRef.current?.remove();
        void exitOrMinimize();
        return;
      }
      lastBackRef.current = now;
      showToast();
    }

    function handleNonRootBack() {
      if (typeof window !== "undefined" && window.history.length > 1) {
        router.back();
        return;
      }
      router.push(parentFallbackPath(pathnameRef.current));
    }

    void (async () => {
      if (!isNativeCapacitor()) return;
      const app = await loadAppPlugin();
      if (cancelled || !app?.addListener) return;
      try {
        const handle = await app.addListener("backButton", ({ canGoBack }) => {
          const path = pathnameRef.current;
          if (MOBILE_ROOT_PATHS.has(path)) {
            handleRootBack();
            return;
          }
          if (canGoBack || window.history.length > 1) {
            window.history.back();
            return;
          }
          handleNonRootBack();
        });
        removeCapListener = () => {
          void Promise.resolve(handle.remove()).catch(() => undefined);
        };
      } catch {
        /* plugin belum siap */
      }
    })();

    const isRoot = MOBILE_ROOT_PATHS.has(pathname);
    if (isRoot) {
      onPopState = () => {
        handleRootBack();
        window.history.pushState({ mobileBackGuard: true }, "");
      };
      window.history.pushState({ mobileBackGuard: true }, "");
      window.addEventListener("popstate", onPopState);
    }

    return () => {
      cancelled = true;
      removeCapListener?.();
      if (onPopState) {
        window.removeEventListener("popstate", onPopState);
      }
      toastRef.current?.remove();
    };
  }, [mobile, pathname, router]);

  return null;
}
