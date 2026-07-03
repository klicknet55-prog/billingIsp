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
  if (rawUrl.startsWith("intent:")) return;
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return;
    if (!parsed.pathname.startsWith("/p/")) return;
    const path = window.location.pathname;
    if (path.startsWith("/p/")) return;
    if (path.startsWith("/portal/") && !path.startsWith("/portal/login") && !path.startsWith("/portal/mobile-bootstrap")) {
      return;
    }
    if (!parsed.searchParams.has("nm_app")) parsed.searchParams.set("nm_app", "portal");
    const target = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    if (`${window.location.pathname}${window.location.search}` === target) return;
    window.location.replace(target);
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
