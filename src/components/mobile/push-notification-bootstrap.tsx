"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
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

function navigateFromPushData(
  data: Record<string, unknown> | null | undefined,
  navigate: (path: string) => void
) {
  const path = resolvePushNavigationPath(data);
  if (!path) return;
  navigate(path);
}

async function initPushRegistration(navigate: (path: string) => void) {
  if (!isNativeCapacitor() || !isMobilePushEnabled()) return () => {};

  persistNetManageAppFromUrl();
  const app = getNetManageApp();
  if (!app) return () => {};

  const cap = window as Window & { Capacitor?: { Plugins?: { PushNotifications?: PushNotificationPlugin } } };
  const push = cap.Capacitor?.Plugins?.PushNotifications;
  if (!push) return () => {};

  const listeners: Array<{ remove: () => Promise<void> }> = [];

  try {
    const registrationHandle = await push.addListener?.("registration", async (payload) => {
      try {
        const token = (payload as PushRegistration | null)?.value?.trim();
        if (!token) return;
        await registerDevicePushTokenAction({
          token,
          app,
          platform: "android",
        });
      } catch (err) {
        console.warn("[push] token registration failed", err);
      }
    });
    if (registrationHandle) listeners.push(registrationHandle);

    const errorHandle = await push.addListener?.("registrationError", (err) => {
      console.warn("[push] registrationError", err);
    });
    if (errorHandle) listeners.push(errorHandle);

    const actionHandle = await push.addListener?.("pushNotificationActionPerformed", (payload) => {
      const action = payload as PushActionPerformed;
      navigateFromPushData(action.notification?.data, navigate);
    });
    if (actionHandle) listeners.push(actionHandle);

    const currentPerm = await push.checkPermissions?.();
    const permission =
      currentPerm?.receive === "granted" ? currentPerm : await push.requestPermissions?.();
    if (permission?.receive === "granted") {
      await push.register?.();
    }
  } catch (err) {
    console.warn("[push] init skipped", err);
  }

  return () => {
    for (const handle of listeners) {
      void handle.remove();
    }
  };
}

export function PushNotificationBootstrap() {
  const router = useRouter();

  useEffect(() => {
    if (!isNativeCapacitor() || !isMobilePushEnabled()) return;

    let clean = () => {};
    const timer = window.setTimeout(() => {
      void initPushRegistration((path) => {
        router.push(path);
      }).then((fn) => {
        clean = fn;
      });
    }, 1500);

    return () => {
      window.clearTimeout(timer);
      clean();
    };
  }, [router]);

  return null;
}
