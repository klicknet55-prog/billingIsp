"use client";

import { useEffect } from "react";
import { getNetManageApp, persistNetManageAppFromUrl } from "@/lib/mobile/use-mobile-shell";

type StatusBarPlugin = {
  setOverlaysWebView?: (opts: { overlay: boolean }) => Promise<void>;
  setBackgroundColor?: (opts: { color: string }) => Promise<void>;
  setStyle?: (opts: { style: "DARK" | "LIGHT" | "DEFAULT" }) => Promise<void>;
};

function readCssSafeInset(axis: "top" | "bottom"): number {
  const prop = axis === "top" ? "safe-area-inset-top" : "safe-area-inset-bottom";
  const raw = getComputedStyle(document.documentElement).getPropertyValue(`env(${prop})`).trim();
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : 0;
}

/** Hitung inset dinamis dari visualViewport (berubah saat system bar muncul/hilang). */
function updateSafeAreaInsets() {
  const root = document.documentElement;
  let top = readCssSafeInset("top");
  let bottom = readCssSafeInset("bottom");

  const vv = window.visualViewport;
  if (vv) {
    top = Math.max(top, Math.round(vv.offsetTop));
    const gap = window.innerHeight - vv.height - vv.offsetTop;
    bottom = Math.max(bottom, Math.round(gap));
  }

  root.style.setProperty("--nm-safe-top", `${top}px`);
  root.style.setProperty("--nm-safe-bottom", `${bottom}px`);
}

async function initNativeStatusBar() {
  const cap = (window as Window & { Capacitor?: { Plugins?: { StatusBar?: StatusBarPlugin } } })
    .Capacitor;
  const statusBar = cap?.Plugins?.StatusBar;
  if (!statusBar) return;

  try {
    await statusBar.setOverlaysWebView?.({ overlay: true });
    await statusBar.setBackgroundColor?.({ color: "#00000000" });
    await statusBar.setStyle?.({ style: "DARK" });
  } catch {
    /* plugin opsional */
  }
}

/**
 * Inisialisasi safe-area dinamis untuk shell Capacitor Android.
 * System bar tersembunyi (immersive); padding menyesuaikan saat bar muncul sementara.
 */
export function CapacitorSystemChrome() {
  useEffect(() => {
    persistNetManageAppFromUrl();
    if (!getNetManageApp()) return;

    const root = document.documentElement;
    root.classList.add("nm-capacitor-shell");

    void initNativeStatusBar();
    updateSafeAreaInsets();

    const onChange = () => updateSafeAreaInsets();
    window.visualViewport?.addEventListener("resize", onChange);
    window.visualViewport?.addEventListener("scroll", onChange);
    window.addEventListener("resize", onChange);
    window.addEventListener("orientationchange", onChange);
    document.addEventListener("visibilitychange", onChange);

    return () => {
      root.classList.remove("nm-capacitor-shell");
      root.style.removeProperty("--nm-safe-top");
      root.style.removeProperty("--nm-safe-bottom");
      window.visualViewport?.removeEventListener("resize", onChange);
      window.visualViewport?.removeEventListener("scroll", onChange);
      window.removeEventListener("resize", onChange);
      window.removeEventListener("orientationchange", onChange);
      document.removeEventListener("visibilitychange", onChange);
    };
  }, []);

  return null;
}
