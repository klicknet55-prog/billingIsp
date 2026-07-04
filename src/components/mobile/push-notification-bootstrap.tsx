"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { registerDevicePushTokenAction } from "@/features/notifications/actions";
import { isMobilePushEnabled, isNativeCapacitor } from "@/lib/mobile/capacitor-runtime";
import { resolvePushNavigationPath } from "@/lib/mobile/push-navigation";
import { getNetManageApp, persistNetManageAppFromUrl } from "@/lib/mobile/use-mobile-shell";

type PushPermission = { receive: "granted" | "denied" | "prompt" };
type PushRegistration = { value: string };
type PushNotificationPayload = {
  data?: Record<string, unknown>;
};
type PushActionPerformed = {
  notification: PushNotificationPayload;
};
type PushNotificationPlugin = {
  checkPermissions?: () => Promise<PushPermission>;
  requestPermissions?: () => Promise<PushPermission>;
  register?: () => Promise<void>;
  addListener?: (
    eventName: "registration" | "registrationError" | "pushNotificationActionPerformed",
    callback: (payload: PushRegistration | PushActionPerformed | unknown) => void
  ) => Promise<{ remove: () => Promise<void> }>;
};

const LOGIN_PATHS = new Set(["/login", "/portal/login", "/portal/masuk"]);

function navigateFromPushData(
  data: Record<string, unknown> | null | undefined,
  navigate: (path: string) => void
) {
  const path = resolvePushNavigationPath(data);
  if (!path) return;
  navigate(path);
}

function getPushPlugin(): PushNotificationPlugin | null {
  const cap = window as Window & { Capacitor?: { Plugins?: { PushNotifications?: PushNotificationPlugin } } };
  return cap.Capacitor?.Plugins?.PushNotifications ?? null;
}

async function saveTokenToServer(token: string, app: "admin" | "portal") {
  const result = await registerDevicePushTokenAction({
    token,
    app,
    platform: "android",
  });
  if (!result.ok) {
    console.warn("[push] token registration failed", result.error);
  }
}

async function requestAndRegister(push: PushNotificationPlugin): Promise<void> {
  const currentPerm = await push.checkPermissions?.();
  const permission =
    currentPerm?.receive === "granted" ? currentPerm : await push.requestPermissions?.();
  if (permission?.receive === "granted") {
    await push.register?.();
  }
}

export function PushNotificationBootstrap() {
  const router = useRouter();
  const pathname = usePathname();
  const listenersReady = useRef(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!isNativeCapacitor() || !isMobilePushEnabled()) return;

    persistNetManageAppFromUrl();
    const app = getNetManageApp();
    if (!app) return;

    const push = getPushPlugin();
    if (!push) return;

    let cancelled = false;

    const setup = async () => {
      if (listenersReady.current) {
        if (!LOGIN_PATHS.has(pathname)) {
          await requestAndRegister(push);
        }
        return;
      }

      const listeners: Array<{ remove: () => Promise<void> }> = [];

      try {
        const registrationHandle = await push.addListener?.("registration", async (payload) => {
          const token = (payload as PushRegistration | null)?.value?.trim();
          if (!token) return;
          await saveTokenToServer(token, app);
        });
        if (registrationHandle) listeners.push(registrationHandle);

        const errorHandle = await push.addListener?.("registrationError", (err) => {
          console.warn("[push] registrationError", err);
        });
        if (errorHandle) listeners.push(errorHandle);

        const actionHandle = await push.addListener?.("pushNotificationActionPerformed", (payload) => {
          const action = payload as PushActionPerformed;
          navigateFromPushData(action.notification?.data, (path) => router.push(path));
        });
        if (actionHandle) listeners.push(actionHandle);

        listenersReady.current = true;
        cleanupRef.current = () => {
          for (const handle of listeners) {
            void handle.remove();
          }
          listenersReady.current = false;
        };

        if (!cancelled && !LOGIN_PATHS.has(pathname)) {
          await requestAndRegister(push);
        }
      } catch (err) {
        console.warn("[push] init skipped", err);
      }
    };

    const timer = window.setTimeout(() => {
      void setup();
    }, pathname === "/login" || pathname === "/portal/login" ? 500 : 1500);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [pathname, router]);

  useEffect(() => {
    return () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  }, []);

  return null;
}
