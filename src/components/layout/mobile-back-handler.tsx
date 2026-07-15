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

function getAppPlugin(): AppPlugin | null {
  if (typeof window === "undefined") return null;
  const cap = window as Window & { Capacitor?: { Plugins?: { App?: AppPlugin } } };
  return cap.Capacitor?.Plugins?.App ?? null;
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
 * Capacitor App.backButton menangkap hardware back sebelum WebView default exit.
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
      const app = getAppPlugin();
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
      // Fallback browser/PWA
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
      // Ada history SPA yang bisa di-back
      if (typeof window !== "undefined" && window.history.length > 1) {
        router.back();
        return;
      }
      router.push(parentFallbackPath(pathnameRef.current));
    }

    // —— Capacitor hardware back (utama untuk APK) ——
    let removeCapListener: (() => void) | undefined;
    const app = getAppPlugin();
    if (isNativeCapacitor() && app?.addListener) {
      void app
        .addListener("backButton", ({ canGoBack }) => {
          const path = pathnameRef.current;
          const isRoot = MOBILE_ROOT_PATHS.has(path);
          if (isRoot) {
            handleRootBack();
            return;
          }
          // Prefer WebView/history back bila stack ada
          if (canGoBack || window.history.length > 1) {
            window.history.back();
            return;
          }
          handleNonRootBack();
        })
        .then((handle) => {
          removeCapListener = () => {
            void Promise.resolve(handle.remove()).catch(() => undefined);
          };
        })
        .catch(() => undefined);
    }

    // —— Guard popstate di root (browser / tanpa App plugin) ——
    const isRoot = MOBILE_ROOT_PATHS.has(pathname);
    let onPopState: (() => void) | undefined;
    if (isRoot) {
      onPopState = () => {
        handleRootBack();
        window.history.pushState({ mobileBackGuard: true }, "");
      };
      window.history.pushState({ mobileBackGuard: true }, "");
      window.addEventListener("popstate", onPopState);
    }

    return () => {
      removeCapListener?.();
      if (onPopState) {
        window.removeEventListener("popstate", onPopState);
      }
      toastRef.current?.remove();
    };
  }, [mobile, pathname, router]);

  return null;
}
