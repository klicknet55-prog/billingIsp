"use client";

import { useEffect } from "react";
import { getNetManageApp, persistNetManageAppFromUrl } from "@/lib/mobile/use-mobile-shell";

type AppPlugin = {
  getLaunchUrl?: () => Promise<{ url?: string } | undefined>;
  addListener?: (
    eventName: "appUrlOpen",
    callback: (payload: { url: string }) => void
  ) => Promise<{ remove: () => Promise<void> }>;
};

function navigateToPortalDeepLink(rawUrl: string) {
  try {
    const parsed = new URL(rawUrl);
    const path = `${parsed.pathname}${parsed.search}`;
    if (!path.startsWith("/p/") && !path.startsWith("/portal")) return;
    if (window.location.pathname + window.location.search === path) return;
    window.location.replace(path);
  } catch {
    /* ignore malformed url */
  }
}

/** Navigasi ke URL deep-link saat MyWiFi dibuka dari link bayar (cold start / intent). */
export function PortalDeepLinkBootstrap() {
  useEffect(() => {
    persistNetManageAppFromUrl();
    if (getNetManageApp() !== "portal") return;

    const cap = window as Window & { Capacitor?: { Plugins?: { App?: AppPlugin } } };
    const app = cap.Capacitor?.Plugins?.App;
    if (!app) return;

    let removeOpen: (() => Promise<void>) | undefined;

    void app.getLaunchUrl?.().then((launch) => {
      if (launch?.url) navigateToPortalDeepLink(launch.url);
    });

    void app.addListener?.("appUrlOpen", (payload) => {
      if (payload?.url) navigateToPortalDeepLink(payload.url);
    }).then((handle) => {
      removeOpen = () => handle.remove();
    });

    return () => {
      void removeOpen?.();
    };
  }, []);

  return null;
}
